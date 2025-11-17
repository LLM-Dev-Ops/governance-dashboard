use actix_web::{post, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct LoginRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 8))]
    pub password: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct RegisterRequest {
    #[validate(email)]
    pub email: String,
    #[validate(length(min = 8))]
    pub password: String,
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
    pub expires_in: i64,
}

#[post("/auth/login")]
async fn login(req: web::Json<LoginRequest>) -> impl Responder {
    // TODO: Implement login logic
    HttpResponse::NotImplemented().json(serde_json::json!({
        "message": "Login endpoint not yet implemented"
    }))
}

#[post("/auth/register")]
async fn register(req: web::Json<RegisterRequest>) -> impl Responder {
    // TODO: Implement registration logic
    HttpResponse::NotImplemented().json(serde_json::json!({
        "message": "Register endpoint not yet implemented"
    }))
}

#[post("/auth/refresh")]
async fn refresh_token() -> impl Responder {
    // TODO: Implement token refresh logic
    HttpResponse::NotImplemented().json(serde_json::json!({
        "message": "Refresh token endpoint not yet implemented"
    }))
}

#[post("/auth/logout")]
async fn logout() -> impl Responder {
    // TODO: Implement logout logic
    HttpResponse::NotImplemented().json(serde_json::json!({
        "message": "Logout endpoint not yet implemented"
    }))
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(login)
        .service(register)
        .service(refresh_token)
        .service(logout);
}
