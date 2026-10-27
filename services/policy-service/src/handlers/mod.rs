use actix_web::web;

pub mod health;
pub mod policies;

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1")
            .configure(health::configure)
            .configure(policies::configure),
    );
}
