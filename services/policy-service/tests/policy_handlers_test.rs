use serde_json::{json, Value};

fn valid_policy(name: &str, rules: &Value, enforcement_level: &str) -> bool {
    (3..=255).contains(&name.len())
        && rules.is_object()
        && ["advisory", "warning", "blocking"].contains(&enforcement_level)
}

#[cfg(test)]
mod policy_handler_tests {
    use super::*;

    #[test]
    fn test_create_policy_contract() {
        assert!(valid_policy(
            "Require approval",
            &json!({"approval_required": true}),
            "blocking",
        ));
    }

    #[test]
    fn test_policy_name_boundary() {
        assert!(!valid_policy("ab", &json!({}), "advisory"));
        assert!(valid_policy("abc", &json!({}), "advisory"));
    }

    #[test]
    fn test_policy_rules_must_be_an_object() {
        assert!(!valid_policy("Policy", &json!(["rule"]), "warning"));
    }

    #[test]
    fn test_enforcement_level_boundary() {
        assert!(!valid_policy("Policy", &json!({}), "unknown"));
    }

    #[test]
    fn test_supported_enforcement_levels() {
        for level in ["advisory", "warning", "blocking"] {
            assert!(valid_policy("Policy", &json!({}), level));
        }
    }

    #[test]
    fn test_policy_payload_round_trip() {
        let payload = json!({
            "name": "Policy",
            "rules": {"region": "ca-central1"},
            "enforcement_level": "warning"
        });
        let encoded = serde_json::to_string(&payload).expect("policy payload should serialize");
        let decoded: Value =
            serde_json::from_str(&encoded).expect("policy payload should deserialize");
        assert_eq!(decoded, payload);
    }
}
