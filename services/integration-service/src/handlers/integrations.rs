use actix_web::{get, post, web, HttpResponse, Responder, HttpRequest};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use llm_governance_common::{AppError, Result, ApiResponse};
use reqwest::Client;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Debug, Deserialize)]
pub struct ProxyRequest {
    pub provider: String,
    pub model: String,
    pub messages: Vec<Message>,
    pub temperature: Option<f32>,
    pub max_tokens: Option<i32>,
    pub stream: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
pub struct ProxyResponse {
    pub id: String,
    pub provider: String,
    pub model: String,
    pub choices: Vec<Choice>,
    pub usage: Usage,
    pub cost: f64,
}

#[derive(Debug, Serialize)]
pub struct Choice {
    pub message: Message,
    pub finish_reason: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct Usage {
    pub prompt_tokens: i32,
    pub completion_tokens: i32,
    pub total_tokens: i32,
}

// Circuit breaker state
#[derive(Debug, Clone)]
struct CircuitBreakerState {
    failures: i32,
    last_failure_time: Option<std::time::Instant>,
    state: CircuitState,
}

#[derive(Debug, Clone, PartialEq)]
enum CircuitState {
    Closed,  // Normal operation
    Open,    // Failing, reject requests
    HalfOpen, // Testing if service recovered
}

type CircuitBreakers = Arc<RwLock<HashMap<String, CircuitBreakerState>>>;

#[post("/integrations/proxy")]
pub async fn proxy_llm_request(
    pool: web::Data<PgPool>,
    circuit_breakers: web::Data<CircuitBreakers>,
    http_client: web::Data<Client>,
    req: web::Json<ProxyRequest>,
    http_req: HttpRequest,
) -> Result<impl Responder> {
    let user_id = extract_user_id_optional(&http_req);
    let team_id = extract_team_id_optional(&http_req);

    // Check circuit breaker
    let provider_key = format!("{}:{}", req.provider, req.model);
    if !check_circuit_breaker(&circuit_breakers, &provider_key).await {
        return Err(AppError::Internal("Service temporarily unavailable".to_string()));
    }

    // Check policies
    check_policies(pool.get_ref(), user_id, team_id, &req).await?;

    // Route to appropriate provider
    let start_time = std::time::Instant::now();
    let result = match req.provider.as_str() {
        "openai" => proxy_to_openai(&http_client, &req).await,
        "anthropic" => proxy_to_anthropic(&http_client, &req).await,
        "google" => proxy_to_google(&http_client, &req).await,
        "azure" => proxy_to_azure(&http_client, &req).await,
        "bedrock" => proxy_to_bedrock(&http_client, &req).await,
        _ => Err(AppError::BadRequest(format!("Unsupported provider: {}", req.provider))),
    };

    let latency_ms = start_time.elapsed().as_millis() as i32;

    match result {
        Ok(response) => {
            // Record success in circuit breaker
            record_success(&circuit_breakers, &provider_key).await;

            // Calculate cost
            let cost = calculate_cost(&req.provider, &req.model, response.usage.prompt_tokens, response.usage.completion_tokens);

            // Record metrics
            record_metrics(
                pool.get_ref(),
                user_id,
                team_id,
                &req.provider,
                &req.model,
                response.usage.prompt_tokens,
                response.usage.completion_tokens,
                latency_ms,
                cost,
                "success",
            ).await?;

            // Record audit log
            record_audit_log(
                pool.get_ref(),
                user_id,
                "LLM_REQUEST",
                &format!("{}:{}", req.provider, req.model),
                &response.id,
            ).await?;

            Ok(HttpResponse::Ok().json(ApiResponse::success(response)))
        }
        Err(e) => {
            // Record failure in circuit breaker
            record_failure(&circuit_breakers, &provider_key).await;

            // Record failed metrics
            record_metrics(
                pool.get_ref(),
                user_id,
                team_id,
                &req.provider,
                &req.model,
                0,
                0,
                latency_ms,
                0.0,
                "error",
            ).await?;

            Err(e)
        }
    }
}

#[get("/integrations/providers")]
pub async fn list_providers() -> Result<impl Responder> {
    let providers = vec![
        serde_json::json!({
            "name": "openai",
            "models": ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
            "status": "active"
        }),
        serde_json::json!({
            "name": "anthropic",
            "models": ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
            "status": "active"
        }),
        serde_json::json!({
            "name": "google",
            "models": ["gemini-pro", "gemini-pro-vision"],
            "status": "active"
        }),
        serde_json::json!({
            "name": "azure",
            "models": ["gpt-4", "gpt-35-turbo"],
            "status": "active"
        }),
        serde_json::json!({
            "name": "bedrock",
            "models": ["claude-v2", "titan-text"],
            "status": "active"
        }),
    ];

    Ok(HttpResponse::Ok().json(ApiResponse::success(providers)))
}

#[get("/integrations/health")]
pub async fn check_provider_health(
    circuit_breakers: web::Data<CircuitBreakers>,
) -> Result<impl Responder> {
    let breakers = circuit_breakers.read().await;

    let mut health_status = HashMap::new();
    for (provider, state) in breakers.iter() {
        health_status.insert(provider.clone(), serde_json::json!({
            "state": format!("{:?}", state.state),
            "failures": state.failures
        }));
    }

    Ok(HttpResponse::Ok().json(ApiResponse::success(health_status)))
}

// Provider-specific implementations

async fn proxy_to_openai(client: &Client, req: &ProxyRequest) -> Result<ProxyResponse> {
    let api_key = std::env::var("OPENAI_API_KEY")
        .map_err(|_| AppError::Internal("OpenAI API key not configured".to_string()))?;

    #[derive(Serialize)]
    struct OpenAIRequest {
        model: String,
        messages: Vec<Message>,
        #[serde(skip_serializing_if = "Option::is_none")]
        temperature: Option<f32>,
        #[serde(skip_serializing_if = "Option::is_none")]
        max_tokens: Option<i32>,
    }

    #[derive(Deserialize)]
    struct OpenAIResponse {
        id: String,
        choices: Vec<OpenAIChoice>,
        usage: OpenAIUsage,
    }

    #[derive(Deserialize)]
    struct OpenAIChoice {
        message: Message,
        finish_reason: Option<String>,
    }

    #[derive(Deserialize)]
    struct OpenAIUsage {
        prompt_tokens: i32,
        completion_tokens: i32,
        total_tokens: i32,
    }

    let openai_req = OpenAIRequest {
        model: req.model.clone(),
        messages: req.messages.clone(),
        temperature: req.temperature,
        max_tokens: req.max_tokens,
    };

    let response = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&openai_req)
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("OpenAI API error: {}", e)))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(AppError::Internal(format!("OpenAI API error: {}", error_text)));
    }

    let openai_response: OpenAIResponse = response
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("Failed to parse OpenAI response: {}", e)))?;

    Ok(ProxyResponse {
        id: openai_response.id,
        provider: "openai".to_string(),
        model: req.model.clone(),
        choices: openai_response.choices.into_iter().map(|c| Choice {
            message: c.message,
            finish_reason: c.finish_reason,
        }).collect(),
        usage: Usage {
            prompt_tokens: openai_response.usage.prompt_tokens,
            completion_tokens: openai_response.usage.completion_tokens,
            total_tokens: openai_response.usage.total_tokens,
        },
        cost: 0.0, // Will be calculated separately
    })
}

