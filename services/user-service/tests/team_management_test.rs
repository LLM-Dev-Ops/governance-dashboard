use user_service::handlers::organizations::{CreateOrganizationRequest, CreateTeamRequest};
use validator::Validate;

#[test]
fn team_name_must_not_be_empty() {
    let request = CreateTeamRequest {
        name: String::new(),
        description: None,
        settings: None,
    };
    assert!(request.validate().is_err());
}

#[test]
fn team_name_accepts_bounded_values() {
    let request = CreateTeamRequest {
        name: "platform".to_string(),
        description: Some("governance operators".to_string()),
        settings: Some(serde_json::json!({"alerts": true})),
    };
    assert!(request.validate().is_ok());
}

#[test]
fn organization_slug_accepts_lowercase_url_safe_values() {
    let request = CreateOrganizationRequest {
        name: "Platform".to_string(),
        slug: "platform-42".to_string(),
        description: None,
        settings: None,
    };
    assert!(request.validate().is_ok());
}

#[test]
fn organization_slug_rejects_ambiguous_values() {
    for slug in ["Platform", "platform_42", "platform 42"] {
        let request = CreateOrganizationRequest {
            name: "Platform".to_string(),
            slug: slug.to_string(),
            description: None,
            settings: None,
        };
        assert!(request.validate().is_err(), "accepted invalid slug: {slug}");
    }
}
