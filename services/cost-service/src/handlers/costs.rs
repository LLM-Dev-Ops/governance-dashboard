use actix_web::{delete, get, post, put, web, HttpResponse, Responder, HttpRequest};
use serde::{Deserialize, Serialize};
use validator::Validate;
use sqlx::PgPool;
use uuid::Uuid;
use common::{AppError, Result, ApiResponse};
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;

#[derive(Debug, Deserialize)]
pub struct CalculateCostRequest {
    pub provider: String,
    pub model: String,
    pub tokens_in: i64,
    pub tokens_out: i64,
}

#[derive(Debug, Serialize)]
pub struct CostCalculationResponse {
    pub provider: String,
    pub model: String,
    pub tokens_in: i64,
    pub tokens_out: i64,
    pub input_cost: f64,
    pub output_cost: f64,
    pub total_cost: f64,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateBudgetRequest {
    pub name: String,
    pub organization_id: Uuid,
    pub team_id: Option<Uuid>,
    pub user_id: Option<Uuid>,
    #[validate(range(min = 0.01))]
    pub amount: f64,
    pub period: String, // "daily", "weekly", "monthly", "yearly"
    pub alert_threshold_percentage: Option<i32>,
    pub hard_limit: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateBudgetRequest {
    pub amount: Option<f64>,
    pub period: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct BudgetResponse {
    pub id: Uuid,
    pub organization_id: Uuid,
    pub team_id: Option<Uuid>,
    pub user_id: Option<Uuid>,
    pub name: String,
    pub amount: f64,
    pub period: String,
    pub alert_threshold_percentage: i32,
    pub hard_limit: bool,
    pub current_spend: f64,
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct CostForecast {
    pub period: String,
    pub current_spend: f64,
    pub forecasted_spend: f64,
    pub confidence: f64,
}

#[post("/costs/calculate")]
pub async fn calculate_cost(
    pool: web::Data<PgPool>,
    req: web::Json<CalculateCostRequest>,
) -> Result<impl Responder> {
    let pricing = get_model_pricing(&req.provider, &req.model).await?;

    let input_cost = (req.tokens_in as f64 / 1_000_000.0) * pricing.input_price;
    let output_cost = (req.tokens_out as f64 / 1_000_000.0) * pricing.output_price;
    let total_cost = input_cost + output_cost;

    Ok(HttpResponse::Ok().json(ApiResponse::success(CostCalculationResponse {
        provider: req.provider.clone(),
        model: req.model.clone(),
        tokens_in: req.tokens_in,
        tokens_out: req.tokens_out,
        input_cost,
        output_cost,
        total_cost,
    })))
}

#[get("/costs/team/{team_id}")]
pub async fn get_team_costs(
    pool: web::Data<PgPool>,
    team_id: web::Path<Uuid>,
    query: web::Query<CostQuery>,
) -> Result<impl Responder> {
    let start_date = query.start_date.clone().unwrap_or_else(|| {
        chrono::Utc::now().checked_sub_signed(chrono::Duration::days(30)).unwrap().to_rfc3339()
    });

    let end_date = query.end_date.clone().unwrap_or_else(|| {
        chrono::Utc::now().to_rfc3339()
    });

    let costs = sqlx::query_as::<_, CostBreakdown>(
        r#"
        SELECT
            p.provider_name as provider,
            m.model_name as model,
            SUM(r.prompt_tokens) as total_tokens_in,
            SUM(r.completion_tokens) as total_tokens_out,
            SUM(r.total_cost) as total_cost,
            COUNT(*) as request_count
        FROM llm_requests r
        JOIN llm_models m ON r.model_id = m.id
        JOIN llm_providers p ON m.provider_id = p.id
        WHERE r.team_id = $1
        AND r.timestamp BETWEEN $2::timestamptz AND $3::timestamptz
        GROUP BY p.provider_name, m.model_name
        ORDER BY total_cost DESC
        "#,
    )
    .bind(team_id.as_ref())
    .bind(&start_date)
    .bind(&end_date)
    .fetch_all(pool.get_ref())
    .await?;

    let total_cost: f64 = costs.iter().map(|c| c.total_cost).sum();

    Ok(HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
        "team_id": team_id.as_ref(),
        "period": {
            "start": start_date,
            "end": end_date
        },
        "total_cost": total_cost,
        "breakdown": costs
    }))))
}

