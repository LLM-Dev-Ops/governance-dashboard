use actix_web::{delete, get, post, put, web, HttpResponse, Responder, HttpRequest};
use serde::{Deserialize, Serialize};
use validator::Validate;
use sqlx::PgPool;
use uuid::Uuid;
use llm_governance_common::{AppError, Result, ApiResponse};
use chrono::{DateTime, Utc};

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Deserialize, Validate)]
pub struct CreateOrganizationRequest {
    #[validate(length(min = 1, max = 255))]
    pub name: String,
    #[validate(length(min = 1, max = 100), regex = "^[a-z0-9-]+$")]
    pub slug: String,
    pub description: Option<String>,
    pub settings: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateOrganizationRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub settings: Option<serde_json::Value>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct OrganizationResponse {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub settings: serde_json::Value,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct AddMemberRequest {
    pub user_id: Uuid,
    pub role: String, // 'owner', 'admin', 'member', 'viewer'
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct OrganizationMemberResponse {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub user_id: Uuid,
    pub role: String,
    pub joined_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateTeamRequest {
    #[validate(length(min = 1, max = 255))]
    pub name: String,
    pub description: Option<String>,
    pub settings: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct TeamResponse {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub settings: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ============================================================================
// Organization Handlers
// ============================================================================

#[get("/organizations")]
pub async fn list_organizations(
    pool: web::Data<PgPool>,
    req: HttpRequest,
) -> Result<impl Responder> {
    let user_id = extract_user_id(&req)?;

    let organizations = sqlx::query_as::<_, OrganizationResponse>(
        r#"
        SELECT o.id, o.name, o.slug, o.description, o.settings, o.is_active, o.created_at, o.updated_at
        FROM organizations o
        INNER JOIN organization_members om ON o.id = om.organization_id
        WHERE om.user_id = $1 AND o.is_active = true
        ORDER BY o.created_at DESC
        "#,
    )
    .bind(user_id)
    .fetch_all(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(organizations)))
}

#[get("/organizations/{id}")]
pub async fn get_organization(
    pool: web::Data<PgPool>,
    organization_id: web::Path<Uuid>,
    req: HttpRequest,
) -> Result<impl Responder> {
    let user_id = extract_user_id(&req)?;

    // Verify user is member of organization
    verify_organization_member(pool.get_ref(), *organization_id, user_id).await?;

    let organization = sqlx::query_as::<_, OrganizationResponse>(
        r#"
        SELECT id, name, slug, description, settings, is_active, created_at, updated_at
        FROM organizations
        WHERE id = $1
        "#,
    )
    .bind(*organization_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or_else(|| AppError::NotFound("Organization not found".to_string()))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(organization)))
}

#[post("/organizations")]
pub async fn create_organization(
    pool: web::Data<PgPool>,
    req_body: web::Json<CreateOrganizationRequest>,
    req: HttpRequest,
) -> Result<impl Responder> {
    req_body.validate()
        .map_err(|e| AppError::Validation(format!("{}", e)))?;

    let user_id = extract_user_id(&req)?;

    // Start transaction
    let mut tx = pool.begin().await?;

    // Create organization
    let organization = sqlx::query_as::<_, OrganizationResponse>(
        r#"
        INSERT INTO organizations (name, slug, description, settings, is_active)
        VALUES ($1, $2, $3, $4, true)
        RETURNING id, name, slug, description, settings, is_active, created_at, updated_at
        "#,
    )
    .bind(&req_body.name)
    .bind(&req_body.slug)
    .bind(&req_body.description)
    .bind(req_body.settings.clone().unwrap_or(serde_json::json!({})))
    .fetch_one(&mut *tx)
    .await?;

    // Add creator as owner
    sqlx::query(
        r#"
        INSERT INTO organization_members (organization_id, user_id, role)
        VALUES ($1, $2, 'owner')
        "#,
    )
    .bind(organization.id)
    .bind(user_id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(HttpResponse::Created().json(ApiResponse::success(organization)))
}

#[put("/organizations/{id}")]
pub async fn update_organization(
    pool: web::Data<PgPool>,
    organization_id: web::Path<Uuid>,
    req_body: web::Json<UpdateOrganizationRequest>,
    req: HttpRequest,
) -> Result<impl Responder> {
    let user_id = extract_user_id(&req)?;

    // Verify user has admin role
    verify_organization_role(pool.get_ref(), *organization_id, user_id, &["owner", "admin"]).await?;

    // Build dynamic update query
    let mut updates = vec![];
    let mut query_params: Vec<String> = vec![];
    let mut param_index = 1;

    if let Some(ref name) = req_body.name {
        updates.push(format!("name = ${}", param_index));
        query_params.push(name.clone());
        param_index += 1;
    }

    if let Some(ref description) = req_body.description {
        updates.push(format!("description = ${}", param_index));
        query_params.push(description.clone());
        param_index += 1;
    }

    if let Some(ref settings) = req_body.settings {
        updates.push(format!("settings = ${}::jsonb", param_index));
        query_params.push(serde_json::to_string(settings).unwrap());
        param_index += 1;
    }

    if let Some(is_active) = req_body.is_active {
        updates.push(format!("is_active = ${}", param_index));
        query_params.push(is_active.to_string());
        param_index += 1;
    }

    if updates.is_empty() {
        return Err(AppError::Validation("No fields to update".to_string()));
    }

    updates.push("updated_at = NOW()".to_string());

    let query = format!(
        "UPDATE organizations SET {} WHERE id = ${} RETURNING id, name, slug, description, settings, is_active, created_at, updated_at",
        updates.join(", "),
        param_index
    );

    let mut query_builder = sqlx::query_as::<_, OrganizationResponse>(&query);
    for param in query_params {
        query_builder = query_builder.bind(param);
    }
    query_builder = query_builder.bind(*organization_id);

    let organization = query_builder
        .fetch_one(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(organization)))
}

#[delete("/organizations/{id}")]
pub async fn delete_organization(
    pool: web::Data<PgPool>,
    organization_id: web::Path<Uuid>,
    req: HttpRequest,
) -> Result<impl Responder> {
    let user_id = extract_user_id(&req)?;

    // Only owners can delete organizations
    verify_organization_role(pool.get_ref(), *organization_id, user_id, &["owner"]).await?;

    let result = sqlx::query("DELETE FROM organizations WHERE id = $1")
        .bind(*organization_id)
        .execute(pool.get_ref())
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Organization not found".to_string()));
    }

    Ok(HttpResponse::Ok().json(ApiResponse::success(
        serde_json::json!({"message": "Organization deleted successfully"})
    )))
}

// ============================================================================
// Organization Member Handlers
// ============================================================================

#[get("/organizations/{id}/members")]
pub async fn list_organization_members(
    pool: web::Data<PgPool>,
    organization_id: web::Path<Uuid>,
    req: HttpRequest,
) -> Result<impl Responder> {
    let user_id = extract_user_id(&req)?;
    verify_organization_member(pool.get_ref(), *organization_id, user_id).await?;

    let members = sqlx::query_as::<_, OrganizationMemberResponse>(
        r#"
        SELECT id, organization_id, user_id, role, joined_at
        FROM organization_members
        WHERE organization_id = $1
        ORDER BY joined_at ASC
        "#,
    )
    .bind(*organization_id)
    .fetch_all(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(members)))
}

#[post("/organizations/{id}/members")]
pub async fn add_organization_member(
    pool: web::Data<PgPool>,
    organization_id: web::Path<Uuid>,
    req_body: web::Json<AddMemberRequest>,
    req: HttpRequest,
) -> Result<impl Responder> {
    let user_id = extract_user_id(&req)?;
    verify_organization_role(pool.get_ref(), *organization_id, user_id, &["owner", "admin"]).await?;

    let member = sqlx::query_as::<_, OrganizationMemberResponse>(
        r#"
        INSERT INTO organization_members (organization_id, user_id, role)
        VALUES ($1, $2, $3)
        RETURNING id, organization_id, user_id, role, joined_at
        "#,
    )
    .bind(*organization_id)
    .bind(req_body.user_id)
    .bind(&req_body.role)
    .fetch_one(pool.get_ref())
    .await?;

    Ok(HttpResponse::Created().json(ApiResponse::success(member)))
}

#[delete("/organizations/{org_id}/members/{member_id}")]
pub async fn remove_organization_member(
    pool: web::Data<PgPool>,
    path: web::Path<(Uuid, Uuid)>,
    req: HttpRequest,
) -> Result<impl Responder> {
    let (organization_id, member_id) = path.into_inner();
    let user_id = extract_user_id(&req)?;

    verify_organization_role(pool.get_ref(), organization_id, user_id, &["owner", "admin"]).await?;

    let result = sqlx::query("DELETE FROM organization_members WHERE id = $1 AND organization_id = $2")
        .bind(member_id)
        .bind(organization_id)
        .execute(pool.get_ref())
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Member not found".to_string()));
    }

    Ok(HttpResponse::Ok().json(ApiResponse::success(
        serde_json::json!({"message": "Member removed successfully"})
    )))
}

// ============================================================================
// Team Handlers
// ============================================================================

#[get("/organizations/{id}/teams")]
pub async fn list_teams(
    pool: web::Data<PgPool>,
    organization_id: web::Path<Uuid>,
    req: HttpRequest,
) -> Result<impl Responder> {
    let user_id = extract_user_id(&req)?;
    verify_organization_member(pool.get_ref(), *organization_id, user_id).await?;

    let teams = sqlx::query_as::<_, TeamResponse>(
        r#"
        SELECT id, organization_id, name, description, settings, created_at, updated_at
        FROM teams
        WHERE organization_id = $1
        ORDER BY created_at DESC
        "#,
    )
    .bind(*organization_id)
    .fetch_all(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(teams)))
}

