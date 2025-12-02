use crate::adapters::BenchTarget;
use crate::result::BenchmarkResult;
use std::time::Instant;

/// Benchmark adapter for cost calculation operations
pub struct CostCalculationBench;

impl BenchTarget for CostCalculationBench {
    fn id(&self) -> String {
        "cost_calculation".to_string()
    }

    fn run(&self) -> BenchmarkResult {
        let start = Instant::now();

        // Simulate cost calculation operations
        let iterations = 1000;
        let mut total_calculations = 0;
        let mut total_cost_computed = 0.0;

        for i in 0..iterations {
            // Simulate cost calculations for different providers/models
            let (provider, model) = match i % 6 {
                0 => ("openai", "gpt-4"),
                1 => ("openai", "gpt-4-turbo"),
                2 => ("openai", "gpt-3.5-turbo"),
                3 => ("anthropic", "claude-3-opus"),
                4 => ("anthropic", "claude-3-sonnet"),
                _ => ("anthropic", "claude-3-haiku"),
            };

            let tokens_in = 1000;
            let tokens_out = 500;

            let cost = calculate_cost(provider, model, tokens_in, tokens_out);
            total_cost_computed += cost;
            total_calculations += 1;
        }

        let duration = start.elapsed();
        let avg_latency_ms = duration.as_millis() as f64 / iterations as f64;

        BenchmarkResult::new(
            self.id(),
            serde_json::json!({
                "iterations": iterations,
                "total_duration_ms": duration.as_millis(),
                "avg_latency_ms": avg_latency_ms,
                "total_calculations": total_calculations,
                "total_cost_computed": total_cost_computed,
                "avg_cost_per_calculation": total_cost_computed / total_calculations as f64,
                "throughput_ops_per_sec": (iterations as f64 / duration.as_secs_f64()),
            }),
        )
    }
}

/// Simulate cost calculation based on provider, model, and token usage
fn calculate_cost(provider: &str, model: &str, tokens_in: i64, tokens_out: i64) -> f64 {
    let pricing = get_model_pricing(provider, model);

    let input_cost = (tokens_in as f64 / 1_000_000.0) * pricing.input_price;
    let output_cost = (tokens_out as f64 / 1_000_000.0) * pricing.output_price;

    input_cost + output_cost
}

/// Get pricing for a specific model
fn get_model_pricing(provider: &str, model: &str) -> ModelPricing {
    match (provider, model) {
        ("openai", "gpt-4") => ModelPricing {
            input_price: 30.0,
            output_price: 60.0,
        },
        ("openai", "gpt-4-turbo") => ModelPricing {
            input_price: 10.0,
            output_price: 30.0,
        },
        ("openai", "gpt-3.5-turbo") => ModelPricing {
            input_price: 0.5,
            output_price: 1.5,
        },
        ("anthropic", "claude-3-opus") => ModelPricing {
            input_price: 15.0,
            output_price: 75.0,
        },
        ("anthropic", "claude-3-sonnet") => ModelPricing {
            input_price: 3.0,
            output_price: 15.0,
        },
        ("anthropic", "claude-3-haiku") => ModelPricing {
            input_price: 0.25,
            output_price: 1.25,
        },
        _ => ModelPricing {
            input_price: 1.0,
            output_price: 2.0,
        },
    }
}

/// Model pricing structure
#[derive(Debug)]
struct ModelPricing {
    input_price: f64,
    output_price: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cost_calculation_bench() {
        let bench = CostCalculationBench;
        assert_eq!(bench.id(), "cost_calculation");

        let result = bench.run();
        assert_eq!(result.target_id, "cost_calculation");

        // Verify metrics exist
        assert!(result.metrics.get("iterations").is_some());
        assert!(result.metrics.get("total_calculations").is_some());
        assert!(result.metrics.get("total_cost_computed").is_some());
    }

    #[test]
    fn test_calculate_cost() {
        let cost = calculate_cost("openai", "gpt-4", 1_000_000, 1_000_000);
        assert_eq!(cost, 90.0); // 30 + 60

        let cost = calculate_cost("anthropic", "claude-3-haiku", 1_000_000, 1_000_000);
        assert_eq!(cost, 1.5); // 0.25 + 1.25
    }

    #[test]
    fn test_get_model_pricing() {
        let pricing = get_model_pricing("openai", "gpt-4");
        assert_eq!(pricing.input_price, 30.0);
        assert_eq!(pricing.output_price, 60.0);

        let pricing = get_model_pricing("unknown", "unknown");
        assert_eq!(pricing.input_price, 1.0);
        assert_eq!(pricing.output_price, 2.0);
    }
}
