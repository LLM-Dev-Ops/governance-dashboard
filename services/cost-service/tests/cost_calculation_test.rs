use actix_web::{http::StatusCode, test, web, App};
use serde_json::{json, Value};
use sqlx::postgres::PgPoolOptions;

async fn calculate(payload: Value) -> (StatusCode, Value) {
    let pool = PgPoolOptions::new()
        .connect_lazy("postgresql://test:test@localhost/test")
        .expect("test database URL must parse");

    let app = test::init_service(
        App::new()
            .app_data(web::Data::new(pool))
            .configure(cost_service::handlers::configure),
    )
    .await;

    let request = test::TestRequest::post()
        .uri("/api/v1/costs/calculate")
        .set_json(payload)
        .to_request();
    let response = test::call_service(&app, request).await;
    let status = response.status();
    let body: Value = test::read_body_json(response).await;
    (status, body)
}

fn assert_close(actual: f64, expected: f64) {
    assert!(
        (actual - expected).abs() < 1e-9,
        "expected {expected}, got {actual}"
    );
}

#[actix_web::test]
async fn calculates_gpt4_token_costs() {
    let (status, body) = calculate(json!({
        "provider": "openai",
        "model": "gpt-4",
        "tokens_in": 1_000,
        "tokens_out": 500
    }))
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_close(body["data"]["input_cost"].as_f64().unwrap(), 0.03);
    assert_close(body["data"]["output_cost"].as_f64().unwrap(), 0.03);
    assert_close(body["data"]["total_cost"].as_f64().unwrap(), 0.06);
}

#[actix_web::test]
async fn calculates_claude_token_costs() {
    let (status, body) = calculate(json!({
        "provider": "anthropic",
        "model": "claude-3-opus",
        "tokens_in": 1_000_000,
        "tokens_out": 1_000_000
    }))
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_close(body["data"]["total_cost"].as_f64().unwrap(), 90.0);
}

#[actix_web::test]
async fn zero_tokens_have_zero_cost() {
    let (status, body) = calculate(json!({
        "provider": "openai",
        "model": "gpt-4",
        "tokens_in": 0,
        "tokens_out": 0
    }))
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_close(body["data"]["total_cost"].as_f64().unwrap(), 0.0);
}

#[actix_web::test]
async fn rejects_negative_token_counts() {
    let (status, _) = calculate(json!({
        "provider": "openai",
        "model": "gpt-4",
        "tokens_in": -1,
        "tokens_out": 0
    }))
    .await;

    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[actix_web::test]
async fn applies_documented_fallback_pricing() {
    let (status, body) = calculate(json!({
        "provider": "custom",
        "model": "private-model",
        "tokens_in": 1_000_000,
        "tokens_out": 1_000_000
    }))
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_close(body["data"]["total_cost"].as_f64().unwrap(), 3.0);
}

#[actix_web::test]
async fn large_counts_scale_linearly() {
    let (status, body) = calculate(json!({
        "provider": "openai",
        "model": "gpt-4",
        "tokens_in": 10_000_000,
        "tokens_out": 5_000_000
    }))
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_close(body["data"]["total_cost"].as_f64().unwrap(), 600.0);
}