#[post("/organizations/{id}/teams")]
pub async fn create_team(
    pool: web::Data<PgPool>,
    organization_id: web::Path<Uuid>,
    req_body: web::Json<CreateTeamRequest>,
    req: HttpRequest,
) -> Result<impl Responder> {
    req_body.validate()
        .map_err(|e| AppError::Validation(format!("{}", e)))?;

    let user_id = extract_user_id(&req)?;
    verify_organization_role(pool.get_ref(), *organization_id, user_id, &["owner", "admin"]).await?;

    let team = sqlx::query_as::<_, TeamResponse>(
        r#"
        INSERT INTO teams (organization_id, name, description, settings)
        VALUES ($1, $2, $3, $4)
        RETURNING id, organization_id, name, description, settings, created_at, updated_at
        "#,
    )
    .bind(*organization_id)
    .bind(&req_body.name)
    .bind(&req_body.description)
    .bind(req_body.settings.clone().unwrap_or(serde_json::json!({})))
    .fetch_one(pool.get_ref())
    .await?;

    Ok(HttpResponse::Created().json(ApiResponse::success(team)))
}

#[delete("/teams/{id}")]
pub async fn delete_team(
    pool: web::Data<PgPool>,
    team_id: web::Path<Uuid>,
    req: HttpRequest,
) -> Result<impl Responder> {
    let user_id = extract_user_id(&req)?;

    // Get team's organization
    let team: (Uuid,) = sqlx::query_as("SELECT organization_id FROM teams WHERE id = $1")
        .bind(*team_id)
        .fetch_optional(pool.get_ref())
        .await?
        .ok_or_else(|| AppError::NotFound("Team not found".to_string()))?;

    verify_organization_role(pool.get_ref(), team.0, user_id, &["owner", "admin"]).await?;

    sqlx::query("DELETE FROM teams WHERE id = $1")
        .bind(*team_id)
        .execute(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(
        serde_json::json!({"message": "Team deleted successfully"})
    )))
}

