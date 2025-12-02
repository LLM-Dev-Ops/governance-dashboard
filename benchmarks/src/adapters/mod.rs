use crate::result::BenchmarkResult;

// Re-export adapters
pub mod policy_evaluation;
pub mod audit_logging;
pub mod cost_calculation;
pub mod metrics_collection;

/// Trait representing a benchmarkable target
pub trait BenchTarget {
    /// Returns the unique identifier for this benchmark target
    fn id(&self) -> String;

    /// Executes the benchmark and returns the result
    fn run(&self) -> BenchmarkResult;
}

/// Registry of all available benchmark targets
pub fn all_targets() -> Vec<Box<dyn BenchTarget>> {
    vec![
        Box::new(policy_evaluation::PolicyEvaluationBench),
        Box::new(audit_logging::AuditLoggingBench),
        Box::new(cost_calculation::CostCalculationBench),
        Box::new(metrics_collection::MetricsCollectionBench),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_all_targets_count() {
        let targets = all_targets();
        assert_eq!(targets.len(), 4);
    }

    #[test]
    fn test_all_targets_unique_ids() {
        let targets = all_targets();
        let ids: Vec<String> = targets.iter().map(|t| t.id()).collect();
        let unique_ids: std::collections::HashSet<_> = ids.iter().collect();
        assert_eq!(ids.len(), unique_ids.len(), "All target IDs should be unique");
    }
}
