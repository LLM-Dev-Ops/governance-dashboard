use actix_web::{delete, get, post, put, web, HttpResponse, Responder, HttpRequest};
use serde::{Deserialize, Serialize};
use validator::Validate;
use sqlx::PgPool;
use uuid::Uuid;
use common::{AppError, Result, ApiResponse};
use chrono::{DateTime, Utc};

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Deserialize, Validate)]
pub struct CreateProviderRequest {
    pub provider_name: String, // 'openai', 'anthropic', 'azure_openai', etc.
    #[validate(length(min = 1, max = 255))]
    pub display_name: String,
    pub api_key: Option<String>,
    pub endpoint_url: Option<String>,
    pub configuration: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProviderRequest {
    pub display_name: Option<String>,
    pub api_key: Option<String>,
    pub endpoint_url: Option<String>,
    pub configuration: Option<serde_json::Value>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct ProviderResponse {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub provider_name: String,
    pub display_name: String,
    pub endpoint_url: Option<String>,
    pub configuration: serde_json::Value,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    // Note: api_key_encrypted is not returned for security
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateModelRequest {
    #[validate(length(min = 1, max = 255))]
    pub model_name: String,
    #[validate(length(min = 1, max = 255))]
    pub display_name: String,
    pub cost_per_1k_prompt_tokens: f64,
    pub cost_per_1k_completion_tokens: f64,
    pub max_tokens: Option<i32>,
    pub context_window: Option<i32>,
    pub capabilities: Option<Vec<String>>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct ModelResponse {
    pub id: Uuid,
    pub provider_id: Uuid,
    pub model_name: String,
    pub display_name: String,
    pub cost_per_1k_prompt_tokens: f64,
    pub cost_per_1k_completion_tokens: f64,
    pub max_tokens: Option<i32>,
    pub context_window: Option<i32>,
    pub capabilities: serde_json::Value,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ============================================================================
// Provider Handlers
// ============================================================================

#[get("/organizations/{org_id}/providers")]
pub async fn list_providers(
    pool: web::Data<PgPool>,
    org_id: web::Path<Uuid>,
    req: HttpRequest,
) -> Result<impl Responder> {
    let user_id = extract_user_id(&req)?;

    // Verify user is member of organization (simplified - should verify in auth middleware)
    verify_org_access(pool.get_ref(), *org_id, user_id).await?;

    let providers = sqlx::query_as::<_, ProviderResponse>(
        r#"
        SELECT id, organization_id, provider_name, display_name, endpoint_url,
               configuration, is_active, created_at, updated_at
        FROM llm_providers
        WHERE organization_id = $1
        ORDER BY created_at DESC
        "#,
    )
    .bind(*org_id)
    .fetch_all(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(providers)))
}

#[get("/providers/{id}")]
pub async fn get_provider(
    pool: web::Data<PgPool>,
    provider_id: web::Path<Uuid>,
    req: HttpRequest,
) -> Result<impl Responder> {
    let user_id = extract_user_id(&req)?;

    let provider = sqlx::query_as::<_, ProviderResponse>(
        r#"
        SELECT id, organization_id, provider_name, display_name, endpoint_url,
               configuration, is_active, created_at, updated_at
        FROM llm_providers
        WHERE id = $1
        "#,
    )
    .bind(*provider_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or_else(|| AppError::NotFound("Provider not found".to_string()))?;

    verify_org_access(pool.get_ref(), provider.organization_id, user_id).await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(provider)))
}

#[post("/organizations/{org_id}/providers")]
pub async fn create_provider(
    pool: web::Data<PgPool>,
    org_id: web::Path<Uuid>,
    req_body: web::Json<CreateProviderRequest>,
    req: HttpRequest,
) -> Result<impl Responder> {
    req_body.validate()
        .map_err(|e| AppError::Validation(format!("{}", e)))?;

    let user_id = extract_user_id(&req)?;
    verify_org_admin(pool.get_ref(), *org_id, user_id).await?;

    // Encrypt API key if provided (simplified - use proper encryption in production)
    let encrypted_key = req_body.api_key.as_ref().map(|key| {
        // TODO: Implement proper encryption using a key management service
        format!("encrypted_{}", key)
    });

    let provider = sqlx::query_as::<_, ProviderResponse>(
        r#"
        INSERT INTO llm_providers (
            organization_id, provider_name, display_name,
            api_key_encrypted, endpoint_url, configuration, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, true)
        RETURNING id, organization_id, provider_name, display_name, endpoint_url,
                  configuration, is_active, created_at, updated_at
        "#,
    )
    .bind(*org_id)
    .bind(&req_body.provider_name)
    .bind(&req_body.display_name)
    .bind(encrypted_key)
    .bind(&req_body.endpoint_url)
    .bind(req_body.configuration.clone().unwrap_or(serde_json::json!({})))
    .fetch_one(pool.get_ref())
    .await?;

    Ok(HttpResponse::Created().json(ApiResponse::success(provider)))
}

#[put("/providers/{id}")]
pub async fn update_provider(
    pool: web::Data<PgPool>,
    provider_id: web::Path<Uuid>,
    req_body: web::Json<UpdateProviderRequest>,
    req: HttpRequest,
) -> Result<impl Responder> {
    let user_id = extract_user_id(&req)?;

    // Get provider to check organization
    let provider: (Uuid,) = sqlx::query_as(
        "SELECT organization_id FROM llm_providers WHERE id = $1"
    )
    .bind(*provider_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or_else(|| AppError::NotFound("Provider not found".to_string()))?;

    verify_org_admin(pool.get_ref(), provider.0, user_id).await?;

    // Build update query dynamically
    let mut updates = vec![];

    if req_body.display_name.is_some() {
        updates.push("display_name = $2");
    }
    if req_body.endpoint_url.is_some() {
        updates.push("endpoint_url = $3");
    }
    if req_body.configuration.is_some() {
        updates.push("configuration = $4::jsonb");
    }
    if req_body.is_active.is_some() {
        updates.push("is_active = $5");
    }
    if req_body.api_key.is_some() {
        // Encrypt the new API key
        updates.push("api_key_encrypted = $6");
    }

    if updates.is_empty() {
        return Err(AppError::Validation("No fields to update".to_string()));
    }

    updates.push("updated_at = NOW()");

    // Simplified update - in production, use a query builder
    sqlx::query(&format!(
        "UPDATE llm_providers SET {} WHERE id = $1",
        updates.join(", ")
    ))
    .bind(*provider_id)
    .execute(pool.get_ref())
    .await?;

    // Fetch updated provider
    let provider = sqlx::query_as::<_, ProviderResponse>(
        r#"
        SELECT id, organization_id, provider_name, display_name, endpoint_url,
               configuration, is_active, created_at, updated_at
        FROM llm_providers
        WHERE id = $1
        "#,
    )
    .bind(*provider_id)
    .fetch_one(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(provider)))
}

#[delete("/providers/{id}")]
pub async fn delete_provider(
    pool: web::Data<PgPool>,
    provider_id: web::Path<Uuid>,
    req: HttpRequest,
) -> Result<impl Responder> {
    let user_id = extract_user_id(&req)?;

    let provider: (Uuid,) = sqlx::query_as(
        "SELECT organization_id FROM llm_providers WHERE id = $1"
    )
    .bind(*provider_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or_else(|| AppError::NotFound("Provider not found".to_string()))?;

    verify_org_admin(pool.get_ref(), provider.0, user_id).await?;

    sqlx::query("DELETE FROM llm_providers WHERE id = $1")
        .bind(*provider_id)
        .execute(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(
        serde_json::json!({"message": "Provider deleted successfully"})
    )))
}

// ============================================================================
// Model Handlers
// ============================================================================

#[get("/providers/{provider_id}/models")]
pub async fn list_models(
    pool: web::Data<PgPool>,
    provider_id: web::Path<Uuid>,
    req: HttpRequest,
) -> Result<impl Responder> {
    let user_id = extract_user_id(&req)?;

    // Verify access through provider's organization
    let provider: (Uuid,) = sqlx::query_as(
        "SELECT organization_id FROM llm_providers WHERE id = $1"
    )
    .bind(*provider_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or_else(|| AppError::NotFound("Provider not found".to_string()))?;

    verify_org_access(pool.get_ref(), provider.0, user_id).await?;

    let models = sqlx::query_as::<_, ModelResponse>(
        r#"
        SELECT id, provider_id, model_name, display_name,
               cost_per_1k_prompt_tokens, cost_per_1k_completion_tokens,
               max_tokens, context_window, capabilities, is_active,
               created_at, updated_at
        FROM llm_models
        WHERE provider_id = $1
        ORDER BY created_at DESC
        "#,
    )
    .bind(*provider_id)
    .fetch_all(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(models)))
}

#[post("/providers/{provider_id}/models")]
pub async fn create_model(
    pool: web::Data<PgPool>,
    provider_id: web::Path<Uuid>,
    req_body: web::Json<CreateModelRequest>,
    req: HttpRequest,
) -> Result<impl Responder> {
    req_body.validate()
        .map_err(|e| AppError::Validation(format!("{}", e)))?;

    let user_id = extract_user_id(&req)?;

    let provider: (Uuid,) = sqlx::query_as(
        "SELECT organization_id FROM llm_providers WHERE id = $1"
    )
    .bind(*provider_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or_else(|| AppError::NotFound("Provider not found".to_string()))?;

    verify_org_admin(pool.get_ref(), provider.0, user_id).await?;

    let capabilities = req_body.capabilities.clone()
        .unwrap_or_default();

    let model = sqlx::query_as::<_, ModelResponse>(
        r#"
        INSERT INTO llm_models (
            provider_id, model_name, display_name,
            cost_per_1k_prompt_tokens, cost_per_1k_completion_tokens,
            max_tokens, context_window, capabilities, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
        RETURNING id, provider_id, model_name, display_name,
                  cost_per_1k_prompt_tokens, cost_per_1k_completion_tokens,
                  max_tokens, context_window, capabilities, is_active,
                  created_at, updated_at
        "#,
    )
    .bind(*provider_id)
    .bind(&req_body.model_name)
    .bind(&req_body.display_name)
    .bind(req_body.cost_per_1k_prompt_tokens)
    .bind(req_body.cost_per_1k_completion_tokens)
    .bind(req_body.max_tokens)
    .bind(req_body.context_window)
    .bind(serde_json::to_value(capabilities).unwrap())
    .fetch_one(pool.get_ref())
    .await?;

    Ok(HttpResponse::Created().json(ApiResponse::success(model)))
}

#[delete("/models/{id}")]
pub async fn delete_model(
    pool: web::Data<PgPool>,
    model_id: web::Path<Uuid>,
    req: HttpRequest,
) -> Result<impl Responder> {
    let user_id = extract_user_id(&req)?;

    let model: (Uuid,) = sqlx::query_as(
        r#"
        SELECT p.organization_id
        FROM llm_models m
        JOIN llm_providers p ON m.provider_id = p.id
        WHERE m.id = $1
        "#
    )
    .bind(*model_id)
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or_else(|| AppError::NotFound("Model not found".to_string()))?;

    verify_org_admin(pool.get_ref(), model.0, user_id).await?;

    sqlx::query("DELETE FROM llm_models WHERE id = $1")
        .bind(*model_id)
        .execute(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(
        serde_json::json!({"message": "Model deleted successfully"})
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

async fn verify_org_access(pool: &PgPool, org_id: Uuid, user_id: Uuid) -> Result<()> {
    let exists: (bool,) = sqlx::query_as(
        "SELECT EXISTS(SELECT 1 FROM organization_members WHERE organization_id = $1 AND user_id = $2)"
    )
    .bind(org_id)
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    if !exists.0 {
        return Err(AppError::Forbidden);
    }

    Ok(())
}

async fn verify_org_admin(pool: &PgPool, org_id: Uuid, user_id: Uuid) -> Result<()> {
    let role: Option<(String,)> = sqlx::query_as(
        "SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2"
    )
    .bind(org_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await?;

    match role {
        Some((user_role,)) if user_role == "owner" || user_role == "admin" => Ok(()),
        Some(_) => Err(AppError::Forbidden),
        None => Err(AppError::Forbidden),
    }
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(list_providers)
        .service(get_provider)
        .service(create_provider)
        .service(update_provider)
        .service(delete_provider)
        .service(list_models)
        .service(create_model)
        .service(delete_model);
}
