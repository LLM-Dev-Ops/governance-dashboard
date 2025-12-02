use crate::adapters::BenchTarget;
use crate::result::BenchmarkResult;
use std::time::Instant;

/// Benchmark adapter for metrics collection operations
pub struct MetricsCollectionBench;

impl BenchTarget for MetricsCollectionBench {
    fn id(&self) -> String {
        "metrics_collection".to_string()
    }

    fn run(&self) -> BenchmarkResult {
        let start = Instant::now();

        // Simulate metrics collection operations
        let iterations = 1000;
        let mut total_metrics_ingested = 0;
        let mut total_aggregations = 0;

        for i in 0..iterations {
            // Simulate ingesting metrics
            let provider = match i % 2 {
                0 => "openai",
                _ => "anthropic",
            };

            ingest_metric(provider, i);
            total_metrics_ingested += 1;

            // Every 50th iteration, perform aggregation
            if i % 50 == 0 {
                aggregate_metrics(provider);
                total_aggregations += 1;
            }
        }

        let duration = start.elapsed();
        let avg_latency_ms = duration.as_millis() as f64 / iterations as f64;

        BenchmarkResult::new(
            self.id(),
            serde_json::json!({
                "iterations": iterations,
                "total_duration_ms": duration.as_millis(),
                "avg_latency_ms": avg_latency_ms,
                "total_metrics_ingested": total_metrics_ingested,
                "total_aggregations": total_aggregations,
                "throughput_ops_per_sec": (iterations as f64 / duration.as_secs_f64()),
            }),
        )
    }
}

/// Simulate ingesting a metric
fn ingest_metric(provider: &str, iteration: usize) {
    let _metric = Metric {
        provider: provider.to_string(),
        model: format!("{}-model", provider),
        tokens_in: 1000 + (iteration % 100) as i32,
        tokens_out: 500 + (iteration % 50) as i32,
        latency_ms: 100 + (iteration % 200) as i32,
        cost: 0.01 + (iteration as f64 * 0.001),
        timestamp: chrono::Utc::now(),
    };
}

/// Simulate aggregating metrics
fn aggregate_metrics(provider: &str) -> AggregatedMetrics {
    AggregatedMetrics {
        provider: provider.to_string(),
        total_requests: 100,
        total_tokens_in: 100_000,
        total_tokens_out: 50_000,
        avg_latency_ms: 150.0,
        total_cost: 5.0,
    }
}

/// Simulated metric structure
#[derive(Debug)]
struct Metric {
    provider: String,
    model: String,
    tokens_in: i32,
    tokens_out: i32,
    latency_ms: i32,
    cost: f64,
    timestamp: chrono::DateTime<chrono::Utc>,
}

/// Simulated aggregated metrics structure
#[derive(Debug)]
struct AggregatedMetrics {
    provider: String,
    total_requests: i64,
    total_tokens_in: i64,
    total_tokens_out: i64,
    avg_latency_ms: f64,
    total_cost: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metrics_collection_bench() {
        let bench = MetricsCollectionBench;
        assert_eq!(bench.id(), "metrics_collection");

        let result = bench.run();
        assert_eq!(result.target_id, "metrics_collection");

        // Verify metrics exist
        assert!(result.metrics.get("iterations").is_some());
        assert!(result.metrics.get("total_metrics_ingested").is_some());
        assert!(result.metrics.get("total_aggregations").is_some());
    }

    #[test]
    fn test_aggregate_metrics() {
        let aggregated = aggregate_metrics("openai");
        assert_eq!(aggregated.provider, "openai");
        assert_eq!(aggregated.total_requests, 100);
    }
}