// ============================================================================
// Helper Functions
// ============================================================================

fn extract_user_id(req: &HttpRequest) -> Result<Uuid> {
    req.headers()
        .get("X-User-Id")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
        .ok_or_else(|| AppError::Unauthorized)
}

async fn verify_organization_member(
    pool: &PgPool,
    organization_id: Uuid,
    user_id: Uuid,
) -> Result<()> {
    let exists: (bool,) = sqlx::query_as(
        "SELECT EXISTS(SELECT 1 FROM organization_members WHERE organization_id = $1 AND user_id = $2)"
    )
    .bind(organization_id)
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    if !exists.0 {
        return Err(AppError::Forbidden);
    }

    Ok(())
}

async fn verify_organization_role(
    pool: &PgPool,
    organization_id: Uuid,
    user_id: Uuid,
    allowed_roles: &[&str],
) -> Result<()> {
    let role: Option<(String,)> = sqlx::query_as(
        "SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2"
    )
    .bind(organization_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await?;

    match role {
        Some((user_role,)) if allowed_roles.contains(&user_role.as_str()) => Ok(()),
        Some(_) => Err(AppError::Forbidden),
        None => Err(AppError::Forbidden),
    }
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(list_organizations)
        .service(get_organization)
        .service(create_organization)
        .service(update_organization)
        .service(delete_organization)
        .service(list_organization_members)
        .service(add_organization_member)
        .service(remove_organization_member)
        .service(list_teams)
        .service(create_team)
        .service(delete_team);
}
