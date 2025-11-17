use actix_web::{get, post, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use common::{AppError, Result, ApiResponse};
use chrono::{DateTime, Utc};

#[derive(Debug, Deserialize)]
pub struct IngestMetricRequest {
    pub provider: String,
    pub model: String,
    pub team_id: Option<Uuid>,
    pub tokens_in: i32,
    pub tokens_out: i32,
    pub latency_ms: i32,
    pub cost: f64,
    pub metadata: Option<serde_json::Value>,
    pub request_id: Option<String>,
    pub endpoint: Option<String>,
    pub status: String,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct MetricResponse {
    pub time: DateTime<Utc>,
    pub provider: String,
    pub model: String,
    pub user_id: Option<Uuid>,
    pub team_id: Option<Uuid>,
    pub tokens_in: i32,
    pub tokens_out: i32,
    pub latency_ms: i32,
    pub cost: f64,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MetricsQuery {
    pub provider: Option<String>,
    pub model: Option<String>,
    pub team_id: Option<Uuid>,
    pub user_id: Option<Uuid>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub limit: Option<u32>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct AggregatedMetrics {
    pub bucket: DateTime<Utc>,
    pub provider: String,
    pub model: String,
    pub request_count: i64,
    pub total_tokens_in: i64,
    pub total_tokens_out: i64,
    pub avg_latency_ms: f64,
    pub total_cost: f64,
    pub error_count: i64,
}

#[post("/metrics/ingest")]
pub async fn ingest_metric(
    pool: web::Data<PgPool>,
    req: web::Json<IngestMetricRequest>,
    http_req: actix_web::HttpRequest,
) -> Result<impl Responder> {
    let user_id = extract_user_id_optional(&http_req);

    sqlx::query(
        r#"
        INSERT INTO llm_metrics (
            time, provider, model, user_id, team_id,
            tokens_in, tokens_out, latency_ms, cost,
            metadata, request_id, endpoint, status
        )
        VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        "#,
    )
    .bind(&req.provider)
    .bind(&req.model)
    .bind(user_id)
    .bind(req.team_id)
    .bind(req.tokens_in)
    .bind(req.tokens_out)
    .bind(req.latency_ms)
    .bind(req.cost)
    .bind(&req.metadata)
    .bind(&req.request_id)
    .bind(&req.endpoint)
    .bind(&req.status)
    .execute(pool.get_ref())
    .await?;

    Ok(HttpResponse::Created().json(ApiResponse::success(
        serde_json::json!({"message": "Metric ingested successfully"})
    )))
}

#[post("/metrics/ingest/batch")]
pub async fn ingest_metrics_batch(
    pool: web::Data<PgPool>,
    req: web::Json<Vec<IngestMetricRequest>>,
    http_req: actix_web::HttpRequest,
) -> Result<impl Responder> {
    let user_id = extract_user_id_optional(&http_req);

    let mut transaction = pool.begin().await?;

    for metric in req.iter() {
        sqlx::query(
            r#"
            INSERT INTO llm_metrics (
                time, provider, model, user_id, team_id,
                tokens_in, tokens_out, latency_ms, cost,
                metadata, request_id, endpoint, status
            )
            VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            "#,
        )
        .bind(&metric.provider)
        .bind(&metric.model)
        .bind(user_id)
        .bind(metric.team_id)
        .bind(metric.tokens_in)
        .bind(metric.tokens_out)
        .bind(metric.latency_ms)
        .bind(metric.cost)
        .bind(&metric.metadata)
        .bind(&metric.request_id)
        .bind(&metric.endpoint)
        .bind(&metric.status)
        .execute(&mut *transaction)
        .await?;
    }

    transaction.commit().await?;

    Ok(HttpResponse::Created().json(ApiResponse::success(
        serde_json::json!({
            "message": "Metrics ingested successfully",
            "count": req.len()
        })
    )))
}

#[get("/metrics/query")]
pub async fn query_metrics(
    pool: web::Data<PgPool>,
    query: web::Query<MetricsQuery>,
) -> Result<impl Responder> {
    let limit = query.limit.unwrap_or(100).min(1000);

    let mut sql = String::from(
        "SELECT time, provider, model, user_id, team_id, tokens_in, tokens_out, latency_ms, cost, status FROM llm_metrics WHERE 1=1"
    );

    if query.provider.is_some() {
        sql.push_str(" AND provider = $1");
    }
    if query.model.is_some() {
        sql.push_str(" AND model = $2");
    }
    if query.team_id.is_some() {
        sql.push_str(" AND team_id = $3");
    }
    if query.user_id.is_some() {
        sql.push_str(" AND user_id = $4");
    }
    if query.start_time.is_some() {
        sql.push_str(" AND time >= $5");
    }
    if query.end_time.is_some() {
        sql.push_str(" AND time <= $6");
    }

    sql.push_str(&format!(" ORDER BY time DESC LIMIT {}", limit));

    let mut query_builder = sqlx::query_as::<_, MetricResponse>(&sql);

    if let Some(ref provider) = query.provider {
        query_builder = query_builder.bind(provider);
    }
    if let Some(ref model) = query.model {
        query_builder = query_builder.bind(model);
    }
    if let Some(team_id) = query.team_id {
        query_builder = query_builder.bind(team_id);
    }
    if let Some(user_id) = query.user_id {
        query_builder = query_builder.bind(user_id);
    }
    if let Some(ref start_time) = query.start_time {
        query_builder = query_builder.bind(start_time);
    }
    if let Some(ref end_time) = query.end_time {
        query_builder = query_builder.bind(end_time);
    }

    let metrics = query_builder.fetch_all(pool.get_ref()).await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(metrics)))
}

#[get("/metrics/aggregate/hourly")]
pub async fn get_hourly_aggregates(
    pool: web::Data<PgPool>,
    query: web::Query<AggregateQuery>,
) -> Result<impl Responder> {
    let start_time = query.start_time.clone().unwrap_or_else(|| {
        chrono::Utc::now().checked_sub_signed(chrono::Duration::hours(24)).unwrap().to_rfc3339()
    });

    let end_time = query.end_time.clone().unwrap_or_else(|| {
        chrono::Utc::now().to_rfc3339()
    });

    let aggregates = sqlx::query_as::<_, AggregatedMetrics>(
        r#"
        SELECT
            bucket, provider, model,
            request_count, total_tokens_in, total_tokens_out,
            avg_latency_ms, total_cost, 0 as error_count
        FROM llm_metrics_hourly
        WHERE bucket BETWEEN $1 AND $2
        ORDER BY bucket DESC
        "#,
    )
    .bind(&start_time)
    .bind(&end_time)
    .fetch_all(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(aggregates)))
}

#[get("/metrics/aggregate/daily")]
pub async fn get_daily_aggregates(
    pool: web::Data<PgPool>,
    query: web::Query<AggregateQuery>,
) -> Result<impl Responder> {
    let start_time = query.start_time.clone().unwrap_or_else(|| {
        chrono::Utc::now().checked_sub_signed(chrono::Duration::days(30)).unwrap().to_rfc3339()
    });

    let end_time = query.end_time.clone().unwrap_or_else(|| {
        chrono::Utc::now().to_rfc3339()
    });

    let aggregates = sqlx::query_as::<_, AggregatedMetrics>(
        r#"
        SELECT
            bucket, provider, model,
            request_count, total_tokens_in, total_tokens_out,
            avg_latency_ms, total_cost, error_count
        FROM llm_metrics_daily
        WHERE bucket BETWEEN $1 AND $2
        ORDER BY bucket DESC
        "#,
    )
    .bind(&start_time)
    .bind(&end_time)
    .fetch_all(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(aggregates)))
}

