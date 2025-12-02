# LLM Governance Benchmarks

Canonical benchmark interface for the LLM Governance Dashboard.

## Overview

This library provides a standardized benchmark interface for measuring the performance of governance operations including:

- **Policy Evaluation** - Benchmark policy rule evaluation performance
- **Audit Logging** - Benchmark audit log creation and checksum verification
- **Cost Calculation** - Benchmark cost calculation operations
- **Metrics Collection** - Benchmark metrics ingestion and aggregation

## Architecture

```
benchmarks/
├── src/
│   ├── lib.rs                    # Main library entry point with run_all_benchmarks()
│   ├── result.rs                 # BenchmarkResult struct
│   ├── io.rs                     # File I/O operations
│   ├── markdown.rs               # Markdown report generation
│   └── adapters/
│       ├── mod.rs                # BenchTarget trait and registry
│       ├── policy_evaluation.rs  # Policy evaluation adapter
│       ├── audit_logging.rs      # Audit logging adapter
│       ├── cost_calculation.rs   # Cost calculation adapter
│       └── metrics_collection.rs # Metrics collection adapter
├── output/
│   ├── raw/                      # Raw JSON benchmark results
│   └── summary.md                # Summary documentation
└── examples/
    └── run_benchmarks.rs         # CLI example
```

## Usage

### Running Benchmarks Programmatically

```rust
use llm_governance_benchmarks::run_all_benchmarks;

fn main() {
    let results = run_all_benchmarks();

    for result in results {
        println!("Benchmark: {}", result.target_id);
        println!("Metrics: {:?}", result.metrics);
    }
}
```

### Running Example CLI

```bash
cargo run --package llm-governance-benchmarks --example run_benchmarks
```

### Running Tests

```bash
cargo test --package llm-governance-benchmarks
```

## BenchmarkResult Structure

Each benchmark returns a `BenchmarkResult` with:

- `target_id: String` - Unique identifier for the benchmark
- `metrics: serde_json::Value` - JSON object containing metrics
- `timestamp: chrono::DateTime<chrono::Utc>` - Execution timestamp

### Standard Metrics

All benchmarks collect these standard metrics:

- `iterations` - Number of operations performed
- `total_duration_ms` - Total execution time in milliseconds
- `avg_latency_ms` - Average latency per operation
- `throughput_ops_per_sec` - Operations per second

### Benchmark-Specific Metrics

Each adapter may collect additional metrics relevant to its operation.

## Adding New Benchmarks

1. Create a new adapter in `src/adapters/`:

```rust
use crate::adapters::BenchTarget;
use crate::result::BenchmarkResult;

pub struct MyBench;

impl BenchTarget for MyBench {
    fn id(&self) -> String {
        "my_benchmark".to_string()
    }

    fn run(&self) -> BenchmarkResult {
        // Implement benchmark logic
        BenchmarkResult::new(
            self.id(),
            serde_json::json!({
                "my_metric": 42
            }),
        )
    }
}
```

2. Register it in `src/adapters/mod.rs`:

```rust
pub mod my_benchmark;

pub fn all_targets() -> Vec<Box<dyn BenchTarget>> {
    vec![
        // ... existing benchmarks
        Box::new(my_benchmark::MyBench),
    ]
}
```

## CLI Integration

To integrate benchmarks into a CLI application:

```rust
use llm_governance_benchmarks::{run_all_benchmarks, io, markdown};
use std::path::Path;

fn run_benchmark_command() {
    let results = run_all_benchmarks();

    // Save raw JSON
    io::write_results_json(&results, Path::new("output/results.json")).unwrap();

    // Generate and save markdown report
    let report = markdown::generate_report(&results);
    io::write_markdown(&report, Path::new("output/report.md")).unwrap();
}
```

## Output Directory

Benchmark results are written to:

- `benchmarks/output/raw/` - Raw JSON files with timestamp
- `benchmarks/output/` - Markdown reports with timestamp

## Dependencies

- `serde` + `serde_json` - Serialization
- `chrono` - Timestamps
- `sha2` - Checksum calculation (audit logging)

## License

Apache-2.0
