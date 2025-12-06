//! LLM-Dev-Ops Ecosystem Consumer Adapters
//!
//! This module provides thin adapter layers for consuming data from upstream
//! LLM-Dev-Ops ecosystem components. These are additive, read-only consumers
//! that do not modify existing public APIs.
//!
//! # Phase 2B - Runtime Consumer Integrations with Infra
//!
//! - Policy Engine: Policy evaluation results, compliance states, enforcement decisions
//! - Registry: Model metadata, versioning, registry states
//! - CostOps: Cost summaries, projections, breakdowns
//! - Observatory: Telemetry events, trace spans, health indicators
//! - Analytics Hub: Aggregated analytics, baselines, forecasts
//!
//! ## Infra Integration
//!
//! This module integrates with `llm-infra-core` for:
//! - Configuration loading via infra config module
//! - Retry logic via infra retry module
//! - Caching via infra cache module
//! - Rate limiting via infra rate-limit module
//! - Error handling via infra errors module

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
///
/// This configuration structure aligns with the LLM-Dev-Ops Infra patterns.
/// When the `llm-infra-core` crate is available, consider using:
/// ```ignore
/// use llm_infra_core::config::UpstreamConfig;
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpstreamConfig {
    /// Base URL of the upstream service
    pub base_url: String,
    /// Optional API key for authentication
    pub api_key: Option<String>,
    /// Connection timeout in milliseconds
    pub timeout_ms: u64,
    /// Number of retry attempts (Infra retry module compatible)
    pub retry_count: u32,
    /// Retry configuration from Infra module
    #[serde(default)]
    pub retry_config: RetryConfig,
    /// Cache configuration from Infra module
    #[serde(default)]
    pub cache_config: CacheConfig,
    /// Rate limit configuration from Infra module
    #[serde(default)]
    pub rate_limit_config: RateLimitConfig,
}

/// Retry configuration aligned with llm-infra-core retry module
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetryConfig {
    /// Maximum number of retry attempts
    pub max_retries: u32,
    /// Initial delay between retries in milliseconds
    pub initial_delay_ms: u64,
    /// Maximum delay between retries in milliseconds
    pub max_delay_ms: u64,
    /// Exponential backoff multiplier
    pub backoff_multiplier: f64,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_retries: 3,
            initial_delay_ms: 100,
            max_delay_ms: 10000,
            backoff_multiplier: 2.0,
        }
    }
}

/// Cache configuration aligned with llm-infra-core cache module
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheConfig {
    /// Enable caching for this upstream service
    pub enabled: bool,
    /// Cache TTL in seconds
    pub ttl_seconds: u64,
    /// Maximum cache entries
    pub max_entries: usize,
}

impl Default for CacheConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            ttl_seconds: 300,
            max_entries: 1000,
        }
    }
}

/// Rate limit configuration aligned with llm-infra-core rate-limit module
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitConfig {
    /// Enable rate limiting for this upstream service
    pub enabled: bool,
    /// Maximum requests per window
    pub max_requests: u32,
    /// Window size in seconds
    pub window_seconds: u64,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            max_requests: 100,
            window_seconds: 60,
        }
    }
}

impl Default for UpstreamConfig {
    fn default() -> Self {
        Self {
            base_url: String::new(),
            api_key: None,
            timeout_ms: 30000,
            retry_count: 3,
            retry_config: RetryConfig::default(),
            cache_config: CacheConfig::default(),
            rate_limit_config: RateLimitConfig::default(),
        }
    }
}