#[get("/metrics/stats/usage")]
pub async fn get_usage_stats(
    pool: web::Data<PgPool>,
    query: web::Query<StatsQuery>,
) -> Result<impl Responder> {
    let team_id = query.team_id.ok_or_else(|| AppError::Validation("team_id required".to_string()))?;

    let stats = sqlx::query_as::<_, UsageStats>(
        r#"
        SELECT
            COUNT(*) as total_requests,
            SUM(tokens_in) as total_tokens_in,
            SUM(tokens_out) as total_tokens_out,
            SUM(tokens_in + tokens_out) as total_tokens,
            AVG(latency_ms) as avg_latency_ms,
            SUM(cost) as total_cost
        FROM llm_metrics
        WHERE team_id = $1
        AND time >= NOW() - INTERVAL '30 days'
        "#,
    )
    .bind(team_id)
    .fetch_one(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(stats)))
}

#[get("/metrics/stats/by-provider")]
pub async fn get_stats_by_provider(
    pool: web::Data<PgPool>,
    query: web::Query<StatsQuery>,
) -> Result<impl Responder> {
    let team_id = query.team_id.ok_or_else(|| AppError::Validation("team_id required".to_string()))?;

    let stats = sqlx::query_as::<_, ProviderStats>(
        r#"
        SELECT
            provider,
            COUNT(*) as request_count,
            SUM(tokens_in + tokens_out) as total_tokens,
            SUM(cost) as total_cost,
            AVG(latency_ms) as avg_latency_ms
        FROM llm_metrics
        WHERE team_id = $1
        AND time >= NOW() - INTERVAL '30 days'
        GROUP BY provider
        ORDER BY total_cost DESC
        "#,
    )
    .bind(team_id)
    .fetch_all(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(stats)))
}

