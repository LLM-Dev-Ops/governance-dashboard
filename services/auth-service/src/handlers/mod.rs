use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};

pub mod auth;
pub mod health;
pub mod mfa;
pub mod oauth;

#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: String,
    pub message: String,
}

impl ErrorResponse {
    pub fn new(error: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            error: error.into(),
            message: message.into(),
        }
    }
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1")
            .configure(health::configure)
            .configure(auth::configure)
            .configure(mfa::configure)
            .configure(oauth::configure),
    );
}
