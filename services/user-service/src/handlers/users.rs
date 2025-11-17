use actix_web::{delete, get, post, put, web, HttpResponse, Responder, HttpRequest};
use serde::{Deserialize, Serialize};
use validator::Validate;
use sqlx::PgPool;
use uuid::Uuid;
use common::{AppError, Result, ApiResponse};

#[derive(Debug, Deserialize, Validate)]
pub struct CreateUserRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 2, max = 100))]
    pub name: String,
    pub role_ids: Vec<Uuid>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateUserRequest {
    pub name: Option<String>,
    pub status: Option<String>,
    pub role_ids: Option<Vec<Uuid>>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct UserResponse {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub status: String,
    pub mfa_enabled: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
pub struct UserWithRoles {
    #[serde(flatten)]
    pub user: UserResponse,
    pub roles: Vec<RoleInfo>,
    pub permissions: serde_json::Value,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct RoleInfo {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
}

#[get("/users")]
pub async fn list_users(
    pool: web::Data<PgPool>,
    query: web::Query<PaginationQuery>,
) -> Result<impl Responder> {
    let limit = query.limit.unwrap_or(20).min(100);
    let offset = query.offset.unwrap_or(0);

    let users = sqlx::query_as::<_, UserResponse>(
        r#"
        SELECT id, email, name, status, mfa_enabled, created_at, updated_at
        FROM users
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(limit as i64)
    .bind(offset as i64)
    .fetch_all(pool.get_ref())
    .await?;

    let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users")
        .fetch_one(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
        "users": users,
        "total": total.0,
        "limit": limit,
        "offset": offset
    }))))
}

#[get("/users/{id}")]
pub async fn get_user(
    pool: web::Data<PgPool>,
    user_id: web::Path<Uuid>,
) -> Result<impl Responder> {
    let user = sqlx::query_as::<_, UserResponse>(
        r#"
        SELECT id, email, name, status, mfa_enabled, created_at, updated_at
        FROM users
        WHERE id = $1
        "#,
    )
    .bind(user_id.as_ref())
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    // Get user roles
    let roles = sqlx::query_as::<_, RoleInfo>(
        r#"
        SELECT r.id, r.name, r.description
        FROM roles r
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = $1
        "#,
    )
    .bind(user_id.as_ref())
    .fetch_all(pool.get_ref())
    .await?;

    // Aggregate permissions from all roles
    let permissions = aggregate_permissions(pool.get_ref(), user_id.as_ref()).await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(UserWithRoles {
        user,
        roles,
        permissions,
    })))
}

#[post("/users")]
pub async fn create_user(
    pool: web::Data<PgPool>,
    req: web::Json<CreateUserRequest>,
    http_req: HttpRequest,
) -> Result<impl Responder> {
    req.validate()
        .map_err(|e| AppError::Validation(format!("{}", e)))?;

    // Extract current user ID from auth middleware
    let current_user_id = extract_user_id(&http_req)?;

    // Check if user has permission to create users
    check_permission(pool.get_ref(), current_user_id, "users:create").await?;

    // Create user with default password (should be changed on first login)
    let default_password = Uuid::new_v4().to_string();
    let password_hash = hash_password(&default_password)?;

    let user = sqlx::query_as::<_, UserResponse>(
        r#"
        INSERT INTO users (email, name, password_hash, status)
        VALUES ($1, $2, $3, 'active')
        RETURNING id, email, name, status, mfa_enabled, created_at, updated_at
        "#,
    )
    .bind(&req.email)
    .bind(&req.name)
    .bind(&password_hash)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| match e {
        sqlx::Error::Database(db_err) if db_err.constraint() == Some("users_email_key") => {
            AppError::BadRequest("Email already exists".to_string())
        }
        _ => AppError::Database(e),
    })?;

    // Assign roles
    for role_id in &req.role_ids {
        sqlx::query(
            r#"
            INSERT INTO user_roles (user_id, role_id, granted_by)
            VALUES ($1, $2, $3)
            "#,
        )
        .bind(user.id)
        .bind(role_id)
        .bind(current_user_id)
        .execute(pool.get_ref())
        .await?;
    }

    Ok(HttpResponse::Created().json(ApiResponse::success(user)))
}

#[put("/users/{id}")]
pub async fn update_user(
    pool: web::Data<PgPool>,
    user_id: web::Path<Uuid>,
    req: web::Json<UpdateUserRequest>,
    http_req: HttpRequest,
) -> Result<impl Responder> {
    req.validate()
        .map_err(|e| AppError::Validation(format!("{}", e)))?;

    let current_user_id = extract_user_id(&http_req)?;
    check_permission(pool.get_ref(), current_user_id, "users:update").await?;

    // Update user fields
    if let Some(name) = &req.name {
        sqlx::query("UPDATE users SET name = $1 WHERE id = $2")
            .bind(name)
            .bind(user_id.as_ref())
            .execute(pool.get_ref())
            .await?;
    }

    if let Some(status) = &req.status {
        sqlx::query("UPDATE users SET status = $1 WHERE id = $2")
            .bind(status)
            .bind(user_id.as_ref())
            .execute(pool.get_ref())
            .await?;
    }

    // Update roles if provided
    if let Some(role_ids) = &req.role_ids {
        // Remove existing roles
        sqlx::query("DELETE FROM user_roles WHERE user_id = $1")
            .bind(user_id.as_ref())
            .execute(pool.get_ref())
            .await?;

        // Add new roles
        for role_id in role_ids {
            sqlx::query(
                r#"
                INSERT INTO user_roles (user_id, role_id, granted_by)
                VALUES ($1, $2, $3)
                "#,
            )
            .bind(user_id.as_ref())
            .bind(role_id)
            .bind(current_user_id)
            .execute(pool.get_ref())
            .await?;
        }
    }

    let user = sqlx::query_as::<_, UserResponse>(
        r#"
        SELECT id, email, name, status, mfa_enabled, created_at, updated_at
        FROM users
        WHERE id = $1
        "#,
    )
    .bind(user_id.as_ref())
    .fetch_one(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(user)))
}

