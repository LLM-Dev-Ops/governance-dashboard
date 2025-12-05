//! CostOps Consumer Adapter
//!
//! Consumes cost summaries, projections, and detailed breakdowns
//! from the LLM-CostOps upstream service.

use super::{EcosystemConsumer, UpstreamConfig};
use crate::error::{AppError, Result};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Cost summary from CostOps
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostSummary {
    pub organization_id: String,
    pub period_start: String,
    pub period_end: String,
    pub total_cost: f64,
    pub currency: String,
    pub cost_by_provider: HashMap<String, f64>,
    pub cost_by_model: HashMap<String, f64>,
    pub cost_by_team: HashMap<String, f64>,
    pub request_count: u64,
    pub token_count: u64,
}

/// Cost projection/forecast from CostOps
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostProjection {
    pub organization_id: String,
    pub projection_date: String,
    pub projected_daily_cost: f64,
    pub projected_weekly_cost: f64,
    pub projected_monthly_cost: f64,
    pub confidence_interval: ConfidenceInterval,
    pub trend: CostTrend,
    pub factors: Vec<ProjectionFactor>,
}

/// Confidence interval for projections
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfidenceInterval {
    pub lower_bound: f64,
    pub upper_bound: f64,
    pub confidence_level: f64,
}

/// Cost trend indicator
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CostTrend {
    Increasing,
    Stable,
    Decreasing,
}

/// Factor affecting cost projection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectionFactor {
    pub factor_name: String,
    pub impact: f64,
    pub description: String,
}

/// Detailed cost breakdown
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostBreakdownDetail {
    pub breakdown_id: String,
    pub organization_id: String,
    pub period: String,
    pub granularity: CostGranularity,
    pub items: Vec<CostLineItem>,
    pub subtotals: HashMap<String, f64>,
    pub total: f64,
}

/// Cost granularity level
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CostGranularity {
    Hourly,
    Daily,
    Weekly,
    Monthly,
}

/// Individual cost line item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostLineItem {
    pub timestamp: String,
    pub provider: String,
    pub model: String,
    pub team_id: Option<String>,
    pub user_id: Option<String>,
    pub prompt_tokens: u64,
    pub completion_tokens: u64,
    pub prompt_cost: f64,
    pub completion_cost: f64,
    pub total_cost: f64,
    pub request_count: u32,
}

/// Budget alert from CostOps
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostAlert {
    pub alert_id: String,
    pub budget_id: String,
    pub alert_type: AlertType,
    pub threshold_percentage: f64,
    pub current_percentage: f64,
    pub message: String,
    pub triggered_at: String,
}

/// Type of cost alert
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AlertType {
    Warning,
    Critical,
    Exceeded,
}

/// Consumer adapter for LLM-CostOps
pub struct CostOpsConsumer {
    config: UpstreamConfig,
    client: reqwest::Client,
}

impl CostOpsConsumer {
    /// Create a new CostOps consumer
    pub fn new(config: UpstreamConfig) -> Result<Self> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_millis(config.timeout_ms))
            .build()
            .map_err(|e| AppError::Internal(format!("Failed to create HTTP client: {}", e)))?;

        Ok(Self { config, client })
    }

    /// Consume cost summary for an organization
    pub async fn get_cost_summary(
        &self,
        organization_id: &str,
        period_start: &str,
        period_end: &str,
    ) -> Result<CostSummary> {
        let url = format!(
            "{}/api/v1/costs/summary?org_id={}&start={}&end={}",
            self.config.base_url, organization_id, period_start, period_end
        );
        self.fetch_json(&url).await
    }

    /// Consume cost projections
    pub async fn get_cost_projection(&self, organization_id: &str) -> Result<CostProjection> {
        let url = format!(
            "{}/api/v1/costs/projection?org_id={}",
            self.config.base_url, organization_id
        );
        self.fetch_json(&url).await
    }

    /// Consume detailed cost breakdown
    pub async fn get_cost_breakdown(
        &self,
        organization_id: &str,
        granularity: CostGranularity,
        period_start: &str,
        period_end: &str,
    ) -> Result<CostBreakdownDetail> {
        let granularity_str = serde_json::to_string(&granularity)
            .unwrap()
            .trim_matches('"')
            .to_string();

        let url = format!(
            "{}/api/v1/costs/breakdown?org_id={}&granularity={}&start={}&end={}",
            self.config.base_url, organization_id, granularity_str, period_start, period_end
        );
        self.fetch_json(&url).await
    }

    /// Consume active cost alerts
    pub async fn get_cost_alerts(&self, organization_id: &str) -> Result<Vec<CostAlert>> {
        let url = format!(
            "{}/api/v1/costs/alerts?org_id={}",
            self.config.base_url, organization_id
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
            .map_err(|e| AppError::Internal(format!("CostOps request failed: {}", e)))?;

        if !response.status().is_success() {
            return Err(AppError::Internal(format!(
                "CostOps returned status: {}",
                response.status()
            )));
        }

        response
            .json()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to parse CostOps response: {}", e)))
    }
}

#[async_trait]
impl EcosystemConsumer for CostOpsConsumer {
    fn service_name(&self) -> &'static str {
        "LLM-CostOps"
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
    fn test_cost_trend_serialization() {
        let trend = CostTrend::Increasing;
        let json = serde_json::to_string(&trend).unwrap();
        assert_eq!(json, "\"increasing\"");
    }

    #[test]
    fn test_alert_type_serialization() {
        let alert_type = AlertType::Critical;
        let json = serde_json::to_string(&alert_type).unwrap();
        assert_eq!(json, "\"critical\"");
    }

    #[test]
    fn test_granularity_serialization() {
        let granularity = CostGranularity::Daily;
        let json = serde_json::to_string(&granularity).unwrap();
        assert_eq!(json, "\"daily\"");
    }
}
