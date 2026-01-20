use actix_web::web;

pub mod health;
pub mod audit;
pub mod governance;
pub mod change_impact;

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/v1")
            .configure(health::configure)
            .configure(audit::configure)
            .configure(governance::configure)
            .configure(change_impact::configure)
    );
}
