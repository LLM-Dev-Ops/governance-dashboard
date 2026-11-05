use actix_web::{http::StatusCode, test, web, App, HttpResponse};
use auth_service::middleware::rate_limit::RateLimitMiddleware;

#[actix_rt::test]
async fn rate_limit_middleware_preserves_downstream_response() {
    let app = test::init_service(
        App::new()
            .wrap(RateLimitMiddleware)
            .route("/probe", web::get().to(HttpResponse::NoContent)),
    )
    .await;
    let request = test::TestRequest::get().uri("/probe").to_request();

    assert_eq!(
        test::call_service(&app, request).await.status(),
        StatusCode::NO_CONTENT
    );
}
