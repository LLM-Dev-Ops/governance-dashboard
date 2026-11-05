use auth_service::services::jwt_service::JwtService;
use uuid::Uuid;

#[test]
fn generated_access_token_round_trips_identity() {
    let service = JwtService::new("test-secret", 300);
    let user_id = Uuid::new_v4();
    let token = service
        .generate_token(user_id, "person@example.com")
        .expect("token generation succeeds");
    let claims = service.verify_token(&token).expect("token verifies");

    assert_eq!(claims.user_id, user_id);
    assert_eq!(claims.sub, user_id.to_string());
    assert_eq!(claims.email, "person@example.com");
    assert!(claims.exp > claims.iat);
}

#[test]
fn access_token_rejects_a_different_signing_secret() {
    let issuer = JwtService::new("issuer-secret", 300);
    let verifier = JwtService::new("different-secret", 300);
    let token = issuer
        .generate_token(Uuid::new_v4(), "person@example.com")
        .expect("token generation succeeds");

    assert!(verifier.verify_token(&token).is_err());
}

#[test]
fn refresh_tokens_are_unique_uuids() {
    let service = JwtService::new("test-secret", 300);
    let first = service.generate_refresh_token();
    let second = service.generate_refresh_token();

    assert_ne!(first, second);
    assert!(Uuid::parse_str(&first).is_ok());
    assert!(Uuid::parse_str(&second).is_ok());
}