#[get("/costs/user/{user_id}")]
pub async fn get_user_costs(
    pool: web::Data<PgPool>,
    user_id: web::Path<Uuid>,
    query: web::Query<CostQuery>,
) -> Result<impl Responder> {
    let start_date = query.start_date.clone().unwrap_or_else(|| {
        chrono::Utc::now().checked_sub_signed(chrono::Duration::days(30)).unwrap().to_rfc3339()
    });

    let end_date = query.end_date.clone().unwrap_or_else(|| {
        chrono::Utc::now().to_rfc3339()
    });

    let costs = sqlx::query_as::<_, CostBreakdown>(
        r#"
        SELECT
            p.provider_name as provider,
            m.model_name as model,
            SUM(r.prompt_tokens) as total_tokens_in,
            SUM(r.completion_tokens) as total_tokens_out,
            SUM(r.total_cost) as total_cost,
            COUNT(*) as request_count
        FROM llm_requests r
        JOIN llm_models m ON r.model_id = m.id
        JOIN llm_providers p ON m.provider_id = p.id
        WHERE r.user_id = $1
        AND r.timestamp BETWEEN $2::timestamptz AND $3::timestamptz
        GROUP BY p.provider_name, m.model_name
        ORDER BY total_cost DESC
        "#,
    )
    .bind(user_id.as_ref())
    .bind(&start_date)
    .bind(&end_date)
    .fetch_all(pool.get_ref())
    .await?;

    let total_cost: f64 = costs.iter().map(|c| c.total_cost).sum();

    Ok(HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
        "user_id": user_id.as_ref(),
        "period": {
            "start": start_date,
            "end": end_date
        },
        "total_cost": total_cost,
        "breakdown": costs
    }))))
}

#[post("/costs/budgets")]
pub async fn create_budget(
    pool: web::Data<PgPool>,
    req: web::Json<CreateBudgetRequest>,
    http_req: HttpRequest,
) -> Result<impl Responder> {
    req.validate()
        .map_err(|e| AppError::Validation(format!("{}", e)))?;

    let current_user_id = extract_user_id(&http_req)?;

    // Validate that either team_id or user_id is provided
    if (req.team_id.is_some() && req.user_id.is_some()) ||
       (req.team_id.is_none() && req.user_id.is_none()) {
        return Err(AppError::Validation("Provide either team_id or user_id, not both".to_string()));
    }

    // Calculate period start and end
    let now = chrono::Utc::now();
    let (period_start, period_end) = calculate_period_bounds(&req.period, now);

    let budget = sqlx::query_as::<_, BudgetResponse>(
        r#"
        INSERT INTO budgets (
            organization_id, team_id, user_id, name, amount, period,
            alert_threshold_percentage, hard_limit, current_spend,
            period_start, period_end, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, true)
        RETURNING id, organization_id, team_id, user_id, name, amount, period,
                  alert_threshold_percentage, hard_limit, current_spend,
                  period_start, period_end, is_active, created_at, updated_at
        "#,
    )
    .bind(req.organization_id)
    .bind(req.team_id)
    .bind(req.user_id)
    .bind(&req.name)
    .bind(req.amount)
    .bind(&req.period)
    .bind(req.alert_threshold_percentage.unwrap_or(80))
    .bind(req.hard_limit.unwrap_or(false))
    .bind(period_start)
    .bind(period_end)
    .fetch_one(pool.get_ref())
    .await?;

    Ok(HttpResponse::Created().json(ApiResponse::success(budget)))
}

