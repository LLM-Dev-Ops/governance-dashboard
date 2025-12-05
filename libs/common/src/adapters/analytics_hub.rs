//! Analytics Hub Consumer Adapter
//!
//! Consumes aggregated analytics, baselines, usage clusters, and forecasting
//! insights from the LLM-Analytics-Hub upstream service.

use super::{EcosystemConsumer, UpstreamConfig};
use crate::error::{AppError, Result};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Aggregated analytics from Analytics Hub
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AggregatedAnalytics {
    pub organization_id: String,
    pub period_start: String,
    pub period_end: String,
    pub metrics: AnalyticsMetrics,
    pub trends: AnalyticsTrends,
    pub comparisons: PeriodComparison,
}

/// Core analytics metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalyticsMetrics {
    pub total_requests: u64,
    pub total_tokens: u64,
    pub total_cost: f64,
    pub unique_users: u32,
    pub unique_models: u32,
    pub avg_latency_ms: f64,
    pub error_rate: f64,
    pub success_rate: f64,
}

/// Analytics trends over time
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalyticsTrends {
    pub request_trend: TrendDirection,
    pub cost_trend: TrendDirection,
    pub latency_trend: TrendDirection,
    pub user_growth_trend: TrendDirection,
    pub trend_data: Vec<TrendDataPoint>,
}

/// Direction of a trend
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TrendDirection {
    Up,
    Down,
    Stable,
}

/// Data point in trend series
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrendDataPoint {
    pub timestamp: String,
    pub value: f64,
    pub label: String,
}

/// Comparison with previous period
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeriodComparison {
    pub previous_period_start: String,
    pub previous_period_end: String,
    pub request_change_percent: f64,
    pub cost_change_percent: f64,
    pub latency_change_percent: f64,
    pub user_change_percent: f64,
}

/// Performance baseline from Analytics Hub
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceBaseline {
    pub baseline_id: String,
    pub organization_id: String,
    pub model_id: Option<String>,
    pub created_at: String,
    pub valid_until: String,
    pub metrics: BaselineMetrics,
    pub thresholds: BaselineThresholds,
}

/// Baseline metrics for comparison
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BaselineMetrics {
    pub p50_latency_ms: f64,
    pub p95_latency_ms: f64,
    pub p99_latency_ms: f64,
    pub avg_tokens_per_request: f64,
    pub avg_cost_per_request: f64,
    pub typical_error_rate: f64,
}

/// Thresholds derived from baseline
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BaselineThresholds {
    pub latency_warning_ms: f64,
    pub latency_critical_ms: f64,
    pub error_rate_warning: f64,
    pub error_rate_critical: f64,
    pub cost_anomaly_threshold: f64,
}

/// Usage cluster from Analytics Hub
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageCluster {
    pub cluster_id: String,
    pub cluster_name: String,
    pub description: String,
    pub member_count: u32,
    pub characteristics: ClusterCharacteristics,
    pub members: Vec<ClusterMember>,
}

/// Characteristics of a usage cluster
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClusterCharacteristics {
    pub avg_requests_per_day: f64,
    pub avg_tokens_per_request: f64,
    pub preferred_models: Vec<String>,
    pub peak_hours: Vec<u8>,
    pub usage_pattern: UsagePattern,
}

/// Usage pattern type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum UsagePattern {
    LightUser,
    ModerateUser,
    HeavyUser,
    Batch,
    Interactive,
    Mixed,
}

/// Member of a usage cluster
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClusterMember {
    pub user_id: String,
    pub membership_score: f64,
    pub joined_cluster_at: String,
}

/// Forecasting insight from Analytics Hub
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForecastInsight {
    pub forecast_id: String,
    pub organization_id: String,
    pub forecast_type: ForecastType,
    pub generated_at: String,
    pub horizon_days: u32,
    pub predictions: Vec<ForecastPrediction>,
    pub confidence_level: f64,
    pub model_accuracy: f64,
}

/// Type of forecast
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ForecastType {
    Cost,
    Usage,
    Capacity,
    Demand,
}

/// Individual forecast prediction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForecastPrediction {
    pub date: String,
    pub predicted_value: f64,
    pub lower_bound: f64,
    pub upper_bound: f64,
    pub factors: HashMap<String, f64>,
}

/// Anomaly detection result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnomalyDetection {
    pub anomaly_id: String,
    pub detected_at: String,
    pub anomaly_type: AnomalyType,
    pub severity: AnomalySeverity,
    pub affected_metric: String,
    pub expected_value: f64,
    pub actual_value: f64,
    pub deviation_percent: f64,
    pub description: String,
}

/// Type of anomaly
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AnomalyType {
    Spike,
    Drop,
    Drift,
    Outlier,
    PatternChange,
}

