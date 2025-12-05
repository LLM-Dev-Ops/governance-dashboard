pub mod error;
pub mod response;
pub mod utils;
pub mod adapters;

pub use error::{AppError, Result};
pub use response::ApiResponse;

// Re-export adapter types for convenience
pub use adapters::{EcosystemConsumer, UpstreamConfig};