async fn proxy_to_anthropic(client: &Client, req: &ProxyRequest) -> Result<ProxyResponse> {
    let api_key = std::env::var("ANTHROPIC_API_KEY")
        .map_err(|_| AppError::Internal("Anthropic API key not configured".to_string()))?;

    #[derive(Serialize)]
    struct AnthropicRequest {
        model: String,
        messages: Vec<Message>,
        max_tokens: i32,
        #[serde(skip_serializing_if = "Option::is_none")]
        temperature: Option<f32>,
    }

    #[derive(Deserialize)]
    struct AnthropicResponse {
        id: String,
        content: Vec<Content>,
        usage: AnthropicUsage,
    }

    #[derive(Deserialize)]
    struct Content {
        text: String,
    }

    #[derive(Deserialize)]
    struct AnthropicUsage {
        input_tokens: i32,
        output_tokens: i32,
    }

    let anthropic_req = AnthropicRequest {
        model: req.model.clone(),
        messages: req.messages.clone(),
        max_tokens: req.max_tokens.unwrap_or(4096),
        temperature: req.temperature,
    };

    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("Content-Type", "application/json")
        .json(&anthropic_req)
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("Anthropic API error: {}", e)))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(AppError::Internal(format!("Anthropic API error: {}", error_text)));
    }

    let anthropic_response: AnthropicResponse = response
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("Failed to parse Anthropic response: {}", e)))?;

    Ok(ProxyResponse {
        id: anthropic_response.id,
        provider: "anthropic".to_string(),
        model: req.model.clone(),
        choices: vec![Choice {
            message: Message {
                role: "assistant".to_string(),
                content: anthropic_response.content.first()
                    .map(|c| c.text.clone())
                    .unwrap_or_default(),
            },
            finish_reason: Some("stop".to_string()),
        }],
        usage: Usage {
            prompt_tokens: anthropic_response.usage.input_tokens,
            completion_tokens: anthropic_response.usage.output_tokens,
            total_tokens: anthropic_response.usage.input_tokens + anthropic_response.usage.output_tokens,
        },
        cost: 0.0,
    })
}

async fn proxy_to_google(_client: &Client, _req: &ProxyRequest) -> Result<ProxyResponse> {
    // Simplified - would implement actual Google Gemini API integration
    Err(AppError::Internal("Google provider not yet implemented".to_string()))
}

