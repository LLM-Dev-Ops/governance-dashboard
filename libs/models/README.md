# llm-governance-models

Shared data models and types for LLM Governance Dashboard multi-tenant platform.

## Features

- **User Models**: User, authentication, and authorization types
- **Policy Models**: Governance policy and rule definitions
- **Cost Models**: Budget, cost tracking, and analytics types
- **Audit Models**: Audit log and compliance types
- **Metrics Models**: Usage metrics and analytics

## Usage

Add this to your `Cargo.toml`:

```toml
[dependencies]
llm-governance-models = "1.0.0"
```

## Example

```rust
use llm_governance_models::user::User;
use llm_governance_models::policy::Policy;

// Use the models in your application
```

## License

Licensed under Apache 2.0.
