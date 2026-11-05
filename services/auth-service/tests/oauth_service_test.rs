use actix_web::{http::StatusCode, test, App};
use auth_service::handlers::oauth;

#[actix_rt::test]
async fn oauth_routes_are_explicitly_unimplemented() {
    let app = test::init_service(App::new().configure(oauth::configure)).await;

    for uri in ["/oauth/google", "/oauth/github"] {
        let request = test::TestRequest::get().uri(uri).to_request();
        assert_eq!(
            test::call_service(&app, request).await.status(),
            StatusCode::NOT_IMPLEMENTED
        );
    }

    let callback = test::TestRequest::post()
        .uri("/oauth/google/callback")
        .set_json(serde_json::json!({"code": "code", "state": "state"}))
        .to_request();
    assert_eq!(
        test::call_service(&app, callback).await.status(),
        StatusCode::NOT_IMPLEMENTED
    );
}

#[actix_rt::test]
async fn oauth_callback_requires_code_and_state() {
    let app = test::init_service(App::new().configure(oauth::configure)).await;
    let request = test::TestRequest::post()
        .uri("/oauth/github/callback")
        .set_json(serde_json::json!({"code": "code"}))
        .to_request();

    assert_eq!(
        test::call_service(&app, request).await.status(),
        StatusCode::BAD_REQUEST
    );
}
