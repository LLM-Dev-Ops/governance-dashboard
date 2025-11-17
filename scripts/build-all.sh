#!/usr/bin/env bash

# ============================================================================
# build-all.sh - Master Build Script
# ============================================================================
# Builds all Rust services and frontend with linting and timing
# Usage: ./scripts/build-all.sh [--release] [--clean]
# ============================================================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Log directory
LOG_DIR="$PROJECT_ROOT/logs/build"
mkdir -p "$LOG_DIR"

# Timestamp for logs
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BUILD_LOG="$LOG_DIR/build_${TIMESTAMP}.log"

# Build mode
BUILD_MODE="debug"
CLEAN_BUILD=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --release)
            BUILD_MODE="release"
            shift
            ;;
        --clean)
            CLEAN_BUILD=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Usage: $0 [--release] [--clean]"
            exit 1
            ;;
    esac
done

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo -e "\n${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${CYAN}$1${NC}"
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_step() {
    echo -e "${BLUE}▶${NC} ${BOLD}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

# Time tracking
declare -A TIMINGS
start_timer() {
    TIMINGS[$1]=$(date +%s)
}

end_timer() {
    local name=$1
    local start=${TIMINGS[$name]}
    local end=$(date +%s)
    local duration=$((end - start))
    TIMINGS[$name]=$duration
}

format_duration() {
    local seconds=$1
    if [[ $seconds -lt 60 ]]; then
        echo "${seconds}s"
    else
        local minutes=$((seconds / 60))
        local secs=$((seconds % 60))
        echo "${minutes}m ${secs}s"
    fi
}

# ============================================================================
# Build Process
# ============================================================================

print_header "LLM Governance Dashboard - Master Build Script"
echo -e "${BOLD}Build Mode:${NC} ${BUILD_MODE}"
echo -e "${BOLD}Clean Build:${NC} ${CLEAN_BUILD}"
echo -e "${BOLD}Log File:${NC} ${BUILD_LOG}"
echo ""

start_timer "total"

# ----------------------------------------------------------------------------
# Step 1: Clean Build (Optional)
# ----------------------------------------------------------------------------
if [[ "$CLEAN_BUILD" == true ]]; then
    print_step "Cleaning previous build artifacts..."
    start_timer "clean"

    cargo clean >> "$BUILD_LOG" 2>&1
    rm -rf frontend/build frontend/.svelte-kit >> "$BUILD_LOG" 2>&1

    end_timer "clean"
    print_success "Clean completed in $(format_duration ${TIMINGS[clean]})"
fi

# ----------------------------------------------------------------------------
# Step 2: Run Rust Linters
# ----------------------------------------------------------------------------
print_step "Running Rust linters..."
start_timer "rust_lint"

# cargo fmt check
print_info "Checking code formatting with cargo fmt..."
if cargo fmt --all -- --check >> "$BUILD_LOG" 2>&1; then
    print_success "Code formatting check passed"
else
    print_error "Code formatting issues found. Run 'cargo fmt --all' to fix."
    exit 1
fi

# cargo clippy
print_info "Running clippy linter..."
if cargo clippy --all-targets --all-features -- -D warnings >> "$BUILD_LOG" 2>&1; then
    print_success "Clippy linting passed"
else
    print_error "Clippy found issues. Check log: $BUILD_LOG"
    exit 1
fi

end_timer "rust_lint"
print_success "Rust linting completed in $(format_duration ${TIMINGS[rust_lint]})"

# ----------------------------------------------------------------------------
# Step 3: Build Rust Workspace
# ----------------------------------------------------------------------------
print_step "Building Rust workspace..."
start_timer "rust_build"

BUILD_FLAGS=""
if [[ "$BUILD_MODE" == "release" ]]; then
    BUILD_FLAGS="--release"
fi

print_info "Building all services and libraries..."
if cargo build --workspace $BUILD_FLAGS >> "$BUILD_LOG" 2>&1; then
    print_success "Rust build completed successfully"
else
    print_error "Rust build failed. Check log: $BUILD_LOG"
    exit 1
fi

end_timer "rust_build"
print_success "Rust build completed in $(format_duration ${TIMINGS[rust_build]})"

# ----------------------------------------------------------------------------
# Step 4: Build Individual Services (for verification)
# ----------------------------------------------------------------------------
print_step "Verifying individual services..."
start_timer "service_verify"

SERVICES=(
    "auth-service"
    "user-service"
    "policy-service"
    "audit-service"
    "metrics-service"
    "cost-service"
    "api-gateway"
    "integration-service"
)

for service in "${SERVICES[@]}"; do
    print_info "Verifying $service..."
    if cargo build -p "$service" $BUILD_FLAGS >> "$BUILD_LOG" 2>&1; then
        print_success "$service verified"
    else
        print_error "$service verification failed"
        exit 1
    fi
done

end_timer "service_verify"
print_success "Service verification completed in $(format_duration ${TIMINGS[service_verify]})"

# ----------------------------------------------------------------------------
# Step 5: Run Frontend Linters
# ----------------------------------------------------------------------------
print_step "Running frontend linters..."
start_timer "frontend_lint"

cd "$PROJECT_ROOT/frontend"

# Check if node_modules exists
if [[ ! -d "node_modules" ]]; then
    print_warning "node_modules not found. Installing dependencies..."
    npm install >> "$BUILD_LOG" 2>&1
fi

# Svelte check
print_info "Running svelte-check..."
if npm run check >> "$BUILD_LOG" 2>&1; then
    print_success "Svelte check passed"
else
    print_warning "Svelte check found issues (non-blocking)"
fi

cd "$PROJECT_ROOT"
end_timer "frontend_lint"
print_success "Frontend linting completed in $(format_duration ${TIMINGS[frontend_lint]})"

# ----------------------------------------------------------------------------
# Step 6: Build Frontend
# ----------------------------------------------------------------------------
print_step "Building frontend..."
start_timer "frontend_build"

cd "$PROJECT_ROOT/frontend"

print_info "Building production frontend..."
if npm run build >> "$BUILD_LOG" 2>&1; then
    print_success "Frontend build completed successfully"
else
    print_error "Frontend build failed. Check log: $BUILD_LOG"
    exit 1
fi

cd "$PROJECT_ROOT"
end_timer "frontend_build"
print_success "Frontend build completed in $(format_duration ${TIMINGS[frontend_build]})"

# ----------------------------------------------------------------------------
# Step 7: Build Summary
# ----------------------------------------------------------------------------
end_timer "total"

print_header "Build Summary"

echo -e "${BOLD}Timing Breakdown:${NC}"
echo -e "  Clean:              $(format_duration ${TIMINGS[clean]:-0})"
echo -e "  Rust Linting:       $(format_duration ${TIMINGS[rust_lint]})"
echo -e "  Rust Build:         $(format_duration ${TIMINGS[rust_build]})"
echo -e "  Service Verify:     $(format_duration ${TIMINGS[service_verify]})"
echo -e "  Frontend Linting:   $(format_duration ${TIMINGS[frontend_lint]})"
echo -e "  Frontend Build:     $(format_duration ${TIMINGS[frontend_build]})"
echo -e "  ${BOLD}Total Time:         $(format_duration ${TIMINGS[total]})${NC}"
echo ""

echo -e "${BOLD}Build Artifacts:${NC}"
if [[ "$BUILD_MODE" == "release" ]]; then
    echo -e "  Rust Binaries:      target/release/"
else
    echo -e "  Rust Binaries:      target/debug/"
fi
echo -e "  Frontend Build:     frontend/build/"
echo ""

echo -e "${BOLD}Services Built:${NC}"
for service in "${SERVICES[@]}"; do
    echo -e "  ${GREEN}✓${NC} $service"
done
echo ""

echo -e "${BOLD}Log File:${NC} $BUILD_LOG"
echo ""

print_success "Build completed successfully!"
print_info "To run services: ./scripts/start-services.sh"
print_info "To run tests: ./scripts/test-all.sh"

exit 0
