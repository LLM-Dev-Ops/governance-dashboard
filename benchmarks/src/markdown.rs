use crate::result::BenchmarkResult;

/// Generate a markdown report from benchmark results
pub fn generate_report(results: &[BenchmarkResult]) -> String {
    let mut report = String::new();

    // Header
    report.push_str("# Benchmark Results\n\n");
    report.push_str(&format!("Generated at: {}\n\n", chrono::Utc::now().to_rfc3339()));
    report.push_str(&format!("Total benchmarks: {}\n\n", results.len()));

    // Summary table
    report.push_str("## Summary\n\n");
    report.push_str("| Target ID | Timestamp | Status |\n");
    report.push_str("|-----------|-----------|--------|\n");

    for result in results {
        report.push_str(&format!(
            "| {} | {} | {} |\n",
            result.target_id,
            result.timestamp.format("%Y-%m-%d %H:%M:%S UTC"),
            "Completed"
        ));
    }

    report.push_str("\n");

    // Detailed results
    report.push_str("## Detailed Results\n\n");

    for result in results {
        report.push_str(&format!("### {}\n\n", result.target_id));
        report.push_str(&format!("**Timestamp:** {}\n\n", result.timestamp.to_rfc3339()));
        report.push_str("**Metrics:**\n\n");
        report.push_str("```json\n");
        report.push_str(&serde_json::to_string_pretty(&result.metrics).unwrap_or_default());
        report.push_str("\n```\n\n");
    }

    report
}

/// Generate a markdown table from benchmark results
pub fn generate_table(results: &[BenchmarkResult]) -> String {
    let mut table = String::new();

    table.push_str("| Target ID | Timestamp | Metrics |\n");
    table.push_str("|-----------|-----------|----------|\n");

    for result in results {
        let metrics_str = result.metrics.to_string().replace('\n', " ");
        let truncated_metrics = if metrics_str.len() > 50 {
            format!("{}...", &metrics_str[..50])
        } else {
            metrics_str
        };

        table.push_str(&format!(
            "| {} | {} | {} |\n",
            result.target_id,
            result.timestamp.format("%Y-%m-%d %H:%M:%S"),
            truncated_metrics
        ));
    }

    table
}

/// Generate a compact summary from benchmark results
pub fn generate_summary(results: &[BenchmarkResult]) -> String {
    let mut summary = String::new();

    summary.push_str(&format!("Total Benchmarks: {}\n", results.len()));

    if !results.is_empty() {
        let latest = results.iter().max_by_key(|r| r.timestamp).unwrap();
        let oldest = results.iter().min_by_key(|r| r.timestamp).unwrap();

        summary.push_str(&format!("Latest: {} at {}\n", latest.target_id, latest.timestamp.to_rfc3339()));
        summary.push_str(&format!("Oldest: {} at {}\n", oldest.target_id, oldest.timestamp.to_rfc3339()));
    }

    summary
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_report() {
        let results = vec![
            BenchmarkResult::new(
                "test_target".to_string(),
                serde_json::json!({"metric": 42}),
            ),
        ];

        let report = generate_report(&results);
        assert!(report.contains("# Benchmark Results"));
        assert!(report.contains("test_target"));
    }

    #[test]
    fn test_generate_table() {
        let results = vec![
            BenchmarkResult::new(
                "test_target".to_string(),
                serde_json::json!({"metric": 42}),
            ),
        ];

        let table = generate_table(&results);
        assert!(table.contains("test_target"));
        assert!(table.contains("| Target ID"));
    }

    #[test]
    fn test_generate_summary() {
        let results = vec![
            BenchmarkResult::new(
                "test_target".to_string(),
                serde_json::json!({"metric": 42}),
            ),
        ];

        let summary = generate_summary(&results);
        assert!(summary.contains("Total Benchmarks: 1"));
    }
}
