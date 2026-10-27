use chrono::{Duration, TimeZone, Utc};
use cost_service::handlers::costs::{calculate_period_bounds, CreateBudgetRequest};
use uuid::Uuid;
use validator::Validate;

fn budget(amount: f64) -> CreateBudgetRequest {
    CreateBudgetRequest {
        name: "Platform budget".to_string(),
        organization_id: Uuid::new_v4(),
        team_id: None,
        user_id: None,
        amount,
        period: "monthly".to_string(),
        alert_threshold_percentage: Some(80),
        hard_limit: Some(true),
    }
}

#[test]
fn accepts_positive_budget_amounts() {
    assert!(budget(0.01).validate().is_ok());
}

#[test]
fn rejects_zero_budget_amounts() {
    assert!(budget(0.0).validate().is_err());
}

#[test]
fn preserves_hard_limit_and_threshold_contract() {
    let request = budget(500.0);
    assert_eq!(request.alert_threshold_percentage, Some(80));
    assert_eq!(request.hard_limit, Some(true));
}

#[test]
fn computes_daily_budget_window() {
    let now = Utc.with_ymd_and_hms(2026, 10, 27, 13, 45, 0).unwrap();
    let (start, end) = calculate_period_bounds("daily", now);
    assert_eq!(end - start, Duration::days(1));
    assert_eq!(start.hour(), 0);
}

#[test]
fn computes_monthly_budget_window() {
    let now = Utc.with_ymd_and_hms(2026, 10, 27, 13, 45, 0).unwrap();
    let (start, end) = calculate_period_bounds("monthly", now);
    assert_eq!(end - start, Duration::days(30));
}

use chrono::Timelike;
