# Benchmark Results Summary

This directory contains benchmark results for the LLM Governance Dashboard.

## Directory Structure

- `raw/` - Contains raw JSON benchmark results
- `summary.md` - This file, containing a summary of all benchmark runs

## Benchmarks

The following benchmarks are available:

1. **Policy Evaluation** - Measures performance of policy evaluation operations
2. **Audit Logging** - Measures performance of audit log creation and verification
3. **Cost Calculation** - Measures performance of cost calculation operations
4. **Metrics Collection** - Measures performance of metrics ingestion and aggregation

## Running Benchmarks

To run all benchmarks:

```bash
# Using the benchmarks library
cargo test --package llm-governance-benchmarks

# Or run benchmarks programmatically
# (See CLI integration if available)
```

## Results Format

Results are stored in two formats:

1. **JSON** (`raw/` directory) - Machine-readable format with full metrics
2. **Markdown** (generated reports) - Human-readable format with summary tables

## Metrics Collected

Each benchmark collects the following standard metrics:

- `iterations` - Number of operations performed
- `total_duration_ms` - Total duration in milliseconds
- `avg_latency_ms` - Average latency per operation
- `throughput_ops_per_sec` - Operations per second

Additional benchmark-specific metrics may also be collected.

## Last Updated

This template was created as part of the benchmark interface implementation.
Results will be written to this directory when benchmarks are executed.