/// Severity of anomaly
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AnomalySeverity {
    Low,
    Medium,
    High,
    Critical,
}

/// Consumer adapter for LLM-Analytics-Hub
pub struct AnalyticsHubConsumer {
    config: UpstreamConfig,
    client: reqwest::Client,
}

impl AnalyticsHubConsumer {
    /// Create a new Analytics Hub consumer
    pub fn new(config: UpstreamConfig) -> Result<Self> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_millis(config.timeout_ms))
            .build()
            .map_err(|e| AppError::Internal(format!("Failed to create HTTP client: {}", e)))?;

        Ok(Self { config, client })
    }

    /// Consume aggregated analytics
    pub async fn get_aggregated_analytics(
        &self,
        organization_id: &str,
        period_start: &str,
        period_end: &str,
    ) -> Result<AggregatedAnalytics> {
        let url = format!(
            "{}/api/v1/analytics/aggregate?org_id={}&start={}&end={}",
            self.config.base_url, organization_id, period_start, period_end
        );
        self.fetch_json(&url).await
    }

    /// Consume performance baselines
    pub async fn get_baselines(
        &self,
        organization_id: &str,
        model_id: Option<&str>,
    ) -> Result<Vec<PerformanceBaseline>> {
        let mut url = format!(
            "{}/api/v1/analytics/baselines?org_id={}",
            self.config.base_url, organization_id
        );

        if let Some(mid) = model_id {
            url.push_str(&format!("&model_id={}", mid));
        }

        self.fetch_json(&url).await
    }

    /// Consume usage clusters
    pub async fn get_usage_clusters(&self, organization_id: &str) -> Result<Vec<UsageCluster>> {
        let url = format!(
            "{}/api/v1/analytics/clusters?org_id={}",
            self.config.base_url, organization_id
        );
        self.fetch_json(&url).await
    }

    /// Consume forecasting insights
    pub async fn get_forecast(
        &self,
        organization_id: &str,
        forecast_type: ForecastType,
        horizon_days: u32,
    ) -> Result<ForecastInsight> {
        let type_str = serde_json::to_string(&forecast_type)
            .unwrap()
            .trim_matches('"')
            .to_string();

        let url = format!(
            "{}/api/v1/analytics/forecast?org_id={}&type={}&horizon={}",
            self.config.base_url, organization_id, type_str, horizon_days
        );
        self.fetch_json(&url).await
    }

    /// Consume detected anomalies
    pub async fn get_anomalies(
        &self,
        organization_id: &str,
        from_timestamp: Option<&str>,
    ) -> Result<Vec<AnomalyDetection>> {
        let mut url = format!(
            "{}/api/v1/analytics/anomalies?org_id={}",
            self.config.base_url, organization_id
        );

        if let Some(ts) = from_timestamp {
            url.push_str(&format!("&from={}", ts));
        }

        self.fetch_json(&url).await
    }

    /// Internal helper to fetch JSON from upstream
    async fn fetch_json<T: for<'de> Deserialize<'de>>(&self, url: &str) -> Result<T> {
        let mut request = self.client.get(url);

        if let Some(ref api_key) = self.config.api_key {
            request = request.header("Authorization", format!("Bearer {}", api_key));
        }

        let response = request
            .send()
            .await
            .map_err(|e| AppError::Internal(format!("Analytics Hub request failed: {}", e)))?;

        if !response.status().is_success() {
            return Err(AppError::Internal(format!(
                "Analytics Hub returned status: {}",
                response.status()
            )));
        }

        response
            .json()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to parse Analytics Hub response: {}", e)))
    }
}

#[async_trait]
impl EcosystemConsumer for AnalyticsHubConsumer {
    fn service_name(&self) -> &'static str {
        "LLM-Analytics-Hub"
    }

    async fn health_check(&self) -> Result<bool> {
        let url = format!("{}/health", self.config.base_url);
        match self.client.get(&url).send().await {
            Ok(resp) => Ok(resp.status().is_success()),
            Err(_) => Ok(false),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_trend_direction_serialization() {
        let trend = TrendDirection::Up;
        let json = serde_json::to_string(&trend).unwrap();
        assert_eq!(json, "\"up\"");
    }

    #[test]
    fn test_forecast_type_serialization() {
        let forecast = ForecastType::Cost;
        let json = serde_json::to_string(&forecast).unwrap();
        assert_eq!(json, "\"cost\"");
    }

    #[test]
    fn test_anomaly_severity_serialization() {
        let severity = AnomalySeverity::Critical;
        let json = serde_json::to_string(&severity).unwrap();
        assert_eq!(json, "\"critical\"");
    }

    #[test]
    fn test_usage_pattern_serialization() {
        let pattern = UsagePattern::HeavyUser;
        let json = serde_json::to_string(&pattern).unwrap();
        assert_eq!(json, "\"heavy_user\"");
    }
}
