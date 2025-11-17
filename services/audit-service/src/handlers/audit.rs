use actix_web::{get, post, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use llm_governance_common::{AppError, Result, ApiResponse};
use chrono::{DateTime, Utc, NaiveDateTime};
use sha2::{Sha256, Digest};

#[derive(Debug, Deserialize)]
pub struct CreateAuditLogRequest {
    pub action: String,
    pub resource_type: String,
    pub resource_id: String,
    pub details: serde_json::Value,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct AuditLogResponse {
    pub id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub user_id: Option<Uuid>,
    pub action: String,
    pub resource_type: String,
    pub resource_id: String,
    pub ip_address: Option<String>,
    pub details: serde_json::Value,
    pub checksum: String,
}

#[derive(Debug, Deserialize)]
pub struct AuditQuery {
    pub user_id: Option<Uuid>,
    pub action: Option<String>,
    pub resource_type: Option<String>,
    pub resource_id: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct ExportRequest {
    pub format: String, // "csv" or "json"
    pub user_id: Option<Uuid>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[post("/audit/logs")]
pub async fn create_audit_log(
    pool: web::Data<PgPool>,
    req: web::Json<CreateAuditLogRequest>,
    http_req: actix_web::HttpRequest,
) -> Result<impl Responder> {
    let user_id = extract_user_id_optional(&http_req);
    let ip_address = extract_ip_address(&http_req);

    // Calculate checksum for integrity
    let checksum = calculate_checksum(
        user_id,
        &req.action,
        &req.resource_type,
        &req.resource_id,
        &req.details,
    );

    let log = sqlx::query_as::<_, AuditLogResponse>(
        r#"
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, ip_address, details, checksum)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, timestamp, user_id, action, resource_type, resource_id, ip_address, details, checksum
        "#,
    )
    .bind(user_id)
    .bind(&req.action)
    .bind(&req.resource_type)
    .bind(&req.resource_id)
    .bind(ip_address)
    .bind(&req.details)
    .bind(&checksum)
    .fetch_one(pool.get_ref())
    .await?;

    Ok(HttpResponse::Created().json(ApiResponse::success(log)))
}

#[get("/audit/logs")]
pub async fn query_audit_logs(
    pool: web::Data<PgPool>,
    query: web::Query<AuditQuery>,
) -> Result<impl Responder> {
    let limit = query.limit.unwrap_or(50).min(1000);
    let offset = query.offset.unwrap_or(0);

    // Build dynamic query
    let mut sql = String::from(
        "SELECT id, timestamp, user_id, action, resource_type, resource_id, ip_address, details, checksum FROM audit_logs WHERE 1=1"
    );

    let mut bindings = Vec::new();
    let mut bind_index = 1;

    if let Some(user_id) = query.user_id {
        sql.push_str(&format!(" AND user_id = ${}", bind_index));
        bind_index += 1;
    }

    if let Some(ref action) = query.action {
        sql.push_str(&format!(" AND action = ${}", bind_index));
        bind_index += 1;
    }

    if let Some(ref resource_type) = query.resource_type {
        sql.push_str(&format!(" AND resource_type = ${}", bind_index));
        bind_index += 1;
    }

    if let Some(ref resource_id) = query.resource_id {
        sql.push_str(&format!(" AND resource_id = ${}", bind_index));
        bind_index += 1;
    }

    if let Some(ref start_date) = query.start_date {
        sql.push_str(&format!(" AND timestamp >= ${}", bind_index));
        bind_index += 1;
    }

    if let Some(ref end_date) = query.end_date {
        sql.push_str(&format!(" AND timestamp <= ${}", bind_index));
        bind_index += 1;
    }

    sql.push_str(&format!(" ORDER BY timestamp DESC LIMIT ${} OFFSET ${}", bind_index, bind_index + 1));

    // Execute query with dynamic bindings
    let mut query_builder = sqlx::query_as::<_, AuditLogResponse>(&sql);

    if let Some(user_id) = query.user_id {
        query_builder = query_builder.bind(user_id);
    }
    if let Some(ref action) = query.action {
        query_builder = query_builder.bind(action);
    }
    if let Some(ref resource_type) = query.resource_type {
        query_builder = query_builder.bind(resource_type);
    }
    if let Some(ref resource_id) = query.resource_id {
        query_builder = query_builder.bind(resource_id);
    }
    if let Some(ref start_date) = query.start_date {
        query_builder = query_builder.bind(start_date);
    }
    if let Some(ref end_date) = query.end_date {
        query_builder = query_builder.bind(end_date);
    }

    query_builder = query_builder.bind(limit as i64).bind(offset as i64);

    let logs = query_builder.fetch_all(pool.get_ref()).await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
        "logs": logs,
        "limit": limit,
        "offset": offset
    }))))
}

