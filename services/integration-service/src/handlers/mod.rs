use actix_web::web;

pub mod health;
pub mod integrations;
pub mod providers;

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(web::scope("/api/v1")
        .configure(health::configure)
        .configure(integrations::configure)
        .configure(providers::configure)
    );
}