#[get("/costs/budgets")]
pub async fn list_budgets(
    pool: web::Data<PgPool>,
    query: web::Query<BudgetQuery>,
) -> Result<impl Responder> {
    let limit = query.limit.unwrap_or(20).min(100);
    let offset = query.offset.unwrap_or(0);

    let mut sql = "SELECT id, organization_id, team_id, user_id, name, amount, period, alert_threshold_percentage, hard_limit, current_spend, period_start, period_end, is_active, created_at, updated_at FROM budgets WHERE 1=1".to_string();

    if query.team_id.is_some() {
        sql.push_str(" AND team_id = $1");
    }
    if query.user_id.is_some() {
        sql.push_str(" AND user_id = $2");
    }

    sql.push_str(&format!(" ORDER BY created_at DESC LIMIT {} OFFSET {}", limit, offset));

    let mut query_builder = sqlx::query_as::<_, BudgetResponse>(&sql);

    if let Some(team_id) = query.team_id {
        query_builder = query_builder.bind(team_id);
    }
    if let Some(user_id) = query.user_id {
        query_builder = query_builder.bind(user_id);
    }

    let budgets = query_builder.fetch_all(pool.get_ref()).await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(budgets)))
}

#[get("/costs/budgets/{id}")]
pub async fn get_budget(
    pool: web::Data<PgPool>,
    budget_id: web::Path<Uuid>,
) -> Result<impl Responder> {
    let budget = sqlx::query_as::<_, BudgetResponse>(
        r#"
        SELECT id, organization_id, team_id, user_id, name, amount, period,
               alert_threshold_percentage, hard_limit, current_spend,
               period_start, period_end, is_active, created_at, updated_at
        FROM budgets
        WHERE id = $1
        "#,
    )
    .bind(budget_id.as_ref())
    .fetch_optional(pool.get_ref())
    .await?
    .ok_or_else(|| AppError::NotFound("Budget not found".to_string()))?;

    let utilization = if budget.amount > 0.0 {
        (budget.current_spend / budget.amount) * 100.0
    } else {
        0.0
    };

    Ok(HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
        "budget": budget,
        "utilization_percent": utilization
    }))))
}

#[put("/costs/budgets/{id}")]
pub async fn update_budget(
    pool: web::Data<PgPool>,
    budget_id: web::Path<Uuid>,
    req: web::Json<UpdateBudgetRequest>,
) -> Result<impl Responder> {
    if let Some(amount) = req.amount {
        sqlx::query("UPDATE budgets SET amount = $1 WHERE id = $2")
            .bind(amount)
            .bind(budget_id.as_ref())
            .execute(pool.get_ref())
            .await?;
    }

    if let Some(ref period) = req.period {
        sqlx::query("UPDATE budgets SET period = $1 WHERE id = $2")
            .bind(period)
            .bind(budget_id.as_ref())
            .execute(pool.get_ref())
            .await?;
    }

    if let Some(ref status) = req.status {
        sqlx::query("UPDATE budgets SET status = $1 WHERE id = $2")
            .bind(status)
            .bind(budget_id.as_ref())
            .execute(pool.get_ref())
            .await?;
    }

    let budget = sqlx::query_as::<_, BudgetResponse>(
        r#"
        SELECT id, organization_id, team_id, user_id, name, amount, period,
               alert_threshold_percentage, hard_limit, current_spend,
               period_start, period_end, is_active, created_at, updated_at
        FROM budgets
        WHERE id = $1
        "#,
    )
    .bind(budget_id.as_ref())
    .fetch_one(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(budget)))
}

#[delete("/costs/budgets/{id}")]
pub async fn delete_budget(
    pool: web::Data<PgPool>,
    budget_id: web::Path<Uuid>,
) -> Result<impl Responder> {
    let result = sqlx::query("DELETE FROM budgets WHERE id = $1")
        .bind(budget_id.as_ref())
        .execute(pool.get_ref())
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Budget not found".to_string()));
    }

    Ok(HttpResponse::Ok().json(ApiResponse::success(
        serde_json::json!({"message": "Budget deleted successfully"})
    )))
}