#[get("/audit/logs/{id}")]
pub async fn get_audit_log(
    pool: web::Data<PgPool>,
    log_id: web::Path<Uuid>,
) -> Result<impl Responder> {
    let log = sqlx::query_as::<_, AuditLogResponse>(
        r#"
        SELECT id, timestamp, user_id, action, resource_type, resource_id, ip_address, details, checksum
        FROM audit_logs
        WHERE id = $1
        "#,
    )
    .bind(log_id.as_ref())
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or_else(|| AppError::NotFound("Audit log not found".to_string()))?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(log)))
}

#[get("/audit/logs/{id}/verify")]
pub async fn verify_audit_log(
    pool: web::Data<PgPool>,
    log_id: web::Path<Uuid>,
) -> Result<impl Responder> {
    let log = sqlx::query_as::<_, AuditLogResponse>(
        r#"
        SELECT id, timestamp, user_id, action, resource_type, resource_id, ip_address, details, checksum
        FROM audit_logs
        WHERE id = $1
        "#,
    )
    .bind(log_id.as_ref())
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or_else(|| AppError::NotFound("Audit log not found".to_string()))?;

    // Recalculate checksum
    let calculated_checksum = calculate_checksum(
        log.user_id,
        &log.action,
        &log.resource_type,
        &log.resource_id,
        &log.details,
    );

    let is_valid = calculated_checksum == log.checksum;

    Ok(HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
        "log_id": log.id,
        "is_valid": is_valid,
        "stored_checksum": log.checksum,
        "calculated_checksum": calculated_checksum
    }))))
}

#[post("/audit/export")]
pub async fn export_audit_logs(
    pool: web::Data<PgPool>,
    req: web::Json<ExportRequest>,
) -> Result<impl Responder> {
    // Build query
    let mut sql = String::from(
        "SELECT id, timestamp, user_id, action, resource_type, resource_id, ip_address, details, checksum FROM audit_logs WHERE 1=1"
    );

    if req.user_id.is_some() {
        sql.push_str(" AND user_id = $1");
    }
    if req.start_date.is_some() {
        sql.push_str(" AND timestamp >= $2");
    }
    if req.end_date.is_some() {
        sql.push_str(" AND timestamp <= $3");
    }

    sql.push_str(" ORDER BY timestamp DESC LIMIT 10000");

    let mut query_builder = sqlx::query_as::<_, AuditLogResponse>(&sql);

    if let Some(user_id) = req.user_id {
        query_builder = query_builder.bind(user_id);
    }
    if let Some(ref start_date) = req.start_date {
        query_builder = query_builder.bind(start_date);
    }
    if let Some(ref end_date) = req.end_date {
        query_builder = query_builder.bind(end_date);
    }

    let logs = query_builder.fetch_all(pool.get_ref()).await?;

    match req.format.as_str() {
        "csv" => {
            let csv = generate_csv(&logs)?;
            Ok(HttpResponse::Ok()
                .content_type("text/csv")
                .insert_header(("Content-Disposition", "attachment; filename=audit_logs.csv"))
                .body(csv))
        }
        "json" => {
            Ok(HttpResponse::Ok()
                .content_type("application/json")
                .insert_header(("Content-Disposition", "attachment; filename=audit_logs.json"))
                .json(logs))
        }
        _ => Err(AppError::Validation("Invalid export format. Use 'csv' or 'json'".to_string()))
    }
}

