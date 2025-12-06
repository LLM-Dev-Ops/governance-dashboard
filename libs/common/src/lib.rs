pub mod error;
pub mod response;
pub mod utils;
pub mod adapters;

pub use error::{AppError, Result};
pub use response::ApiResponse;

// Re-export adapter types for convenience (Phase 2B Infra-compatible)
pub use adapters::{
    EcosystemConsumer,
    UpstreamConfig,
    RetryConfig,
    CacheConfig,
    RateLimitConfig,
};
