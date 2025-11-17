use actix_web::{get, post, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct EnableMfaRequest {
    pub user_id: String,
}

#[derive(Debug, Serialize)]
pub struct EnableMfaResponse {
    pub secret: String,
    pub qr_code: String,
}

#[derive(Debug, Deserialize)]
pub struct VerifyMfaRequest {
    pub user_id: String,
    pub token: String,
}

#[post("/mfa/enable")]
async fn enable_mfa(req: web::Json<EnableMfaRequest>) -> impl Responder {
    // TODO: Implement MFA enablement
    HttpResponse::NotImplemented().json(serde_json::json!({
        "message": "MFA enable endpoint not yet implemented"
    }))
}

#[post("/mfa/verify")]
async fn verify_mfa(req: web::Json<VerifyMfaRequest>) -> impl Responder {
    // TODO: Implement MFA verification
    HttpResponse::NotImplemented().json(serde_json::json!({
        "message": "MFA verify endpoint not yet implemented"
    }))
}

#[post("/mfa/disable")]
async fn disable_mfa() -> impl Responder {
    // TODO: Implement MFA disablement
    HttpResponse::NotImplemented().json(serde_json::json!({
        "message": "MFA disable endpoint not yet implemented"
    }))
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(enable_mfa)
        .service(verify_mfa)
        .service(disable_mfa);
}