#[get("/metrics/stats/by-model")]
pub async fn get_stats_by_model(
    pool: web::Data<PgPool>,
    query: web::Query<StatsQuery>,
) -> Result<impl Responder> {
    let team_id = query.team_id.ok_or_else(|| AppError::Validation("team_id required".to_string()))?;

    let stats = sqlx::query_as::<_, ModelStats>(
        r#"
        SELECT
            provider,
            model,
            COUNT(*) as request_count,
            SUM(tokens_in + tokens_out) as total_tokens,
            SUM(cost) as total_cost,
            AVG(latency_ms) as avg_latency_ms
        FROM llm_metrics
        WHERE team_id = $1
        AND time >= NOW() - INTERVAL '30 days'
        GROUP BY provider, model
        ORDER BY total_cost DESC
        "#,
    )
    .bind(team_id)
    .fetch_all(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(stats)))
}

// Helper structs and functions

#[derive(Debug, Deserialize)]
pub struct AggregateQuery {
    pub start_time: Option<String>,
    pub end_time: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct StatsQuery {
    pub team_id: Option<Uuid>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct UsageStats {
    pub total_requests: i64,
    pub total_tokens_in: i64,
    pub total_tokens_out: i64,
    pub total_tokens: i64,
    pub avg_latency_ms: f64,
    pub total_cost: f64,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct ProviderStats {
    pub provider: String,
    pub request_count: i64,
    pub total_tokens: i64,
    pub total_cost: f64,
    pub avg_latency_ms: f64,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct ModelStats {
    pub provider: String,
    pub model: String,
    pub request_count: i64,
    pub total_tokens: i64,
    pub total_cost: f64,
    pub avg_latency_ms: f64,
}

fn extract_user_id_optional(req: &actix_web::HttpRequest) -> Option<Uuid> {
    req.headers()
        .get("X-User-Id")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(ingest_metric)
        .service(ingest_metrics_batch)
        .service(query_metrics)
        .service(get_hourly_aggregates)
        .service(get_daily_aggregates)
        .service(get_usage_stats)
        .service(get_stats_by_provider)
        .service(get_stats_by_model);
}
