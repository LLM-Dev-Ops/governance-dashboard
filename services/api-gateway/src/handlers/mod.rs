use actix_web::web;

pub mod health;

pub fn configure(cfg: &mut web::ServiceConfig) {
    // Keep the versioned route for compatibility while exposing the conventional
    // unversioned probe used by the container health check.
    cfg.configure(health::configure)
        .service(web::scope("/api/v1").configure(health::configure));
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{http::StatusCode, test, App};

    #[actix_web::test]
    async fn health_is_available_at_probe_and_legacy_paths() {
        let app = test::init_service(App::new().configure(configure)).await;

        for path in ["/health", "/api/v1/health"] {
            let response = test::call_service(
                &app,
                test::TestRequest::get().uri(path).to_request(),
            )
            .await;
            assert_eq!(response.status(), StatusCode::OK, "{path}");
        }
    }
}
