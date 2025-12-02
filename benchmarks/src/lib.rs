pub mod adapters;
pub mod io;
pub mod markdown;
pub mod result;

pub use result::BenchmarkResult;

/// Run all registered benchmarks and return their results
pub fn run_all_benchmarks() -> Vec<BenchmarkResult> {
    let targets = adapters::all_targets();
    let mut results = Vec::new();

    println!("Running {} benchmarks...", targets.len());

    for target in targets {
        let target_id = target.id();
        println!("  Running: {}", target_id);

        let result = target.run();
        results.push(result);
    }

    println!("Completed {} benchmarks", results.len());

    results
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_run_all_benchmarks() {
        let results = run_all_benchmarks();
        assert!(!results.is_empty());
        assert_eq!(results.len(), 4); // We have 4 adapters
    }

    #[test]
    fn test_benchmark_results_have_unique_ids() {
        let results = run_all_benchmarks();
        let ids: Vec<String> = results.iter().map(|r| r.target_id.clone()).collect();
        let unique_ids: std::collections::HashSet<_> = ids.iter().collect();

        assert_eq!(ids.len(), unique_ids.len(), "All benchmark results should have unique IDs");
    }

    #[test]
    fn test_benchmark_results_have_metrics() {
        let results = run_all_benchmarks();

        for result in results {
            assert!(!result.metrics.is_null(), "Benchmark {} should have metrics", result.target_id);
            assert!(result.metrics.is_object(), "Metrics for {} should be a JSON object", result.target_id);
        }
    }
}
