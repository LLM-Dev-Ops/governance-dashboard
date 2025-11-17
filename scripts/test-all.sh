#!/usr/bin/env bash

# ============================================================================
# test-all.sh - Master Test Script
# ============================================================================
# Runs all tests (backend, frontend, integration, E2E) with coverage
# Usage: ./scripts/test-all.sh [--coverage] [--no-e2e] [--verbose]
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
LOG_DIR="$PROJECT_ROOT/logs/test"
COVERAGE_DIR="$PROJECT_ROOT/coverage"
mkdir -p "$LOG_DIR" "$COVERAGE_DIR"

# Timestamp for logs
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TEST_LOG="$LOG_DIR/test_${TIMESTAMP}.log"

# Options
GENERATE_COVERAGE=false
RUN_E2E=true
VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --coverage)
            GENERATE_COVERAGE=true
            shift
            ;;
        --no-e2e)
            RUN_E2E=false
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Usage: $0 [--coverage] [--no-e2e] [--verbose]"
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

# Test result tracking
declare -A TEST_RESULTS
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

record_result() {
    local name=$1
    local status=$2
    TEST_RESULTS[$name]=$status
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [[ "$status" == "pass" ]]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# ============================================================================
# Test Process
# ============================================================================

print_header "LLM Governance Dashboard - Master Test Script"
echo -e "${BOLD}Generate Coverage:${NC} ${GENERATE_COVERAGE}"
echo -e "${BOLD}Run E2E Tests:${NC} ${RUN_E2E}"
echo -e "${BOLD}Verbose Mode:${NC} ${VERBOSE}"
echo -e "${BOLD}Log File:${NC} ${TEST_LOG}"
echo ""

start_timer "total"

# ----------------------------------------------------------------------------
# Step 1: Backend Unit Tests
# ----------------------------------------------------------------------------
print_step "Running backend unit tests..."
start_timer "backend_unit"

CARGO_TEST_FLAGS=""
if [[ "$VERBOSE" == true ]]; then
    CARGO_TEST_FLAGS="-- --nocapture"
fi

if [[ "$GENERATE_COVERAGE" == true ]]; then
    print_info "Running with coverage (using cargo-llvm-cov)..."

    # Check if cargo-llvm-cov is installed
    if ! command -v cargo-llvm-cov &> /dev/null; then
        print_warning "cargo-llvm-cov not found. Installing..."
        cargo install cargo-llvm-cov >> "$TEST_LOG" 2>&1
    fi

    if cargo llvm-cov test --workspace --lib --html --output-dir "$COVERAGE_DIR/backend" $CARGO_TEST_FLAGS >> "$TEST_LOG" 2>&1; then
        print_success "Backend unit tests passed"
        record_result "backend_unit" "pass"
    else
        print_error "Backend unit tests failed. Check log: $TEST_LOG"
        record_result "backend_unit" "fail"
    fi
else
    if cargo test --workspace --lib $CARGO_TEST_FLAGS >> "$TEST_LOG" 2>&1; then
        print_success "Backend unit tests passed"
        record_result "backend_unit" "pass"
    else
        print_error "Backend unit tests failed. Check log: $TEST_LOG"
        record_result "backend_unit" "fail"
    fi
fi

end_timer "backend_unit"
print_success "Backend unit tests completed in $(format_duration ${TIMINGS[backend_unit]})"

# ----------------------------------------------------------------------------
# Step 2: Backend Integration Tests
# ----------------------------------------------------------------------------
print_step "Running backend integration tests..."
start_timer "backend_integration"

print_info "Checking test database availability..."

# Note: Integration tests require PostgreSQL and Redis
if cargo test --workspace --test '*' $CARGO_TEST_FLAGS >> "$TEST_LOG" 2>&1; then
    print_success "Backend integration tests passed"
    record_result "backend_integration" "pass"
else
    print_warning "Backend integration tests failed or skipped (may need services running)"
    record_result "backend_integration" "fail"
fi

end_timer "backend_integration"
print_success "Backend integration tests completed in $(format_duration ${TIMINGS[backend_integration]})"

# ----------------------------------------------------------------------------
# Step 3: Frontend Unit Tests
# ----------------------------------------------------------------------------
print_step "Running frontend unit tests..."
start_timer "frontend_unit"

cd "$PROJECT_ROOT/frontend"

# Check if node_modules exists
if [[ ! -d "node_modules" ]]; then
    print_warning "node_modules not found. Installing dependencies..."
    npm install >> "$TEST_LOG" 2>&1
fi

TEST_CMD="test"
if [[ "$GENERATE_COVERAGE" == true ]]; then
    TEST_CMD="test:coverage"
    print_info "Running with coverage..."
fi

if npm run $TEST_CMD >> "$TEST_LOG" 2>&1; then
    print_success "Frontend unit tests passed"
    record_result "frontend_unit" "pass"
else
    print_error "Frontend unit tests failed. Check log: $TEST_LOG"
    record_result "frontend_unit" "fail"
fi

# Copy coverage if generated
if [[ "$GENERATE_COVERAGE" == true ]] && [[ -d "coverage" ]]; then
    cp -r coverage "$COVERAGE_DIR/frontend"
fi

cd "$PROJECT_ROOT"
end_timer "frontend_unit"
print_success "Frontend unit tests completed in $(format_duration ${TIMINGS[frontend_unit]})"

# ----------------------------------------------------------------------------
# Step 4: Frontend E2E Tests
# ----------------------------------------------------------------------------
if [[ "$RUN_E2E" == true ]]; then
    print_step "Running frontend E2E tests..."
    start_timer "frontend_e2e"

    cd "$PROJECT_ROOT/frontend"

    print_info "Checking Playwright installation..."
    if ! npx playwright --version &> /dev/null; then
        print_warning "Installing Playwright browsers..."
        npx playwright install >> "$TEST_LOG" 2>&1
    fi

    # Note: E2E tests may require services to be running
    print_warning "E2E tests require services to be running. Attempting to run..."

    if npm run test:e2e >> "$TEST_LOG" 2>&1; then
        print_success "Frontend E2E tests passed"
        record_result "frontend_e2e" "pass"
    else
        print_warning "Frontend E2E tests failed (may need services running)"
        record_result "frontend_e2e" "fail"
    fi

    cd "$PROJECT_ROOT"
    end_timer "frontend_e2e"
    print_success "Frontend E2E tests completed in $(format_duration ${TIMINGS[frontend_e2e]})"
else
    print_info "Skipping E2E tests (--no-e2e flag set)"
fi

# ----------------------------------------------------------------------------
# Step 5: Test Summary
# ----------------------------------------------------------------------------
end_timer "total"

print_header "Test Summary"

echo -e "${BOLD}Test Results:${NC}"
for test_name in "${!TEST_RESULTS[@]}"; do
    status=${TEST_RESULTS[$test_name]}
    if [[ "$status" == "pass" ]]; then
        echo -e "  ${GREEN}✓${NC} ${test_name}"
    else
        echo -e "  ${RED}✗${NC} ${test_name}"
    fi
done
echo ""

echo -e "${BOLD}Statistics:${NC}"
echo -e "  Total Test Suites:  ${TOTAL_TESTS}"
echo -e "  ${GREEN}Passed:${NC}             ${PASSED_TESTS}"
echo -e "  ${RED}Failed:${NC}             ${FAILED_TESTS}"
echo ""

echo -e "${BOLD}Timing Breakdown:${NC}"
echo -e "  Backend Unit:       $(format_duration ${TIMINGS[backend_unit]})"
echo -e "  Backend Integration:$(format_duration ${TIMINGS[backend_integration]})"
echo -e "  Frontend Unit:      $(format_duration ${TIMINGS[frontend_unit]})"
if [[ "$RUN_E2E" == true ]]; then
    echo -e "  Frontend E2E:       $(format_duration ${TIMINGS[frontend_e2e]:-0})"
fi
echo -e "  ${BOLD}Total Time:         $(format_duration ${TIMINGS[total]})${NC}"
echo ""

if [[ "$GENERATE_COVERAGE" == true ]]; then
    echo -e "${BOLD}Coverage Reports:${NC}"
    echo -e "  Backend:  $COVERAGE_DIR/backend/html/index.html"
    echo -e "  Frontend: $COVERAGE_DIR/frontend/index.html"
    echo ""
fi

echo -e "${BOLD}Log File:${NC} $TEST_LOG"
echo ""

if [[ $FAILED_TESTS -eq 0 ]]; then
    print_success "All tests passed!"
    exit 0
else
    print_error "$FAILED_TESTS test suite(s) failed. Check logs for details."
    exit 1
fi
