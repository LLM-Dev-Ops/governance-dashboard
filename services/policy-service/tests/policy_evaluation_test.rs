use chrono::Utc;
use policy_service::handlers::policies::{
    evaluate_policy_rules, is_valid_enforcement_level, is_valid_policy_type, PolicyResponse,
};
use serde_json::{json, Value};
use uuid::Uuid;

fn policy(policy_type: &str, rules: Value) -> PolicyResponse {
    PolicyResponse {
        id: Uuid::new_v4(),
        name: "Boundary policy".to_string(),
        description: None,
        policy_type: policy_type.to_string(),
        rules,
        enforcement_level: "strict".to_string(),
        status: "active".to_string(),
        version: 1,
        created_at: Utc::now(),
        updated_at: Utc::now(),
        created_by: None,
    }
}

#[test]
fn rate_limit_policy_rejects_excess_requests() {
    let result = evaluate_policy_rules(
        &policy("rate_limit", json!({"max_requests_per_minute": 10})),
        &json!({"requests_per_minute": 11}),
    )
    .unwrap();

    assert!(!result.passed);
    assert_eq!(
        result.violations[0].rule_violated,
        "max_requests_per_minute"
    );
}

#[test]
fn rate_limit_policy_accepts_boundary_value() {
    let result = evaluate_policy_rules(
        &policy("rate_limit", json!({"max_requests_per_minute": 10})),
        &json!({"requests_per_minute": 10}),
    )
    .unwrap();

    assert!(result.passed);
    assert!(result.violations.is_empty());
}

#[test]
fn cost_policy_rejects_excess_cost() {
    let result = evaluate_policy_rules(
        &policy("cost", json!({"max_cost_per_request": 0.25})),
        &json!({"cost": 0.26}),
    )
    .unwrap();

    assert!(!result.passed);
    assert_eq!(result.violations[0].severity, "high");
}

#[test]
fn usage_policy_rejects_excess_tokens() {
    let result = evaluate_policy_rules(
        &policy("usage", json!({"max_tokens_per_request": 1000})),
        &json!({"tokens": 1001}),
    )
    .unwrap();

    assert!(!result.passed);
    assert_eq!(result.violations[0].severity, "medium");
}

#[test]
fn content_filter_checks_every_blocked_pattern() {
    let result = evaluate_policy_rules(
        &policy(
            "content_filter",
            json!({"blocked_patterns": ["secret", "credential"]}),
        ),
        &json!({"content": "do not disclose a secret credential"}),
    )
    .unwrap();

    assert!(!result.passed);
    assert_eq!(result.violations.len(), 2);
}

#[test]
fn validates_policy_type_contract() {
    for policy_type in [
        "cost",
        "security",
        "compliance",
        "usage",
        "rate_limit",
        "content_filter",
    ] {
        assert!(is_valid_policy_type(policy_type), "{policy_type}");
    }
    assert!(!is_valid_policy_type("unknown"));
}

#[test]
fn validates_enforcement_level_contract() {
    for level in ["strict", "warning", "monitor"] {
        assert!(is_valid_enforcement_level(level), "{level}");
    }
    assert!(!is_valid_enforcement_level("disabled"));
}
