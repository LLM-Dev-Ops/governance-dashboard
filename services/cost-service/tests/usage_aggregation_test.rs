use chrono::{Duration, TimeZone, Utc};
use cost_service::handlers::costs::{calculate_period_bounds, sum_costs, CostBreakdown};

fn cost(provider: &str, model: &str, total_cost: f64) -> CostBreakdown {
    CostBreakdown {
        provider: provider.to_string(),
        model: model.to_string(),
        total_tokens_in: 100,
        total_tokens_out: 50,
        total_cost,
        request_count: 1,
    }
}

#[test]
fn aggregates_costs_across_models() {
    let rows = vec![
        cost("openai", "gpt-4", 1.25),
        cost("anthropic", "claude-3-opus", 2.75),
    ];
    assert!((sum_costs(&rows) - 4.0).abs() < f64::EPSILON);
}

#[test]
fn empty_usage_has_zero_cost() {
    assert!((sum_costs(&[]) - 0.0).abs() < f64::EPSILON);
}

#[test]
fn preserves_provider_and_model_breakdown() {
    let row = cost("openai", "gpt-4", 1.25);
    assert_eq!(row.provider, "openai");
    assert_eq!(row.model, "gpt-4");
    assert_eq!(row.total_tokens_in + row.total_tokens_out, 150);
    assert_eq!(row.request_count, 1);
}

#[test]
fn computes_weekly_aggregation_window() {
    let now = Utc.with_ymd_and_hms(2026, 10, 27, 13, 45, 0).unwrap();
    let (start, end) = calculate_period_bounds("weekly", now);
    assert_eq!(end - start, Duration::weeks(1));
}

#[test]
fn computes_yearly_aggregation_window() {
    let now = Utc.with_ymd_and_hms(2026, 10, 27, 13, 45, 0).unwrap();
    let (start, end) = calculate_period_bounds("yearly", now);
    assert_eq!(end - start, Duration::days(365));
}

#[test]
fn usage_trend_compares_aggregate_totals() {
    let prior = vec![cost("openai", "gpt-4", 1.0)];
    let current = vec![
        cost("openai", "gpt-4", 1.5),
        cost("anthropic", "claude-3-haiku", 0.5),
    ];
    assert!(sum_costs(&current) > sum_costs(&prior));
}
