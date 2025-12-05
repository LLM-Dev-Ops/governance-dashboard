//! Policy Engine Consumer Adapter
//!
//! Consumes policy evaluation results, compliance rule states, and enforcement
//! decisions from the LLM-Policy-Engine upstream service.

use super::{EcosystemConsumer, UpstreamConfig};
use crate::error::{AppError, Result};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Policy evaluation result from upstream Policy Engine
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyEvaluationResult {
    pub policy_id: String,
    pub policy_name: String,
    pub decision: EnforcementDecision,
    pub evaluated_at: String,
    pub matched_rules: Vec<MatchedRule>,
    pub context: HashMap<String, serde_json::Value>,
}

/// Enforcement decision from policy evaluation
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum EnforcementDecision {
    Allow,
    Deny,
    Warn,
    RequireApproval,
    RateLimit,
}

/// A rule that matched during policy evaluation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchedRule {
    pub rule_id: String,
    pub rule_type: String,
    pub severity: String,
    pub message: String,
}

/// Compliance rule state from upstream
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComplianceRuleState {
    pub rule_id: String,
    pub rule_name: String,
    pub is_compliant: bool,
    pub last_checked: String,
    pub violation_count: u64,
    pub details: Option<String>,
}

/// Aggregated compliance status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComplianceStatus {
    pub overall_compliant: bool,
    pub total_rules: u32,
    pub passing_rules: u32,
    pub failing_rules: u32,
    pub rule_states: Vec<ComplianceRuleState>,
    pub last_updated: String,
}

/// Consumer adapter for LLM-Policy-Engine
pub struct PolicyEngineConsumer {
    config: UpstreamConfig,
    client: reqwest::Client,
}

impl PolicyEngineConsumer {
    /// Create a new Policy Engine consumer
    pub fn new(config: UpstreamConfig) -> Result<Self> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_millis(config.timeout_ms))
            .build()
            .map_err(|e| AppError::Internal(format!("Failed to create HTTP client: {}", e)))?;

        Ok(Self { config, client })
    }

    /// Consume policy evaluation results for a given context
    pub async fn get_evaluation_results(
        &self,
        organization_id: &str,
        limit: Option<u32>,
    ) -> Result<Vec<PolicyEvaluationResult>> {
        let url = format!(
            "{}/api/v1/evaluations?org_id={}&limit={}",
            self.config.base_url,
            organization_id,
            limit.unwrap_or(100)
        );

        self.fetch_json(&url).await
    }

    /// Consume compliance rule states
    pub async fn get_compliance_status(
        &self,
        organization_id: &str,
    ) -> Result<ComplianceStatus> {
        let url = format!(
            "{}/api/v1/compliance/status?org_id={}",
            self.config.base_url,
            organization_id
        );

        self.fetch_json(&url).await
    }

    /// Consume enforcement decisions for audit trail
    pub async fn get_enforcement_decisions(
        &self,
        organization_id: &str,
        from_timestamp: Option<&str>,
    ) -> Result<Vec<PolicyEvaluationResult>> {
        let mut url = format!(
            "{}/api/v1/enforcement/decisions?org_id={}",
            self.config.base_url,
            organization_id
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
            .map_err(|e| AppError::Internal(format!("Policy Engine request failed: {}", e)))?;

        if !response.status().is_success() {
            return Err(AppError::Internal(format!(
                "Policy Engine returned status: {}",
                response.status()
            )));
        }

        response
            .json()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to parse Policy Engine response: {}", e)))
    }
}

#[async_trait]
impl EcosystemConsumer for PolicyEngineConsumer {
    fn service_name(&self) -> &'static str {
        "LLM-Policy-Engine"
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
    fn test_enforcement_decision_serialization() {
        let decision = EnforcementDecision::Allow;
        let json = serde_json::to_string(&decision).unwrap();
        assert_eq!(json, "\"allow\"");
    }

    #[test]
    fn test_default_config() {
        let config = UpstreamConfig::default();
        assert_eq!(config.timeout_ms, 30000);
        assert_eq!(config.retry_count, 3);
    }
}
