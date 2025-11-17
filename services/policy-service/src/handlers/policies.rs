use actix_web::{delete, get, post, put, web, HttpResponse, Responder, HttpRequest};
use serde::{Deserialize, Serialize};
use validator::Validate;
use sqlx::PgPool;
use uuid::Uuid;
use llm_governance_common::{AppError, Result, ApiResponse};
use chrono::{DateTime, Utc};

#[derive(Debug, Deserialize, Validate)]
pub struct CreatePolicyRequest {
    #[validate(length(min = 3, max = 255))]
    pub name: String,
    pub description: Option<String>,
    pub policy_type: String,
    pub rules: serde_json::Value,
    pub enforcement_level: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdatePolicyRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub rules: Option<serde_json::Value>,
    pub enforcement_level: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct PolicyResponse {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub policy_type: String,
    pub rules: serde_json::Value,
    pub enforcement_level: String,
    pub status: String,
    pub version: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct EvaluateRequest {
    pub context: serde_json::Value,
}

#[derive(Debug, Serialize)]
pub struct EvaluationResult {
    pub passed: bool,
    pub violations: Vec<PolicyViolation>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct PolicyViolation {
    pub policy_id: Uuid,
    pub policy_name: String,
    pub rule_violated: String,
    pub severity: String,
    pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct AssignPolicyRequest {
    pub team_id: Option<Uuid>,
    pub user_id: Option<Uuid>,
}

#[get("/policies")]
pub async fn list_policies(
    pool: web::Data<PgPool>,
    query: web::Query<PolicyQuery>,
) -> Result<impl Responder> {
    let limit = query.limit.unwrap_or(20).min(100);
    let offset = query.offset.unwrap_or(0);

    // Use parameterized queries to prevent SQL injection
    let policies = sqlx::query_as::<_, PolicyResponse>(
        r#"
        SELECT id, name, description, policy_type, rules, enforcement_level, status, version, created_at, updated_at, created_by
        FROM policies
        WHERE ($1::text IS NULL OR policy_type = $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#
    )
    .bind(query.policy_type.as_ref())
    .bind(query.status.as_ref())
    .bind(limit as i64)
    .bind(offset as i64)
    .fetch_all(pool.get_ref())
    .await?;

    let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM policies")
        .fetch_one(pool.get_ref())
        .await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
        "policies": policies,
        "total": total.0,
        "limit": limit,
        "offset": offset
    }))))
}

#[get("/policies/{id}")]
pub async fn get_policy(
    pool: web::Data<PgPool>,
    policy_id: web::Path<Uuid>,
) -> Result<impl Responder> {
    let policy = sqlx::query_as::<_, PolicyResponse>(
        r#"
        SELECT id, name, description, policy_type, rules, enforcement_level, status, version, created_at, updated_at, created_by
        FROM policies
        WHERE id = $1
        "#,
    )
    .bind(policy_id.as_ref())
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or_else(|| AppError::NotFound("Policy not found".to_string()))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(policy)))
}

#[post("/policies")]
pub async fn create_policy(
    pool: web::Data<PgPool>,
    req: web::Json<CreatePolicyRequest>,
    http_req: HttpRequest,
) -> Result<impl Responder> {
    req.validate()
        .map_err(|e| AppError::Validation(format!("{}", e)))?;

    let current_user_id = extract_user_id(&http_req)?;

    // Validate policy type
    if !is_valid_policy_type(&req.policy_type) {
        return Err(AppError::Validation("Invalid policy type".to_string()));
    }

    // Validate enforcement level
    if !is_valid_enforcement_level(&req.enforcement_level) {
        return Err(AppError::Validation("Invalid enforcement level".to_string()));
    }

    let policy = sqlx::query_as::<_, PolicyResponse>(
        r#"
        INSERT INTO policies (name, description, policy_type, rules, enforcement_level, status, created_by)
        VALUES ($1, $2, $3, $4, $5, 'active', $6)
        RETURNING id, name, description, policy_type, rules, enforcement_level, status, version, created_at, updated_at, created_by
        "#,
    )
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.policy_type)
    .bind(&req.rules)
    .bind(&req.enforcement_level)
    .bind(current_user_id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| match e {
        sqlx::Error::Database(db_err) if db_err.constraint() == Some("policies_name_key") => {
            AppError::BadRequest("Policy name already exists".to_string())
        }
        _ => AppError::Database(e),
    })?;

    Ok(HttpResponse::Created().json(ApiResponse::success(policy)))
}

