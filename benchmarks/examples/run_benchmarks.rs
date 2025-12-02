use llm_governance_benchmarks::{run_all_benchmarks, io, markdown};
use std::path::Path;

/// Example CLI to run all benchmarks and save results
fn main() {
    println!("LLM Governance Dashboard - Benchmark Runner");
    println!("===========================================\n");

    // Run all benchmarks
    let results = run_all_benchmarks();

    println!("\n===========================================");
    println!("Saving results...\n");

    // Define output paths
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let raw_json_path = Path::new("benchmarks/output/raw")
        .join(format!("results_{}.json", timestamp));
    let summary_md_path = Path::new("benchmarks/output")
        .join(format!("report_{}.md", timestamp));

    // Save results to JSON
    match io::write_results_json(&results, &raw_json_path) {
        Ok(_) => println!("✓ Saved raw results to: {}", raw_json_path.display()),
        Err(e) => eprintln!("✗ Failed to save raw results: {}", e),
    }

    // Generate and save markdown report
    let report = markdown::generate_report(&results);
    match io::write_markdown(&report, &summary_md_path) {
        Ok(_) => println!("✓ Saved markdown report to: {}", summary_md_path.display()),
        Err(e) => eprintln!("✗ Failed to save markdown report: {}", e),
    }

    // Print summary
    println!("\n===========================================");
    println!("Summary:\n");
    println!("{}", markdown::generate_summary(&results));
    println!("===========================================");
}
