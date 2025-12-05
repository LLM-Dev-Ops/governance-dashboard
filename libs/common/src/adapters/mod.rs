//! LLM-Dev-Ops Ecosystem Consumer Adapters
//!
//! This module provides thin adapter layers for consuming data from upstream
//! LLM-Dev-Ops ecosystem components. These are additive, read-only consumers
//! that do not modify existing public APIs.
//!
//! # Phase 2B - Runtime Consumer Integrations
//!
//! - Policy Engine: Policy evaluation results, compliance states, enforcement decisions
//! - Registry: Model metadata, versioning, registry states
//! - CostOps: Cost summaries, projections, breakdowns
//! - Observatory: Telemetry events, trace spans, health indicators
//! - Analytics Hub: Aggregated analytics, baselines, forecasts

pub mod policy_engine;
pub mod registry;
pub mod cost_ops;
pub mod observatory;
pub mod analytics_hub;

use crate::error::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

/// Common trait for all ecosystem consumer adapters
#[async_trait]
pub trait EcosystemConsumer: Send + Sync {
    /// Returns the name of the upstream service
    fn service_name(&self) -> &'static str;

    /// Check if the upstream service is available
    async fn health_check(&self) -> Result<bool>;
}

/// Configuration for connecting to upstream services
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpstreamConfig {
    /// Base URL of the upstream service
    pub base_url: String,
    /// Optional API key for authentication
    pub api_key: Option<String>,
    /// Connection timeout in milliseconds
    pub timeout_ms: u64,
    /// Number of retry attempts
    pub retry_count: u32,
}

impl Default for UpstreamConfig {
    fn default() -> Self {
        Self {
            base_url: String::new(),
            api_key: None,
            timeout_ms: 30000,
            retry_count: 3,
        }
    }
}
