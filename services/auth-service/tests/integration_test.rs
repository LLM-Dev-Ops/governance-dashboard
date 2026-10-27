use auth_service::config::Config;
use auth_service::handlers::auth::{LoginRequest, RegisterRequest};
use validator::Validate;

#[test]
fn login_requires_email_and_minimum_password_length() {
    let invalid_email = LoginRequest {
        email: "not-an-email".to_string(),
        password: "long-enough".to_string(),
    };
    assert!(invalid_email.validate().is_err());

    let short_password = LoginRequest {
        email: "person@example.com".to_string(),
        password: "short".to_string(),
    };
    assert!(short_password.validate().is_err());
}

#[test]
fn registration_accepts_a_valid_request_contract() {
    let request = RegisterRequest {
        email: "person@example.com".to_string(),
        password: "correct-horse".to_string(),
        name: "Person".to_string(),
    };
    assert!(request.validate().is_ok());
}

#[test]
fn default_auth_configuration_is_local_and_bounded() {
    let config = Config::default();

    assert_eq!(config.port, 8081);
    assert_eq!(config.redis_url, "redis://127.0.0.1:6379");
    assert_eq!(config.jwt_expiration, 3600);
    assert_eq!(config.refresh_token_expiration, 2_592_000);
}
