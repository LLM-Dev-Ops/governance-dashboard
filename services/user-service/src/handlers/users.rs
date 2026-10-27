use actix_web::{delete, get, post, put, web, HttpRequest, HttpResponse, Responder};
use llm_governance_common::{ApiResponse, AppError, Result};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use validator::Validate;

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
    #[validate(length(min = 2, max = 100))]
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
    let (limit, offset) = normalize_pagination(&query);

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

    Ok(
        HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
            "users": users,
            "total": total.0,
            "limit": limit,
            "offset": offset
        }))),
    )
}

#[get("/users/{id}")]
pub async fn get_user(pool: web::Data<PgPool>, user_id: web::Path<Uuid>) -> Result<impl Responder> {
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

    // Aggrega  .bind(user_id.as_ref())
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
        serde_json::json!({"message": "User deleted successfully"}),
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
        serde_json::json!({"message": "Role assigned successfully"}),
    )))
}

#[delete("/users/{id}/roles/{role_id}")]
pub async fn revoke_role(
    pool: web::Data<PgPool>,
    path: web::Path<(Uuid, Uuid)>,
    http_req: HttpRequest,
) -> Result<impl Responder> {
    let (user_id, role_id) = path.into_inner();
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
