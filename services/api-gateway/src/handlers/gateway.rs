use actix_web::{web, HttpRequest, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use common::{AppError, Result};
use reqwest::Client;
use std::collections::HashMap;

#[derive(Debug, Deserialize)]
pub struct ServiceConfig {
    pub auth_service_url: String,
    pub user_service_url: String,
    pub policy_service_url: String,
    pub audit_service_url: String,
    pub metrics_service_url: String,
    pub cost_service_url: String,
    pub integration_service_url: String,
}

pub async fn proxy_request(
    config: web::Data<ServiceConfig>,
    client: web::Data<Client>,
    req: HttpRequest,
    body: web::Bytes,
) -> Result<impl Responder> {
    let path = req.path();
    let method = req.method().clone();

    // Route to appropriate service
    let target_url = route_to_service(&config, path)?;

    // Build proxied request
    let mut request_builder = match method.as_str() {
        "GET" => client.get(&target_url),
        "POST" => client.post(&target_url),
        "PUT" => client.put(&target_url),
        "DELETE" => client.delete(&target_url),
        "PATCH" => client.patch(&target_url),
        _ => return Err(AppError::BadRequest("Unsupported HTTP method".to_string())),
    };

    // Forward headers (except Host)
    for (name, value) in req.headers() {
        if name != "host" {
            request_builder = request_builder.header(name, value);
        }
    }

    // Send request
    let response = request_builder
        .body(body.to_vec())
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("Proxy error: {}", e)))?;

    // Build response
    let status = response.status();
    let headers = response.headers().clone();
    let body = response.bytes().await
        .map_err(|e| AppError::Internal(format!("Failed to read response: {}", e)))?;

    let mut http_response = HttpResponse::build(status);
    for (name, value) in headers.iter() {
        http_response.insert_header((name, value));
    }

    Ok(http_response.body(body))
}

fn route_to_service(config: &ServiceConfig, path: &str) -> Result<String> {
    let base_url = if path.starts_with("/api/v1/auth") {
        &config.auth_service_url
    } else if path.starts_with("/api/v1/users") || path.starts_with("/api/v1/roles") {
        &config.user_service_url
    } else if path.starts_with("/api/v1/policies") {
        &config.policy_service_url
    } else if path.starts_with("/api/v1/audit") {
        &config.audit_service_url
    } else if path.starts_with("/api/v1/metrics") {
        &config.metrics_service_url
    } else if path.starts_with("/api/v1/costs") || path.starts_with("/api/v1/budgets") {
        &config.cost_service_url
    } else if path.starts_with("/api/v1/integrations") || path.starts_with("/api/v1/llm") {
        &config.integration_service_url
    } else {
        return Err(AppError::NotFound("Route not found".to_string()));
    };

    Ok(format!("{}{}", base_url, path))
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.default_service(web::route().to(proxy_request));
}