#[put("/policies/{id}")]
pub async fn update_policy(
    pool: web::Data<PgPool>,
    policy_id: web::Path<Uuid>,
    req: web::Json<UpdatePolicyRequest>,
    http_req: HttpRequest,
) -> Result<impl Responder> {
    req.validate()
        .map_err(|e| AppError::Validation(format!("{}", e)))?;

    let _current_user_id = extract_user_id(&http_req)?;

    // Get current policy version
    let current: (i32,) = sqlx::query_as(
        "SELECT version FROM policies WHERE id = $1"
    )
    .bind(policy_id.as_ref())
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or_else(|| AppError::NotFound("Policy not found".to_string()))?;

    // Build update query dynamically
    let mut updates = Vec::new();
    let mut values: Vec<String> = Vec::new();

    if let Some(name) = &req.name {
        updates.push("name = $");
        values.push(name.clone());
    }
    if let Some(description) = &req.description {
        updates.push("description = $");
        values.push(description.clone());
    }
    if let Some(rules) = &req.rules {
        updates.push("rules = $");
        values.push(serde_json::to_string(rules).unwrap());
    }
    if let Some(enforcement_level) = &req.enforcement_level {
        updates.push("enforcement_level = $");
        values.push(enforcement_level.clone());
    }
    if let Some(status) = &req.status {
        updates.push("status = $");
        values.push(status.clone());
    }

    // Increment version
    updates.push("version = version + 1");

    if !values.is_empty() || !updates.is_empty() {
        // Simplified update - in production, you'd build this dynamically
        if let Some(rules) = &req.rules {
            sqlx::query(
                r#"
                UPDATE policies
                SET rules = $1, version = version + 1
                WHERE id = $2
                "#,
            )
            .bind(rules)
            .bind(policy_id.as_ref())
            .execute(pool.get_ref())
            .await?;
        }
    }

    let policy = sqlx::query_as::<_, PolicyResponse>(
        r#"
        SELECT id, name, description, policy_type, rules, enforcement_level, status, version, created_at, updated_at, created_by
        FROM policies
        WHERE id = $1
        "#,
    )
    .bind(policy_id.as_ref())
    .fetch_one(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(policy)))
}

#[delete("/policies/{id}")]
pub async fn delete_policy(
    pool: web::Data<PgPool>,
    policy_id: web::Path<Uuid>,
    http_req: HttpRequest,
) -> Result<impl Responder> {
    let _current_user_id = extract_user_id(&http_req)?;

    // Soft delete (set status to inactive)
    let result = sqlx::query("UPDATE policies SET status = 'inactive' WHERE id = $1")
        .bind(policy_id.as_ref())
        .execute(pool.get_ref())
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Policy not found".to_string()));
    }

    Ok(HttpResponse::Ok().json(ApiResponse::success(
        serde_json::json!({"message": "Policy deleted successfully"})
    )))
}

#[post("/policies/{id}/evaluate")]
pub async fn evaluate_policy(
    pool: web::Data<PgPool>,
    policy_id: web::Path<Uuid>,
    req: web::Json<EvaluateRequest>,
) -> Result<impl Responder> {
    let policy = sqlx::query_as::<_, PolicyResponse>(
        r#"
        SELECT id, name, description, policy_type, rules, enforcement_level, status, version, created_at, updated_at, created_by
        FROM policies
        WHERE id = $1 AND status = 'active'
        "#,
    )
    .bind(policy_id.as_ref())
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or_else(|| AppError::NotFound("Policy not found or inactive".to_string()))?;

    let result = evaluate_policy_rules(&policy, &req.context)?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(result)))
}

