use crate::result::BenchmarkResult;
use std::fs;
use std::io::Write;
use std::path::Path;

/// Ensures that a directory exists, creating it if necessary
pub fn ensure_directory(path: &Path) -> std::io::Result<()> {
    if !path.exists() {
        fs::create_dir_all(path)?;
    }
    Ok(())
}

/// Write benchmark results to a JSON file
pub fn write_results_json(results: &[BenchmarkResult], path: &Path) -> std::io::Result<()> {
    ensure_directory(path.parent().unwrap_or(Path::new(".")))?;

    let json = serde_json::to_string_pretty(results)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;

    let mut file = fs::File::create(path)?;
    file.write_all(json.as_bytes())?;

    Ok(())
}

/// Write a single benchmark result to a JSON file
pub fn write_result_json(result: &BenchmarkResult, path: &Path) -> std::io::Result<()> {
    ensure_directory(path.parent().unwrap_or(Path::new(".")))?;

    let json = serde_json::to_string_pretty(result)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;

    let mut file = fs::File::create(path)?;
    file.write_all(json.as_bytes())?;

    Ok(())
}

/// Read benchmark results from a JSON file
pub fn read_results_json(path: &Path) -> std::io::Result<Vec<BenchmarkResult>> {
    let content = fs::read_to_string(path)?;
    let results = serde_json::from_str(&content)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;

    Ok(results)
}

/// Write markdown content to a file
pub fn write_markdown(content: &str, path: &Path) -> std::io::Result<()> {
    ensure_directory(path.parent().unwrap_or(Path::new(".")))?;

    let mut file = fs::File::create(path)?;
    file.write_all(content.as_bytes())?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_ensure_directory() {
        let dir = tempdir().unwrap();
        let nested_path = dir.path().join("nested").join("path");

        ensure_directory(&nested_path).unwrap();
        assert!(nested_path.exists());
    }

    #[test]
    fn test_write_and_read_results_json() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("results.json");

        let results = vec![
            BenchmarkResult::new(
                "test_target".to_string(),
                serde_json::json!({"metric": 42}),
            ),
        ];

        write_results_json(&results, &file_path).unwrap();
        let read_results = read_results_json(&file_path).unwrap();

        assert_eq!(results.len(), read_results.len());
        assert_eq!(results[0].target_id, read_results[0].target_id);
    }
}
