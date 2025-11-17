# llm-governance-database

Database connection pooling and utilities for LLM Governance Dashboard with TimescaleDB support.

## Features

- **Connection Pooling**: Optimized PostgreSQL connection pool management
- **TimescaleDB Support**: Time-series database utilities
- **Migration Helpers**: Database migration utilities

## Usage

Add this to your `Cargo.toml`:

```toml
[dependencies]
llm-governance-database = "1.0.0"
```

## Example

```rust
use llm_governance_database::create_pool;

#[tokio::main]
async fn main() {
    let pool = create_pool("postgresql://localhost/mydb")
        .await
        .expect("Failed to create pool");
}
```

## License

Licensed under Apache 2.0.