#[delete("/users/{id}")]
pub async fn delete_user(
    pool: web::Data<PgPool>,
    user_id: web::Path<Uuid>,
    http_req: HttpRequest,
) -> Result<impl Responder> {
    let current_user_id = extract_user_id(&http_req)?;
    check_permission(pool.get_ref(), current_user_id, "users:delete").await?;

    // Soft delete (set status to inactive)
    let result = sqlx::query("UPDATE users SET status = 'inactive' WHERE id = $1")
        .bind(user_id.as_ref())
        .execute(pool.get_ref())
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("User not found".to_string()));
    }

    Ok(HttpResponse::Ok().json(ApiResponse::success(
        serde_json::json!({"message": "User deleted successfully"})
    )))
}

#[get("/users/{id}/permissions")]
pub async fn get_user_permissions(
    pool: web::Data<PgPool>,
    user_id: web::Path<Uuid>,
) -> Result<impl Responder> {
    let permissions = aggregate_permissions(pool.get_ref(), user_id.as_ref()).await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(permissions)))
}

#[post("/users/{id}/roles/{role_id}")]
pub async fn assign_role(
    pool: web::Data<PgPool>,
    path: web::Path<(Uuid, Uuid)>,
    http_req: HttpRequest,
) -> Result<impl Responder> {
    let (user_id, role_id) = path.into_inner();
    let current_user_id = extract_user_id(&http_req)?;

    check_permission(pool.get_ref(), current_user_id, "users:assign_roles").await?;

    sqlx::query(
        r#"
        INSERT INTO user_roles (user_id, role_id, granted_by)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, role_id) DO NOTHING
        "#,
    )
    .bind(user_id)
    .bind(role_id)
    .bind(current_user_id)
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(
        serde_json::json!({"message": "Role assigned successfully"})
    )))
}

#[delete("/users/{id}/roles/{role_id}")]
pub async fn revoke_role(
    pool: web::Data<PgPool>,
    path: web::Path<(Uuid, Uuid)>,
    http_req: HttpRequest,
) -> Result<impl Responder> {
    let (user_id, role_id) = path.into_inner();
    let current_user_id = extract_user_id(&http_req)?;

    check_permission(pool.get_ref(), current_user_id, "users:assign_roles").await?;

    sqlx::query("DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2")
        .bind(user_id)
        .bind(role_id)
        .execute(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(
        serde_json::json!({"message": "Role revoked successfully"})
    )))
}

// Helper functions

#[derive(Debug, Deserialize)]
pub struct PaginationQuery {
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

async fn aggregate_permissions(pool: &PgPool, user_id: &Uuid) -> Result<serde_json::Value> {
    // Get all roles for user (including inherited roles)
    let role_permissions: Vec<(serde_json::Value,)> = sqlx::query_as(
        r#"
        WITH RECURSIVE role_hierarchy AS (
            SELECT r.id, r.permissions, r.parent_role_id
            FROM roles r
            JOIN user_roles ur ON r.id = ur.role_id
            WHERE ur.user_id = $1

            UNION

            SELECT r.id, r.permissions, r.parent_role_id
            FROM roles r
            JOIN role_hierarchy rh ON r.id = rh.parent_role_id
        )
        SELECT permissions FROM role_hierarchy
        "#,
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    // Merge all permissions
    let mut merged_permissions = serde_json::Map::new();

    for (perms,) in role_permissions {
        if let serde_json::Value::Object(map) = perms {
            for (key, value) in map {
                merged_permissions.insert(key, value);
            }
        }
    }

    Ok(serde_json::Value::Object(merged_permissions))
}

async fn check_permission(pool: &PgPool, user_id: Uuid, permission: &str) -> Result<()> {
    let permissions = aggregate_permissions(pool, &user_id).await?;

    let parts: Vec<&str> = permission.split(':').collect();
    if parts.len() != 2 {
        return Err(AppError::Internal("Invalid permission format".to_string()));
    }

    let resource = parts[0];
    let action = parts[1];

    if let Some(resource_perms) = permissions.get(resource) {
        if let Some(actions) = resource_perms.as_array() {
            if actions.iter().any(|a| a.as_str() == Some(action) || a.as_str() == Some("*")) {
                return Ok(());
            }
        }
    }

    Err(AppError::Forbidden)
}

fn extract_user_id(req: &HttpRequest) -> Result<Uuid> {
    req.headers()
        .get("X-User-Id")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
        .ok_or_else(|| AppError::Unauthorized)
}

fn hash_password(password: &str) -> Result<String> {
    use argon2::{
        password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
        Argon2,
    };

    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| AppError::Internal(format!("Failed to hash password: {}", e)))?
        .to_string();

    Ok(hash)
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(list_users)
        .service(get_user)
        .service(create_user)
        .service(update_user)
        .service(delete_user)
        .service(get_user_permissions)
        .service(assign_role)
        .service(revoke_role);
}
