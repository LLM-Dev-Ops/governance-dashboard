use serde::{Deserialize, Serialize};

/// Result of a benchmark run containing target ID, metrics, and timestamp
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BenchmarkResult {
    /// Unique identifier for the benchmark target
    pub target_id: String,

    /// Metrics collected during the benchmark run (JSON object)
    pub metrics: serde_json::Value,

    /// Timestamp when the benchmark was executed
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

impl BenchmarkResult {
    /// Create a new benchmark result
    pub fn new(target_id: String, metrics: serde_json::Value) -> Self {
        Self {
            target_id,
            metrics,
            timestamp: chrono::Utc::now(),
        }
    }
}
