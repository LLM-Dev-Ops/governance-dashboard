use actix_web::{get, post, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct OAuthCallbackRequest {
    pub code: String,
    pub state: String,
}

#[get("/oauth/google")]
async fn google_oauth_init() -> impl Responder {
    // TODO: Implement Google OAuth initialization
    HttpResponse::NotImplemented().json(serde_json::json!({
        "message": "Google OAuth init endpoint not yet implemented"
    }))
}

#[post("/oauth/google/callback")]
async fn google_oauth_callback(req: web::Json<OAuthCallbackRequest>) -> impl Responder {
    // TODO: Implement Google OAuth callback
    HttpResponse::NotImplemented().json(serde_json::json!({
        "message": "Google OAuth callback endpoint not yet implemented"
    }))
}

#[get("/oauth/github")]
async fn github_oauth_init() -> impl Responder {
    // TODO: Implement GitHub OAuth initialization
    HttpResponse::NotImplemented().json(serde_json::json!({
        "message": "GitHub OAuth init endpoint not yet implemented"
    }))
}

#[post("/oauth/github/callback")]
async fn github_oauth_callback(req: web::Json<OAuthCallbackRequest>) -> impl Responder {
    // TODO: Implement GitHub OAuth callback
    HttpResponse::NotImplemented().json(serde_json::json!({
        "message": "GitHub OAuth callback endpoint not yet implemented"
    }))
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(google_oauth_init)
        .service(google_oauth_callback)
        .service(github_oauth_init)
        .service(github_oauth_callback);
}
