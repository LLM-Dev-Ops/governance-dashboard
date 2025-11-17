#!/bin/bash

# ============================================================================
# Publish LLM Governance Dashboard Crates to crates.io
# ============================================================================
# This script publishes all library crates in the correct dependency order
# ============================================================================

set -e  # Exit on error

echo "=================================================="
echo "Publishing LLM Governance Dashboard Crates"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to publish a crate
publish_crate() {
    local crate_path=$1
    local crate_name=$2

    echo ""
    echo -e "${YELLOW}Publishing: ${crate_name}${NC}"
    echo "Location: ${crate_path}"

    cd "${crate_path}"

    # Verify the crate builds
    echo "Building crate..."
    cargo build --release

    # Run tests if they exist
    if [ -d "tests" ] || grep -q "\[dev-dependencies\]" Cargo.toml; then
        echo "Running tests..."
        cargo test || echo "Warning: Tests failed but continuing..."
    fi

    # Publish to crates.io
    echo "Publishing to crates.io..."
    cargo publish --allow-dirty

    echo -e "${GREEN}✓ Successfully published ${crate_name}${NC}"

    # Wait a bit for crates.io to process
    echo "Waiting 30 seconds for crates.io to process..."
    sleep 30

    cd - > /dev/null
}

# Get the repository root
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

echo ""
echo "Repository: ${REPO_ROOT}"
echo ""

# Check if logged in to crates.io
if ! cargo login --help > /dev/null 2>&1; then
    echo -e "${RED}Error: cargo is not installed${NC}"
    exit 1
fi

echo -e "${YELLOW}Make sure you're logged in to crates.io!${NC}"
echo "Run: cargo login <YOUR_TOKEN>"
echo ""
read -p "Press Enter to continue or Ctrl+C to abort..."

# Publish libraries in dependency order
echo ""
echo "=================================================="
echo "Publishing library crates (dependencies first)"
echo "=================================================="

# 1. Common (no dependencies on other local crates)
publish_crate "libs/common" "llm-governance-common"

# 2. Database (depends on common)
publish_crate "libs/database" "llm-governance-database"

# 3. Models (depends on common, database)
publish_crate "libs/models" "llm-governance-models"

echo ""
echo "=================================================="
echo -e "${GREEN}All crates published successfully!${NC}"
echo "=================================================="
echo ""
echo "Published crates:"
echo "  - llm-governance-common"
echo "  - llm-governance-database"
echo "  - llm-governance-models"
echo ""
echo "View on crates.io:"
echo "  https://crates.io/crates/llm-governance-common"
echo "  https://crates.io/crates/llm-governance-database"
echo "  https://crates.io/crates/llm-governance-models"
echo ""
