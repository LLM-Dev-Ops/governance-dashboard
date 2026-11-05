pub mod adapters;
pub mod error;
pub mod response;
pub mod utils;

pub use error::{AppError, Result};
pub use response::ApiResponse;

// Re-export adapter types for convenience (Phase 2B Infra-compatible)
pub use adapters::{CacheConfig, EcosystemConsumer, RateLimitConfig, RetryConfig, UpstreamConfig};
