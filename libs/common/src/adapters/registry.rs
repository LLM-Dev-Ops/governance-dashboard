//! Registry Consumer Adapter
//!
//! Consumes model metadata, versioning information, and registry states
//! from the LLM-Registry upstream service.

use super::{EcosystemConsumer, UpstreamConfig};
use crate::error::{AppError, Result};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Model metadata from the registry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelMetadata {
    pub model_id: String,
    pub model_name: String,
    pub provider: String,
    pub version: String,
    pub description: Option<String>,
    pub capabilities: Vec<String>,
    pub parameters: ModelParameters,
    pub created_at: String,
    pub updated_at: String,
    pub status: ModelStatus,
    pub tags: HashMap<String, String>,
}

/// Model parameters specification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelParameters {
    pub context_window: u32,
    pub max_output_tokens: u32,
    pub supports_streaming: bool,
    pub supports_functions: bool,
    pub supports_vision: bool,
    pub input_modalities: Vec<String>,
    pub output_modalities: Vec<String>,
}

/// Model status in the registry
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ModelStatus {
    Active,
    Deprecated,
    Preview,
    Retired,
}

/// Model version information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelVersion {
    pub version_id: String,
    pub version_number: String,
    pub model_id: String,
    pub release_date: String,
    pub changelog: Option<String>,
    pub is_latest: bool,
    pub is_stable: bool,
    pub deprecation_date: Option<String>,
}

/// Registry state summary
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryState {
    pub total_models: u32,
    pub active_models: u32,
    pub deprecated_models: u32,
    pub total_providers: u32,
    pub last_sync: String,
    pub health_status: RegistryHealth,
}

/// Registry health status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RegistryHealth {
    Healthy,
    Degraded,
    Unavailable,
}

/// Consumer adapter for LLM-Registry
pub struct RegistryConsumer {
    config: UpstreamConfig,
    client: reqwest::Client,
}

impl RegistryConsumer {
    /// Create a new Registry consumer
    pub fn new(config: UpstreamConfig) -> Result<Self> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_millis(config.timeout_ms))
            .build()
            .map_err(|e| AppError::Internal(format!("Failed to create HTTP client: {}", e)))?;

        Ok(Self { config, client })
    }

    /// Consume model metadata for a specific model
    pub async fn get_model_metadata(&self, model_id: &str) -> Result<ModelMetadata> {
        let url = format!("{}/api/v1/models/{}", self.config.base_url, model_id);
        self.fetch_json(&url).await
    }

    /// Consume all models for an organization
    pub async fn list_models(
        &self,
        provider: Option<&str>,
        status: Option<ModelStatus>,
    ) -> Result<Vec<ModelMetadata>> {
        let mut url = format!("{}/api/v1/models", self.config.base_url);
        let mut params = Vec::new();

        if let Some(p) = provider {
            params.push(format!("provider={}", p));
        }
        if let Some(s) = status {
            params.push(format!("status={}", serde_json::to_string(&s).unwrap().trim_matches('"')));
        }

        if !params.is_empty() {
            url.push_str(&format!("?{}", params.join("&")));
        }

        self.fetch_json(&url).await
    }

    /// Consume version history for a model
    pub async fn get_model_versions(&self, model_id: &str) -> Result<Vec<ModelVersion>> {
        let url = format!("{}/api/v1/models/{}/versions", self.config.base_url, model_id);
        self.fetch_json(&url).await
    }

    /// Consume registry state summary
    pub async fn get_registry_state(&self) -> Result<RegistryState> {
        let url = format!("{}/api/v1/registry/state", self.config.base_url);
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
            .map_err(|e| AppError::Internal(format!("Registry request failed: {}", e)))?;

        if !response.status().is_success() {
            return Err(AppError::Internal(format!(
                "Registry returned status: {}",
                response.status()
            )));
        }

        response
            .json()
            .await
            .map_err(|e| AppError::Internal(format!("Failed to parse Registry response: {}", e)))
    }
}

#[async_trait]
impl EcosystemConsumer for RegistryConsumer {
    fn service_name(&self) -> &'static str {
        "LLM-Registry"
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
    fn test_model_status_serialization() {
        let status = ModelStatus::Active;
        let json = serde_json::to_string(&status).unwrap();
        assert_eq!(json, "\"active\"");
    }

    #[test]
    fn test_registry_health_serialization() {
        let health = RegistryHealth::Healthy;
        let json = serde_json::to_string(&health).unwrap();
        assert_eq!(json, "\"healthy\"");
    }
}
