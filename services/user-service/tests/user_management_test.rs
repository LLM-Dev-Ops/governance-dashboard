use user_service::handlers::users::{
    normalize_pagination, CreateUserRequest, PaginationQuery, UpdateUserRequest,
};
use uuid::Uuid;
use validator::Validate;

#[test]
fn accepts_valid_user_creation_input() {
    let request = CreateUserRequest {
        email: "ada@example.com".to_string(),
        name: "Ada Lovelace".to_string(),
        role_ids: vec![Uuid::new_v4()],
    };

    assert!(request.validate().is_ok());
    assert_eq!(request.role_ids.len(), 1);
}

#[test]
fn rejects_invalid_email_addresses() {
    let request = CreateUserRequest {
        email: "not-an-email".to_string(),
        name: "Ada Lovelace".to_string(),
        role_ids: Vec::new(),
    };

    assert!(request.validate().is_err());
}

#[test]
fn rejects_too_short_user_names() {
    let request = CreateUserRequest {
        email: "ada@example.com".to_string(),
        name: "A".to_string(),
        role_ids: Vec::new(),
    };

    assert!(request.validate().is_err());
}

#[test]
fn validates_optional_profile_names_when_present() {
    let request = UpdateUserRequest {
        name: Some("A".to_string()),
        status: None,
        role_ids: None,
    };

    assert!(request.validate().is_err());
}

#[test]
fn pagination_uses_safe_defaults() {
    let query = PaginationQuery {
        limit: None,
        offset: None,
    };
    assert_eq!(normalize_pagination(&query), (20, 0));
}

#[test]
fn pagination_caps_requested_page_size() {
    let query = PaginationQuery {
        limit: Some(1_000),
        offset: Some(40),
    };
    assert_eq!(normalize_pagination(&query), (100, 40));
}
