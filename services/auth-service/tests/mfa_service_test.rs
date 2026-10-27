use actix_web::{http::StatusCode, test, App};
use auth_service::handlers::mfa;

#[actix_rt::test]
async fn mfa_endpoints_report_unimplemented_instead_of_succeeding() {
    let app = test::init_service(App::new().configure(mfa::configure)).await;

    let enable = test::TestRequest::post()
        .uri("/mfa/enable")
        .set_json(serde_json::json!({"user_id": "user-1"}))
        .to_request();
    assert_eq!(
        test::call_service(&app, enable).await.status(),
        StatusCode::NOT_IMPLEMENTED
    );

    let verify = test::TestRequest::post()
        .uri("/mfa/verify")
        .set_json(serde_json::json!({"user_id": "user-1", "token": "123456"}))
        .to_request();
    assert_eq!(
        test::call_service(&app, verify).await.status(),
        StatusCode::NOT_IMPLEMENTED
    );
}

#[actix_rt::test]
async fn mfa_verify_rejects_an_incomplete_request() {
    let app = test::init_service(App::new().configure(mfa::configure)).await;
    let request = test::TestRequest::post()
        .uri("/mfa/verify")
        .set_json(serde_json::json!({"user_id": "user-1"}))
        .to_request();

    assert_eq!(
        test::call_service(&app, request).await.status(),
        StatusCode::BAD_REQUEST
    );
}