#[get("/audit/reports/compliance")]
pub async fn generate_compliance_report(
    pool: web::Data<PgPool>,
    query: web::Query<ComplianceQuery>,
) -> Result<impl Responder> {
    #[derive(Debug, Serialize, sqlx::FromRow)]
    struct ComplianceStats {
        total_actions: i64,
        unique_users: i64,
        actions_by_type: serde_json::Value,
    }

    let start_date = query.start_date.clone().unwrap_or_else(|| {
        chrono::Utc::now().checked_sub_signed(chrono::Duration::days(30)).unwrap().to_rfc3339()
    });

    let end_date = query.end_date.clone().unwrap_or_else(|| {
        chrono::Utc::now().to_rfc3339()
    });

    // Get total actions
    let total_actions: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM audit_logs WHERE timestamp BETWEEN $1 AND $2"
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(pool.get_ref())
    .await?;

    // Get unique users
    let unique_users: (i64,) = sqlx::query_as(
        "SELECT COUNT(DISTINCT user_id) FROM audit_logs WHERE timestamp BETWEEN $1 AND $2"
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(pool.get_ref())
    .await?;

    // Get actions by type
    let actions_by_type = sqlx::query_as::<_, (String, i64)>(
        "SELECT action, COUNT(*) as count FROM audit_logs WHERE timestamp BETWEEN $1 AND $2 GROUP BY action ORDER BY count DESC"
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_all(pool.get_ref())
    .await?;

    let actions_map: serde_json::Map<String, serde_json::Value> = actions_by_type
        .into_iter()
        .map(|(action, count)| (action, serde_json::json!(count)))
        .collect();

    Ok(HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
        "period": {
            "start": start_date,
            "end": end_date
        },
        "total_actions": total_actions.0,
        "unique_users": unique_users.0,
        "actions_by_type": actions_map
    }))))
}

// Helper functions

#[derive(Debug, Deserialize)]
pub struct ComplianceQuery {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

fn calculate_checksum(
    user_id: Option<Uuid>,
    action: &str,
    resource_type: &str,
    resource_id: &str,
    details: &serde_json::Value,
) -> String {
    let mut hasher = Sha256::new();

    if let Some(uid) = user_id {
        hasher.update(uid.to_string().as_bytes());
    }
    hasher.update(action.as_bytes());
    hasher.update(resource_type.as_bytes());
    hasher.update(resource_id.as_bytes());
    hasher.update(details.to_string().as_bytes());

    format!("{:x}", hasher.finalize())
}

fn extract_user_id_optional(req: &actix_web::HttpRequest) -> Option<Uuid> {
    req.headers()
        .get("X-User-Id")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
}

fn extract_ip_address(req: &actix_web::HttpRequest) -> Option<String> {
    req.connection_info()
        .realip_remote_addr()
        .map(|s| s.to_string())
}

fn generate_csv(logs: &[AuditLogResponse]) -> Result<String> {
    let mut csv = String::from("id,timestamp,user_id,action,resource_type,resource_id,ip_address,checksum\n");

    for log in logs {
        csv.push_str(&format!(
            "{},{},{},{},{},{},{},{}\n",
            log.id,
            log.timestamp,
            log.user_id.map(|u| u.to_string()).unwrap_or_default(),
            log.action,
            log.resource_type,
            log.resource_id,
            log.ip_address.as_deref().unwrap_or(""),
            log.checksum
        ));
    }

    Ok(csv)
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(create_audit_log)
        .service(query_audit_logs)
        .service(get_audit_log)
        .service(verify_audit_log)
        .service(export_audit_logs)
        .service(generate_compliance_report);
}