async fn proxy_to_azure(_client: &Client, _req: &ProxyRequest) -> Result<ProxyResponse> {
    // Simplified - would implement actual Azure OpenAI API integration
    Err(AppError::Internal("Azure provider not yet implemented".to_string()))
}

async fn proxy_to_bedrock(_client: &Client, _req: &ProxyRequest) -> Result<ProxyResponse> {
    // Simplified - would implement actual AWS Bedrock API integration
    Err(AppError::Internal("Bedrock provider not yet implemented".to_string()))
}

// Helper functions

async fn check_policies(
    pool: &PgPool,
    user_id: Option<Uuid>,
    team_id: Option<Uuid>,
    req: &ProxyRequest,
) -> Result<()> {
    // Get active policies for user/team
    // For simplicity, just checking token limits here
    if let Some(max_tokens) = req.max_tokens {
        if max_tokens > 100000 {
            return Err(AppError::BadRequest("Token limit exceeded".to_string()));
        }
    }

    Ok(())
}

async fn check_circuit_breaker(breakers: &CircuitBreakers, provider_key: &str) -> bool {
    let mut breakers_map = breakers.write().await;
    let state = breakers_map.entry(provider_key.to_string())
        .or_insert(CircuitBreakerState {
            failures: 0,
            last_failure_time: None,
            state: CircuitState::Closed,
        });

    match state.state {
        CircuitState::Closed => true,
        CircuitState::Open => {
            // Check if timeout has passed (30 seconds)
            if let Some(last_failure) = state.last_failure_time {
                if last_failure.elapsed().as_secs() > 30 {
                    state.state = CircuitState::HalfOpen;
                    return true;
                }
            }
            false
        }
        CircuitState::HalfOpen => true,
    }
}

async fn record_success(breakers: &CircuitBreakers, provider_key: &str) {
    let mut breakers_map = breakers.write().await;
    if let Some(state) = breakers_map.get_mut(provider_key) {
        state.failures = 0;
        state.state = CircuitState::Closed;
        state.last_failure_time = None;
    }
}

async fn record_failure(breakers: &CircuitBreakers, provider_key: &str) {
    let mut breakers_map = breakers.write().await;
    let state = breakers_map.entry(provider_key.to_string())
        .or_insert(CircuitBreakerState {
            failures: 0,
            last_failure_time: None,
            state: CircuitState::Closed,
        });

    state.failures += 1;
    state.last_failure_time = Some(std::time::Instant::now());

    // Open circuit after 5 failures
    if state.failures >= 5 {
        state.state = CircuitState::Open;
    }
}

fn calculate_cost(provider: &str, model: &str, prompt_tokens: i32, completion_tokens: i32) -> f64 {
    let (input_price, output_price) = match (provider, model) {
        ("openai", "gpt-4") => (30.0, 60.0),
        ("openai", "gpt-4-turbo") => (10.0, 30.0),
        ("openai", "gpt-3.5-turbo") => (0.5, 1.5),
        ("anthropic", "claude-3-opus") => (15.0, 75.0),
        ("anthropic", "claude-3-sonnet") => (3.0, 15.0),
        ("anthropic", "claude-3-haiku") => (0.25, 1.25),
        _ => (1.0, 2.0),
    };

    let input_cost = (prompt_tokens as f64 / 1_000_000.0) * input_price;
    let output_cost = (completion_tokens as f64 / 1_000_000.0) * output_price;

    input_cost + output_cost
}

async fn record_metrics(
    pool: &PgPool,
    user_id: Option<Uuid>,
    team_id: Option<Uuid>,
    provider: &str,
    model: &str,
    tokens_in: i32,
    tokens_out: i32,
    latency_ms: i32,
    cost: f64,
    status: &str,
) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO llm_metrics (
            time, provider, model, user_id, team_id,
            tokens_in, tokens_out, latency_ms, cost, status
        )
        VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9)
        "#,
    )
    .bind(provider)
    .bind(model)
    .bind(user_id)
    .bind(team_id)
    .bind(tokens_in)
    .bind(tokens_out)
    .bind(latency_ms)
    .bind(cost)
    .bind(status)
    .execute(pool)
    .await?;

    Ok(())
}

async fn record_audit_log(
    pool: &PgPool,
    user_id: Option<Uuid>,
    action: &str,
    resource_type: &str,
    resource_id: &str,
) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, checksum)
        VALUES ($1, $2, $3, $4, '{}', '')
        "#,
    )
    .bind(user_id)
    .bind(action)
    .bind(resource_type)
    .bind(resource_id)
    .execute(pool)
    .await?;

    Ok(())
}

fn extract_user_id_optional(req: &HttpRequest) -> Option<Uuid> {
    req.headers()
        .get("X-User-Id")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
}

fn extract_team_id_optional(req: &HttpRequest) -> Option<Uuid> {
    req.headers()
        .get("X-Team-Id")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(proxy_llm_request)
        .service(list_providers)
        .service(check_provider_health);
}
