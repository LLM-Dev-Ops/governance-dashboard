use chrono::Utc;
use policy_service::handlers::policies::{
    evaluate_policy_rules, is_valid_enforcement_level, PolicyResponse,
};
use serde_json::json;
use uuid::Uuid;

fn policy(policy_type: &str, rules: serde_json::Value) -> PolicyResponse {
    PolicyResponse {
        id: Uuid::new_v4(),
        name: "contract policy".to_string(),
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
fn enforcement_levels_reject_unknown_modes() {
    for level in ["strict", "warning", "monitor"] {
        assert!(is_valid_enforcement_level(level));
    }
    assert!(!is_valid_enforcement_level("bypass"));
}

#[test]
fn cost_and_rate_limits_block_excessive_requests() {
    let cost = evaluate_policy_rules(
        &policy("cost", json!({"max_cost_per_request": 0.5})),
        &json!({"cost": 0.75}),
    )
    .expect("cost evaluation succeeds");
    assert!(!cost.passed);
    assert_eq!(cost.violations[0].rule_violated, "max_cost_per_request");

    let rate = evaluate_policy_rules(
        &policy("rate_limit", json!({"max_requests_per_minute": 10})),
        &json!({"requests_per_minute": 11}),
    )
    .expect("rate evaluation succeeds");
    assert!(!rate.passed);
    assert_eq!(
        rate.violations[0].rule_violated,
        "max_requests_per_minute"
    );
}

#[test]
fn usage_and_content_policies_preserve_safe_requests() {
    let usage = evaluate_policy_rules(
        &policy("usage", json!({"max_tokens_per_request": 500})),
        &json!({"tokens": 499}),
    )
    .expect("usage evaluation succeeds");
    assert!(usage.passed);
    assert!(usage.violations.is_empty());

    let content = evaluate_policy_rules(
        &policy("content_filter", json!({"blocked_patterns": ["secret"]})),
        &json!({"content": "public documentation"}),
    )
    .expect("content evaluation succeeds");
    assert!(content.passed);
    assert!(content.violations.is_empty());
}

#[test]
fn content_filter_reports_each_matching_pattern() {
    let result = evaluate_policy_rules(
        &policy(
            "content_filter",
            json!({"blocked_patterns": ["secret", "token"]}),
        ),
        &json!({"content": "secret token"}),
    )
    .expect("content evaluation succeeds");
    assert!(!result.passed);
    assert_eq!(result.violations.len(), 2);
}
