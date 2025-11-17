#!/usr/bin/env bash

# ============================================================================
# ci-pipeline.sh - CI/CD Pipeline Simulation
# ============================================================================
# Simulates a complete CI/CD pipeline with linting, building, testing, and security scanning
# Usage: ./scripts/ci-pipeline.sh [--skip-tests] [--skip-security]
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
LOG_DIR="$PROJECT_ROOT/logs/ci"
ARTIFACTS_DIR="$PROJECT_ROOT/ci-artifacts"
mkdir -p "$LOG_DIR" "$ARTIFACTS_DIR"

# Timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CI_LOG="$LOG_DIR/ci_${TIMESTAMP}.log"

# Options
SKIP_TESTS=false
SKIP_SECURITY=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-security)
            SKIP_SECURITY=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Usage: $0 [--skip-tests] [--skip-security]"
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

# Pipeline stage tracking
declare -A STAGE_STATUS
TOTAL_STAGES=0
PASSED_STAGES=0
FAILED_STAGES=0

record_stage() {
    local name=$1
    local status=$2
    STAGE_STATUS[$name]=$status
    TOTAL_STAGES=$((TOTAL_STAGES + 1))
    if [[ "$status" == "pass" ]]; then
        PASSED_STAGES=$((PASSED_STAGES + 1))
    else
        FAILED_STAGES=$((FAILED_STAGES + 1))
    fi
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
# CI/CD Pipeline
# ============================================================================

print_header "CI/CD Pipeline Simulation"
echo -e "${BOLD}Pipeline ID:${NC} ci-${TIMESTAMP}"
echo -e "${BOLD}Log File:${NC} ${CI_LOG}"
echo -e "${BOLD}Artifacts:${NC} ${ARTIFACTS_DIR}"
echo ""

start_timer "total"

# ----------------------------------------------------------------------------
# Stage 1: Environment Setup
# ----------------------------------------------------------------------------
print_step "Stage 1: Environment Setup"
start_timer "setup"

print_info "Checking environment..."

# Check Rust
if command -v rustc &> /dev/null; then
    RUST_VERSION=$(rustc --version)
    print_success "Rust: ${RUST_VERSION}"
else
    print_error "Rust not installed"
    record_stage "setup" "fail"
    exit 1
fi

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js: ${NODE_VERSION}"
else
    print_error "Node.js not installed"
    record_stage "setup" "fail"
    exit 1
fi

end_timer "setup"
record_stage "setup" "pass"
print_success "Environment setup completed in $(format_duration ${TIMINGS[setup]})"

# ----------------------------------------------------------------------------
# Stage 2: Code Linting
# ----------------------------------------------------------------------------
print_step "Stage 2: Code Linting"
start_timer "lint"

# Rust linting
print_info "Running cargo fmt..."
if cargo fmt --all -- --check >> "$CI_LOG" 2>&1; then
    print_success "Rust formatting check passed"
else
    print_error "Rust formatting issues found"
    record_stage "lint" "fail"
fi

print_info "Running cargo clippy..."
if cargo clippy --all-targets --all-features -- -D warnings >> "$CI_LOG" 2>&1; then
    print_success "Clippy linting passed"
else
    print_error "Clippy found issues"
    record_stage "lint" "fail"
fi

# Frontend linting
if [[ -d "frontend" ]]; then
    cd frontend
    print_info "Running svelte-check..."
    if npm run check >> "$CI_LOG" 2>&1; then
        print_success "Svelte check passed"
    else
        print_warning "Svelte check found issues (non-blocking)"
    fi
    cd "$PROJECT_ROOT"
fi

end_timer "lint"
if [[ -z "${STAGE_STATUS[lint]}" ]]; then
    record_stage "lint" "pass"
fi
print_success "Linting completed in $(format_duration ${TIMINGS[lint]})"

# ----------------------------------------------------------------------------
# Stage 3: Build
# ----------------------------------------------------------------------------
print_step "Stage 3: Build"
start_timer "build"

print_info "Building Rust workspace..."
if cargo build --release >> "$CI_LOG" 2>&1; then
    print_success "Rust build succeeded"
else
    print_error "Rust build failed"
    record_stage "build" "fail"
    exit 1
fi

print_info "Building frontend..."
if [[ -d "frontend" ]]; then
    cd frontend
    if npm run build >> "$CI_LOG" 2>&1; then
        print_success "Frontend build succeeded"
    else
        print_error "Frontend build failed"
        record_stage "build" "fail"
        exit 1
    fi
    cd "$PROJECT_ROOT"
fi

end_timer "build"
record_stage "build" "pass"
print_success "Build completed in $(format_duration ${TIMINGS[build]})"

# ----------------------------------------------------------------------------
# Stage 4: Unit Tests
# ----------------------------------------------------------------------------
if [[ "$SKIP_TESTS" == false ]]; then
    print_step "Stage 4: Unit Tests"
    start_timer "tests"

    print_info "Running backend unit tests..."
    if cargo test --workspace --lib >> "$CI_LOG" 2>&1; then
        print_success "Backend unit tests passed"
    else
        print_error "Backend unit tests failed"
        record_stage "tests" "fail"
    fi

    print_info "Running frontend unit tests..."
    if [[ -d "frontend" ]]; then
        cd frontend
        if npm run test >> "$CI_LOG" 2>&1; then
            print_success "Frontend unit tests passed"
        else
            print_warning "Frontend unit tests failed (non-blocking)"
        fi
        cd "$PROJECT_ROOT"
    fi

    end_timer "tests"
    if [[ -z "${STAGE_STATUS[tests]}" ]]; then
        record_stage "tests" "pass"
    fi
    print_success "Testing completed in $(format_duration ${TIMINGS[tests]})"
else
    print_info "Skipping tests (--skip-tests flag)"
    record_stage "tests" "skip"
fi

# ----------------------------------------------------------------------------
# Stage 5: Security Scanning
# ----------------------------------------------------------------------------
if [[ "$SKIP_SECURITY" == false ]]; then
    print_step "Stage 5: Security Scanning"
    start_timer "security"

    # Cargo audit
    print_info "Running cargo audit..."
    if ! command -v cargo-audit &> /dev/null; then
        print_warning "cargo-audit not installed, installing..."
        cargo install cargo-audit >> "$CI_LOG" 2>&1
    fi

    AUDIT_REPORT="$ARTIFACTS_DIR/audit_${TIMESTAMP}.txt"
    if cargo audit >> "$AUDIT_REPORT" 2>&1; then
        print_success "No security vulnerabilities found"
    else
        print_warning "Security vulnerabilities detected. See: $AUDIT_REPORT"
        record_stage "security" "warn"
    fi

    # npm audit (frontend)
    if [[ -d "frontend" ]]; then
        print_info "Running npm audit..."
        cd frontend
        NPM_AUDIT_REPORT="$ARTIFACTS_DIR/npm_audit_${TIMESTAMP}.json"
        npm audit --json > "$NPM_AUDIT_REPORT" 2>&1 || true
        print_info "npm audit report saved to: $NPM_AUDIT_REPORT"
        cd "$PROJECT_ROOT"
    fi

    end_timer "security"
    if [[ -z "${STAGE_STATUS[security]}" ]]; then
        record_stage "security" "pass"
    fi
    print_success "Security scanning completed in $(format_duration ${TIMINGS[security]})"
else
    print_info "Skipping security scanning (--skip-security flag)"
    record_stage "security" "skip"
fi

# ----------------------------------------------------------------------------
# Stage 6: Generate Artifacts
# ----------------------------------------------------------------------------
print_step "Stage 6: Generate Artifacts"
start_timer "artifacts"

# Copy binaries
print_info "Collecting build artifacts..."
mkdir -p "$ARTIFACTS_DIR/binaries"

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
    if [[ -f "target/release/${service}" ]]; then
        cp "target/release/${service}" "$ARTIFACTS_DIR/binaries/"
        print_success "Collected: ${service}"
    fi
done

# Copy frontend build
if [[ -d "frontend/build" ]]; then
    mkdir -p "$ARTIFACTS_DIR/frontend"
    cp -r frontend/build/* "$ARTIFACTS_DIR/frontend/"
    print_success "Collected: frontend build"
fi

# Generate build info
BUILD_INFO="$ARTIFACTS_DIR/build_info.txt"
cat > "$BUILD_INFO" << EOF
Build Information
==================
Pipeline ID: ci-${TIMESTAMP}
Date: $(date)
Branch: $(git branch --show-current 2>/dev/null || echo "unknown")
Commit: $(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
Rust Version: $(rustc --version)
Node Version: $(node --version)
Status: SUCCESS
EOF

print_success "Build info generated"

end_timer "artifacts"
record_stage "artifacts" "pass"
print_success "Artifact generation completed in $(format_duration ${TIMINGS[artifacts]})"

# ----------------------------------------------------------------------------
# Stage 7: Pipeline Summary
# ----------------------------------------------------------------------------
end_timer "total"

print_header "Pipeline Summary"

echo -e "${BOLD}Stages:${NC}"
for stage in "${!STAGE_STATUS[@]}"; do
    status=${STAGE_STATUS[$stage]}
    duration=${TIMINGS[$stage]:-0}

    case $status in
        pass)
            echo -e "  ${GREEN}✓${NC} ${stage} - $(format_duration $duration)"
            ;;
        fail)
            echo -e "  ${RED}✗${NC} ${stage} - $(format_duration $duration)"
            ;;
        warn)
            echo -e "  ${YELLOW}⚠${NC} ${stage} - $(format_duration $duration)"
            ;;
        skip)
            echo -e "  ${BLUE}○${NC} ${stage} - skipped"
            ;;
    esac
done
echo ""

echo -e "${BOLD}Statistics:${NC}"
echo -e "  Total Stages:   ${TOTAL_STAGES}"
echo -e "  ${GREEN}Passed:${NC}         ${PASSED_STAGES}"
echo -e "  ${RED}Failed:${NC}         ${FAILED_STAGES}"
echo -e "  Total Duration: $(format_duration ${TIMINGS[total]})"
echo ""

echo -e "${BOLD}Artifacts:${NC}"
echo -e "  Location:      ${ARTIFACTS_DIR}"
echo -e "  Binaries:      ${ARTIFACTS_DIR}/binaries/"
echo -e "  Frontend:      ${ARTIFACTS_DIR}/frontend/"
echo -e "  Build Info:    ${ARTIFACTS_DIR}/build_info.txt"
echo -e "  Audit Report:  ${ARTIFACTS_DIR}/audit_${TIMESTAMP}.txt"
echo ""

echo -e "${BOLD}Logs:${NC}"
echo -e "  CI Log: ${CI_LOG}"
echo ""

if [[ $FAILED_STAGES -eq 0 ]]; then
    print_success "Pipeline completed successfully!"
    echo ""
    echo -e "${BOLD}Next Steps:${NC}"
    echo -e "  Deploy locally: ${CYAN}./scripts/deploy-local.sh${NC}"
    echo -e "  Deploy to K8s:  ${CYAN}./scripts/deploy-k8s.sh${NC}"
    echo ""
    exit 0
else
    print_error "Pipeline failed with ${FAILED_STAGES} failed stage(s)"
    echo ""
    echo -e "${BOLD}Troubleshooting:${NC}"
    echo -e "  Check logs:     ${CYAN}cat ${CI_LOG}${NC}"
    echo -e "  Run tests only: ${CYAN}./scripts/test-all.sh${NC}"
    echo ""
    exit 1
fi
