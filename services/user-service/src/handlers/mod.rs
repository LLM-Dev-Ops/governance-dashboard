use actix_web::web;

pub mod health;
pub mod users;
pub mod organizations;

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(web::scope("/api/v1")
        .configure(health::configure)
        .configure(users::configure)
        .configure(organizations::configure)
    );
}