#[post("/policies/{id}/assign")]
pub async fn assign_policy(
    pool: web::Data<PgPool>,
    policy_id: web::Path<Uuid>,
    req: web::Json<AssignPolicyRequest>,
    http_req: HttpRequest,
) -> Result<impl Responder> {
    let current_user_id = extract_user_id(&http_req)?;

    // Validate that either team_id or user_id is provided, but not both
    if (req.team_id.is_some() && req.user_id.is_some()) ||
       (req.team_id.is_none() && req.user_id.is_none()) {
        return Err(AppError::Validation("Provide either team_id or user_id, not both".to_string()));
    }

    sqlx::query(
        r#"
        INSERT INTO policy_assignments (policy_id, team_id, user_id, assigned_by)
        VALUES ($1, $2, $3, $4)
        "#,
    )
    .bind(policy_id.as_ref())
    .bind(req.team_id)
    .bind(req.user_id)
    .bind(current_user_id)
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(
        serde_json::json!({"message": "Policy assigned successfully"})
    )))
}

#[get("/policies/{id}/violations")]
pub async fn get_policy_violations(
    pool: web::Data<PgPool>,
    policy_id: web::Path<Uuid>,
    query: web::Query<ViolationQuery>,
) -> Result<impl Responder> {
    let limit = query.limit.unwrap_or(20).min(100);
    let offset = query.offset.unwrap_or(0);

    #[derive(Debug, Serialize, sqlx::FromRow)]
    struct ViolationRecord {
        id: Uuid,
        policy_id: Uuid,
        user_id: Option<Uuid>,
        resource_type: String,
        resource_id: String,
        violation_type: String,
        details: serde_json::Value,
        created_at: DateTime<Utc>,
    }

    let violations = sqlx::query_as::<_, ViolationRecord>(
        r#"
        SELECT id, policy_id, user_id, resource_type, resource_id, violation_type, details, created_at
        FROM policy_violations
        WHERE policy_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(policy_id.as_ref())
    .bind(limit as i64)
    .bind(offset as i64)
    .fetch_all(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(violations)))
}

// Helper functions

