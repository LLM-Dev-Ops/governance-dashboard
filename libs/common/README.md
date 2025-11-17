# llm-governance-common

Common utilities, error handling, and response types for LLM Governance Dashboard.

## Features

- **Error Handling**: Unified error types with proper HTTP status mapping
- **API Responses**: Standardized JSON response format
- **Utilities**: Common helper functions used across services

## Usage

Add this to your `Cargo.toml`:

```toml
[dependencies]
llm-governance-common = "1.0.0"
```

## Example

```rust
use llm_governance_common::{AppError, Result, ApiResponse};

fn example() -> Result<String> {
    Ok("Success".to_string())
}

// Using ApiResponse
let response = ApiResponse::success(data);
```

## License

Licensed under Apache 2.0.