#[get("/costs/forecast")]
pub async fn forecast_costs(
    pool: web::Data<PgPool>,
    query: web::Query<ForecastQuery>,
) -> Result<impl Responder> {
    let team_id = query.team_id.ok_or_else(|| AppError::Validation("team_id required".to_string()))?;

    // Get historical data for last 30 days
    let historical: Vec<(f64,)> = sqlx::query_as(
        r#"
        SELECT SUM(total_cost) as daily_cost
        FROM llm_requests
        WHERE team_id = $1
        AND timestamp >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(timestamp)
        ORDER BY DATE(timestamp)
        "#,
    )
    .bind(team_id)
    .fetch_all(pool.get_ref())
    .await?;

    // Simple forecasting using average growth rate
    let daily_costs: Vec<f64> = historical.iter().map(|(c,)| *c).collect();
    let avg_daily_cost = if !daily_costs.is_empty() {
        daily_costs.iter().sum::<f64>() / daily_costs.len() as f64
    } else {
        0.0
    };

    // Get current month spend
    let current_month: (f64,) = sqlx::query_as(
        r#"
        SELECT COALESCE(SUM(total_cost), 0) as total
        FROM llm_requests
        WHERE team_id = $1
        AND timestamp >= DATE_TRUNC('month', NOW())
        "#,
    )
    .bind(team_id)
    .fetch_one(pool.get_ref())
    .await?;

    // Forecast for rest of month
    let days_in_month = 30; // Simplified
    let days_elapsed = chrono::Utc::now().day() as f64;
    let days_remaining = days_in_month as f64 - days_elapsed;
    let forecasted_monthly = current_month.0 + (avg_daily_cost * days_remaining);

    Ok(HttpResponse::Ok().json(ApiResponse::success(CostForecast {
        period: "monthly".to_string(),
        current_spend: current_month.0,
        forecasted_spend: forecasted_monthly,
        confidence: 0.85, // Confidence level (simplified)
    })))
}

#[get("/costs/reports/chargeback")]
pub async fn generate_chargeback_report(
    pool: web::Data<PgPool>,
    query: web::Query<ChargebackQuery>,
) -> Result<impl Responder> {
    let start_date = query.start_date.clone().unwrap_or_else(|| {
        chrono::Utc::now().checked_sub_signed(chrono::Duration::days(30)).unwrap().to_rfc3339()
    });

    let end_date = query.end_date.clone().unwrap_or_else(|| {
        chrono::Utc::now().to_rfc3339()
    });

    #[derive(Debug, Serialize, sqlx::FromRow)]
    struct ChargebackEntry {
        team_id: Option<Uuid>,
        team_name: Option<String>,
        total_cost: f64,
        total_requests: i64,
        total_tokens: i64,
    }

    let entries = sqlx::query_as::<_, ChargebackEntry>(
        r#"
        SELECT
            r.team_id,
            t.name as team_name,
            SUM(r.total_cost) as total_cost,
            COUNT(*) as total_requests,
            SUM(r.total_tokens) as total_tokens
        FROM llm_requests r
        LEFT JOIN teams t ON r.team_id = t.id
        WHERE r.timestamp BETWEEN $1::timestamptz AND $2::timestamptz
        GROUP BY r.team_id, t.name
        ORDER BY total_cost DESC
        "#,
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_all(pool.get_ref())
    .await?;

    Ok(HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
        "period": {
            "start": start_date,
            "end": end_date
        },
        "entries": entries
    }))))
}

// Helper structs and functions

