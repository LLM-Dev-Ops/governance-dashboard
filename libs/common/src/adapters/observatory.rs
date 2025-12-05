//! Observatory Consumer Adapter
//!
//! Consumes telemetry events, trace spans, and system health indicators
//! from the LLM-Observatory upstream service.

use super::{EcosystemConsumer, UpstreamConfig};
use crate::error::{AppError, Result};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Telemetry event from Observatory
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TelemetryEvent {
    pub event_id: String,
    pub event_type: TelemetryEventType,
    pub timestamp: String,
    pub source: String,
    pub organization_id: Option<String>,
    pub user_id: Option<String>,
    pub model_id: Option<String>,
    pub attributes: HashMap<String, serde_json::Value>,
    pub metrics: EventMetrics,
}

/// Type of telemetry event
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TelemetryEventType {
    Request,
    Response,
    Error,
    RateLimit,
    TokenUsage,
    Latency,
    Custom,
}

/// Metrics associated with a telemetry event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventMetrics {
    pub latency_ms: Option<f64>,
    pub token_count: Option<u64>,
    pub error_count: Option<u32>,
    pub custom_metrics: HashMap<String, f64>,
}

/// Distributed trace span from Observatory
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraceSpan {
    pub trace_id: String,
    pub span_id: String,
    pub parent_span_id: Option<String>,
    pub operation_name: String,
    pub service_name: String,
    pub start_time: String,
    pub end_time: String,
    pub duration_ms: f64,
    pub status: SpanStatus,
    pub attributes: HashMap<String, serde_json::Value>,
    pub events: Vec<SpanEvent>,
}

/// Status of a trace span
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SpanStatus {
    Ok,
    Error,
    Unset,
}

/// Event within a span
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpanEvent {
    pub name: String,
    pub timestamp: String,
    pub attributes: HashMap<String, serde_json::Value>,
}

/// System health indicator from Observatory
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthIndicator {
    pub service_name: String,
    pub status: HealthStatus,
    pub last_check: String,
    pub response_time_ms: f64,
    pub error_rate: f64,
    pub throughput_rps: f64,
    pub resource_usage: ResourceUsage,
    pub dependencies: Vec<DependencyHealth>,
}

/// Health status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum HealthStatus {
    Healthy,
    Degraded,
    Unhealthy,
    Unknown,
}

/// Resource usage metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceUsage {
    pub cpu_percent: f64,
    pub memory_percent: f64,
    pub disk_percent: Option<f64>,
    pub network_in_bytes: Option<u64>,
    pub network_out_bytes: Option<u64>,
}

/// Health of a dependency
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DependencyHealth {
    pub name: String,
    pub status: HealthStatus,
    pub latency_ms: f64,
}

/// Aggregated system health summary
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemHealthSummary {
    pub overall_status: HealthStatus,
    pub services: Vec<HealthIndicator>,
    pub active_alerts: u32,
    pub error_rate_1h: f64,
    pub avg_latency_1h: f64,
    pub uptime_percentage: f64,
    pub last_updated: String,
}

/// Consumer adapter for LLM-Observatory
pub struct ObservatoryConsumer {
    config: UpstreamConfig,
    client: reqwest::Client,
}

impl ObservatoryConsumer {
    /// Create a new Observatory consumer
    pub fn new(config: UpstreamConfig) -> Result<Self> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_millis(config.timeout_ms))
            .build()
            .map_err(|e| AppError::Internal(format!("Failed to create HTTP client: {}", e)))?;

        Ok(Self { config, client })
    }

    /// Consume recent telemetry events
    pub async fn get_telemetry_events(
        &self,
        organization_id: &str,
        event_type: Option<TelemetryEventType>,
        limit: Option<u32>,
    ) -> Result<Vec<TelemetryEvent>> {
        let mut url = format!(
            "{}/api/v1/telemetry/events?org_id={}&limit={}",
            self.config.base_url,
            organization_id,
            limit.unwrap_or(100)
        );

        if let Some(et) = event_type {
            let type_str = serde_json::to_string(&et).unwrap().trim_matches('"').to_string();
            url.push_str(&format!("&type={}", type_str));
        }

        self.fetch_json(&url).await
    }

    /// Consume trace spans for a specific trace
    pub async fn get_trace_spans(&self, trace_id: &str) -> Result<Vec<TraceSpan>> {
        let url = format!(
            "{}/api/v1/traces/{}/spans",
            self.config.base_url, trace_id
        );
        self.fetch_json(&url).await
    }

    /// Consume trace spans within a time range
    pub async fn list_traces(
        &self,
        organization_id: &str,
        from_timestamp: &str,
        to_timestamp: &str,
    ) -> Result<Vec<TraceSpan>> {
        let url = format!(
            "{}/api/v1/traces?org_id={}&from={}&to={}",
            self.config.base_url, organization_id, from_timestamp, to_timestamp
        );
        self.fetch_json(&url).await
    }

    /// Consume system health indicators
    pub async fn get_health_indicators(&self) -> Result<SystemHealthSummary> {
        let url = format!("{}/api/v1/health/summary", self.config.base_url);
        self.fetch_json(&url).await
    }

    /// Consume health indicator for a specific service
    pub async fn get_service_health(&self, service_name: &str) -> Result<HealthIndicator> {
        let url = format!(
            "{}/api/v1/health/services/{}",
            self.config.base_url, service_name
        );
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
            .map_err(|e| AppError::Internal(format!("Observatory request failed: {}", e)))?;

        if !response.status().is_success() {
            return Err(AppError::Internal(format!(
                "Observatory returned status: {}",
                response.status()
            )));
        }

        response
            .json()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to parse Observatory response: {}", e)))
    }
}

#[async_trait]
impl EcosystemConsumer for ObservatoryConsumer {
    fn service_name(&self) -> &'static str {
        "LLM-Observatory"
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
    fn test_health_status_serialization() {
        let status = HealthStatus::Healthy;
        let json = serde_json::to_string(&status).unwrap();
        assert_eq!(json, "\"healthy\"");
    }

    #[test]
    fn test_span_status_serialization() {
        let status = SpanStatus::Ok;
        let json = serde_json::to_string(&status).unwrap();
        assert_eq!(json, "\"ok\"");
    }

    #[test]
    fn test_event_type_serialization() {
        let event_type = TelemetryEventType::Request;
        let json = serde_json::to_string(&event_type).unwrap();
        assert_eq!(json, "\"request\"");
    }
}