#[derive(Debug, Deserialize)]
pub struct PolicyQuery {
    pub limit: Option<u32>,
    pub offset: Option<u32>,
    pub policy_type: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ViolationQuery {
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

fn is_valid_policy_type(policy_type: &str) -> bool {
    matches!(
        policy_type,
        "cost" | "security" | "compliance" | "usage" | "rate_limit" | "content_filter"
    )
}

fn is_valid_enforcement_level(level: &str) -> bool {
    matches!(level, "strict" | "warning" | "monitor")
}

fn evaluate_policy_rules(
    policy: &PolicyResponse,
    context: &serde_json::Value,
) -> Result<EvaluationResult> {
    let mut violations = Vec::new();
    let mut warnings = Vec::new();

    // Policy evaluation logic based on policy type
    match policy.policy_type.as_str() {
        "cost" => evaluate_cost_policy(&policy.rules, context, &mut violations, &mut warnings)?,
        "rate_limit" => evaluate_rate_limit_policy(&policy.rules, context, &mut violations, &mut warnings)?,
        "usage" => evaluate_usage_policy(&policy.rules, context, &mut violations, &mut warnings)?,
        "content_filter" => evaluate_content_filter_policy(&policy.rules, context, &mut violations, &mut warnings)?,
        _ => {}
    }

    Ok(EvaluationResult {
        passed: violations.is_empty(),
        violations,
        warnings,
    })
}

fn evaluate_cost_policy(
    rules: &serde_json::Value,
    context: &serde_json::Value,
    violations: &mut Vec<PolicyViolation>,
    _warnings: &mut Vec<String>,
) -> Result<()> {
    if let Some(max_cost) = rules.get("max_cost_per_request").and_then(|v| v.as_f64()) {
        if let Some(actual_cost) = context.get("cost").and_then(|v| v.as_f64()) {
            if actual_cost > max_cost {
                violations.push(PolicyViolation {
                    policy_id: Uuid::nil(),
                    policy_name: "Cost Policy".to_string(),
                    rule_violated: "max_cost_per_request".to_string(),
                    severity: "high".to_string(),
                    message: format!("Cost ${:.4} exceeds maximum ${:.4}", actual_cost, max_cost),
                });
            }
        }
    }

    Ok(())
}

fn evaluate_rate_limit_policy(
    rules: &serde_json::Value,
    context: &serde_json::Value,
    violations: &mut Vec<PolicyViolation>,
    _warnings: &mut Vec<String>,
) -> Result<()> {
    if let Some(max_requests) = rules.get("max_requests_per_minute").and_then(|v| v.as_i64()) {
        if let Some(current_requests) = context.get("requests_per_minute").and_then(|v| v.as_i64()) {
            if current_requests > max_requests {
                violations.push(PolicyViolation {
                    policy_id: Uuid::nil(),
                    policy_name: "Rate Limit Policy".to_string(),
                    rule_violated: "max_requests_per_minute".to_string(),
                    severity: "high".to_string(),
                    message: format!("Request count {} exceeds limit {}", current_requests, max_requests),
                });
            }
        }
    }

    Ok(())
}

fn evaluate_usage_policy(
    rules: &serde_json::Value,
    context: &serde_json::Value,
    violations: &mut Vec<PolicyViolation>,
    _warnings: &mut Vec<String>,
) -> Result<()> {
    if let Some(max_tokens) = rules.get("max_tokens_per_request").and_then(|v| v.as_i64()) {
        if let Some(actual_tokens) = context.get("tokens").and_then(|v| v.as_i64()) {
            if actual_tokens > max_tokens {
                violations.push(PolicyViolation {
                    policy_id: Uuid::nil(),
                    policy_name: "Usage Policy".to_string(),
                    rule_violated: "max_tokens_per_request".to_string(),
                    severity: "medium".to_string(),
                    message: format!("Token count {} exceeds limit {}", actual_tokens, max_tokens),
                });
            }
        }
    }

    Ok(())
}

fn evaluate_content_filter_policy(
    rules: &serde_json::Value,
    context: &serde_json::Value,
    violations: &mut Vec<PolicyViolation>,
    _warnings: &mut Vec<String>,
) -> Result<()> {
    if let Some(blocked_patterns) = rules.get("blocked_patterns").and_then(|v| v.as_array()) {
        if let Some(content) = context.get("content").and_then(|v| v.as_str()) {
            for pattern in blocked_patterns {
                if let Some(pattern_str) = pattern.as_str() {
                    if content.contains(pattern_str) {
                        violations.push(PolicyViolation {
                            policy_id: Uuid::nil(),
                            policy_name: "Content Filter Policy".to_string(),
                            rule_violated: "blocked_patterns".to_string(),
                            severity: "high".to_string(),
                            message: format!("Content contains blocked pattern: {}", pattern_str),
                        });
                    }
                }
            }
        }
    }

    Ok(())
}

fn extract_user_id(req: &HttpRequest) -> Result<Uuid> {
    req.headers()
        .get("X-User-Id")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
        .ok_or_else(|| AppError::Unauthorized)
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(list_policies)
        .service(get_policy)
        .service(create_policy)
        .service(update_policy)
        .service(delete_policy)
        .service(evaluate_policy)
        .service(assign_policy)
        .service(get_policy_violations);
}