#[derive(Debug, Deserialize)]
pub struct CostQuery {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BudgetQuery {
    pub team_id: Option<Uuid>,
    pub user_id: Option<Uuid>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct ForecastQuery {
    pub team_id: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct ChargebackQuery {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct CostBreakdown {
    pub provider: String,
    pub model: String,
    pub total_tokens_in: i64,
    pub total_tokens_out: i64,
    pub total_cost: f64,
    pub request_count: i64,
}

struct ModelPricing {
    input_price: f64,
    output_price: f64,
}

async fn get_model_pricing(provider: &str, model: &str) -> Result<ModelPricing> {
    // Pricing per 1M tokens (as of 2024)
    let pricing = match (provider, model) {
        ("openai", "gpt-4") => ModelPricing { input_price: 30.0, output_price: 60.0 },
        ("openai", "gpt-4-turbo") => ModelPricing { input_price: 10.0, output_price: 30.0 },
        ("openai", "gpt-3.5-turbo") => ModelPricing { input_price: 0.5, output_price: 1.5 },
        ("anthropic", "claude-3-opus") => ModelPricing { input_price: 15.0, output_price: 75.0 },
        ("anthropic", "claude-3-sonnet") => ModelPricing { input_price: 3.0, output_price: 15.0 },
        ("anthropic", "claude-3-haiku") => ModelPricing { input_price: 0.25, output_price: 1.25 },
        _ => ModelPricing { input_price: 1.0, output_price: 2.0 }, // Default pricing
    };

    Ok(pricing)
}

fn extract_user_id(req: &HttpRequest) -> Result<Uuid> {
    req.headers()
        .get("X-User-Id")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
        .ok_or_else(|| AppError::Unauthorized)
}

fn calculate_period_bounds(period: &str, now: DateTime<Utc>) -> (DateTime<Utc>, DateTime<Utc>) {
    match period {
        "daily" => {
            let start = now.date_naive().and_hms_opt(0, 0, 0).unwrap().and_local_timezone(chrono::Utc).unwrap();
            let end = start + chrono::Duration::days(1);
            (start, end)
        },
        "weekly" => {
            let start = now.date_naive().and_hms_opt(0, 0, 0).unwrap().and_local_timezone(chrono::Utc).unwrap();
            let end = start + chrono::Duration::weeks(1);
            (start, end)
        },
        "monthly" => {
            let start = now.date_naive().and_hms_opt(0, 0, 0).unwrap().and_local_timezone(chrono::Utc).unwrap();
            let end = start + chrono::Duration::days(30);
            (start, end)
        },
        "yearly" => {
            let start = now.date_naive().and_hms_opt(0, 0, 0).unwrap().and_local_timezone(chrono::Utc).unwrap();
            let end = start + chrono::Duration::days(365);
            (start, end)
        },
        _ => {
            // Default to monthly
            let start = now.date_naive().and_hms_opt(0, 0, 0).unwrap().and_local_timezone(chrono::Utc).unwrap();
            let end = start + chrono::Duration::days(30);
            (start, end)
        }
    }
}

#[get("/costs/organization/{organization_id}")]
pub async fn get_organization_costs(
    pool: web::Data<PgPool>,
    organization_id: web::Path<Uuid>,
    query: web::Query<CostQuery>,
) -> Result<impl Responder> {
    let start_date = query.start_date.clone().unwrap_or_else(|| {
        chrono::Utc::now().checked_sub_signed(chrono::Duration::days(30)).unwrap().to_rfc3339()
    });

    let end_date = query.end_date.clone().unwrap_or_else(|| {
        chrono::Utc::now().to_rfc3339()
    });

    let costs = sqlx::query_as::<_, CostBreakdown>(
        r#"
        SELECT
            p.provider_name as provider,
            m.model_name as model,
            SUM(r.prompt_tokens) as total_tokens_in,
            SUM(r.completion_tokens) as total_tokens_out,
            SUM(r.total_cost) as total_cost,
            COUNT(*) as request_count
        FROM llm_requests r
        JOIN llm_models m ON r.model_id = m.id
        JOIN llm_providers p ON m.provider_id = p.id
        WHERE r.organization_id = $1
        AND r.timestamp BETWEEN $2::timestamptz AND $3::timestamptz
        GROUP BY p.provider_name, m.model_name
        ORDER BY total_cost DESC
        "#,
    )
    .bind(organization_id.as_ref())
    .bind(&start_date)
    .bind(&end_date)
    .fetch_all(pool.get_ref())
    .await?;

    let total_cost: f64 = costs.iter().map(|c| c.total_cost).sum();

    Ok(HttpResponse::Ok().json(ApiResponse::success(serde_json::json!({
        "organization_id": organization_id.as_ref(),
        "period": {
            "start": start_date,
            "end": end_date
        },
        "total_cost": total_cost,
        "breakdown": costs
    }))))
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(calculate_cost)
        .service(get_organization_costs)
        .service(get_team_costs)
        .service(get_user_costs)
        .service(create_budget)
        .service(list_budgets)
        .service(get_budget)
        .service(update_budget)
        .service(delete_budget)
        .service(forecast_costs)
        .service(generate_chargeback_report);
}
