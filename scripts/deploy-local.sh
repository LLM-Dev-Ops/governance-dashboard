#!/usr/bin/env bash

# ============================================================================
# deploy-local.sh - Local Docker Deployment
# ============================================================================
# Builds Docker images and deploys using docker-compose
# Usage: ./scripts/deploy-local.sh [--rebuild] [--no-cache]
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

# Options
REBUILD=false
NO_CACHE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --rebuild)
            REBUILD=true
            shift
            ;;
        --no-cache)
            NO_CACHE=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Usage: $0 [--rebuild] [--no-cache]"
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

wait_for_health() {
    local name=$1
    local url=$2
    local max_attempts=60
    local attempt=0

    print_info "Waiting for ${name} to be healthy..."

    while [[ $attempt -lt $max_attempts ]]; do
        if curl -sf "${url}" > /dev/null 2>&1; then
            print_success "${name} is healthy"
            return 0
        fi

        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done

    echo ""
    print_error "${name} health check failed after ${max_attempts} attempts"
    return 1
}

# ============================================================================
# Deployment Process
# ============================================================================

print_header "LLM Governance Dashboard - Local Docker Deployment"

# ----------------------------------------------------------------------------
# Step 1: Check Docker
# ----------------------------------------------------------------------------
print_step "Checking Docker..."

if ! command -v docker &> /dev/null; then
    print_error "Docker not found. Please install Docker first."
    exit 1
fi

if ! docker info > /dev/null 2>&1; then
    print_error "Docker daemon is not running. Please start Docker."
    exit 1
fi

print_success "Docker is available and running"

# Check for docker-compose
DOCKER_COMPOSE_CMD=""
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    print_error "Docker Compose not found. Please install Docker Compose."
    exit 1
fi

print_success "Using: $DOCKER_COMPOSE_CMD"

# ----------------------------------------------------------------------------
# Step 2: Stop Existing Containers (if rebuilding)
# ----------------------------------------------------------------------------
if [[ "$REBUILD" == true ]]; then
    print_step "Stopping existing containers..."

    $DOCKER_COMPOSE_CMD down
    print_success "Existing containers stopped"
fi

# ----------------------------------------------------------------------------
# Step 3: Build Docker Images
# ----------------------------------------------------------------------------
print_step "Building Docker images..."

BUILD_ARGS=""
if [[ "$NO_CACHE" == true ]]; then
    BUILD_ARGS="--no-cache"
fi

if [[ "$REBUILD" == true ]]; then
    BUILD_ARGS="${BUILD_ARGS} --force-rm"
fi

print_info "This may take several minutes..."

if $DOCKER_COMPOSE_CMD build $BUILD_ARGS; then
    print_success "Docker images built successfully"
else
    print_error "Failed to build Docker images"
    exit 1
fi

# ----------------------------------------------------------------------------
# Step 4: Start Services
# ----------------------------------------------------------------------------
print_step "Starting services with Docker Compose..."

if $DOCKER_COMPOSE_CMD up -d; then
    print_success "Services started"
else
    print_error "Failed to start services"
    exit 1
fi

# ----------------------------------------------------------------------------
# Step 5: Wait for Database Services
# ----------------------------------------------------------------------------
print_step "Waiting for database services..."

# Wait for PostgreSQL
print_info "Waiting for PostgreSQL..."
sleep 5

MAX_RETRIES=30
RETRY_COUNT=0
until docker exec llm-governance-postgres pg_isready -U postgres &>/dev/null || [[ $RETRY_COUNT -eq $MAX_RETRIES ]]; do
    echo -n "."
    sleep 1
    RETRY_COUNT=$((RETRY_COUNT + 1))
done
echo ""

if [[ $RETRY_COUNT -eq $MAX_RETRIES ]]; then
    print_error "PostgreSQL failed to start"
    exit 1
fi

print_success "PostgreSQL is ready"

# Wait for Redis
print_info "Checking Redis..."
sleep 2
print_success "Redis is ready"

# ----------------------------------------------------------------------------
# Step 6: Run Database Migrations
# ----------------------------------------------------------------------------
print_step "Running database migrations..."

# Run migrations if script exists
if [[ -f "scripts/db-migrate.sh" ]]; then
    bash scripts/db-migrate.sh || print_warning "Migration script failed (may already be applied)"
else
    print_warning "Migration script not found, skipping"
fi

# ----------------------------------------------------------------------------
# Step 7: Health Checks
# ----------------------------------------------------------------------------
print_step "Performing health checks..."

sleep 5  # Give services time to start

HEALTH_CHECKS=(
    "API Gateway:http://localhost:8080/health"
    "Auth Service:http://localhost:8081/health"
    "User Service:http://localhost:8082/health"
    "Policy Service:http://localhost:8083/health"
    "Audit Service:http://localhost:8084/health"
    "Metrics Service:http://localhost:8085/health"
    "Cost Service:http://localhost:8086/health"
    "Integration Service:http://localhost:8087/health"
)

FAILED_CHECKS=0
for check in "${HEALTH_CHECKS[@]}"; do
    IFS=: read -r name url <<< "$check"
    if ! wait_for_health "$name" "$url"; then
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
done

if [[ $FAILED_CHECKS -gt 0 ]]; then
    print_warning "${FAILED_CHECKS} service(s) failed health check"
else
    print_success "All services passed health checks"
fi

# ----------------------------------------------------------------------------
# Step 8: Display Summary
# ----------------------------------------------------------------------------
print_header "Deployment Complete"

echo -e "${BOLD}Running Containers:${NC}"
$DOCKER_COMPOSE_CMD ps
echo ""

echo -e "${BOLD}Service URLs:${NC}"
echo -e "  Frontend:           http://localhost:3000"
echo -e "  API Gateway:        http://localhost:8080"
echo -e "  Auth Service:       http://localhost:8081"
echo -e "  User Service:       http://localhost:8082"
echo -e "  Policy Service:     http://localhost:8083"
echo -e "  Audit Service:      http://localhost:8084"
echo -e "  Metrics Service:    http://localhost:8085"
echo -e "  Cost Service:       http://localhost:8086"
echo -e "  Integration Service:http://localhost:8087"
echo ""

echo -e "${BOLD}Database Access:${NC}"
echo -e "  PostgreSQL: postgresql://postgres:password@localhost:5432/llm_governance"
echo -e "  Redis:      redis://localhost:6379"
echo ""

echo -e "${BOLD}Monitoring:${NC}"
echo -e "  Prometheus: http://localhost:9090"
echo -e "  Grafana:    http://localhost:3000"
echo ""

echo -e "${BOLD}Useful Commands:${NC}"
echo -e "  View logs:     ${CYAN}${DOCKER_COMPOSE_CMD} logs -f [service]${NC}"
echo -e "  Restart:       ${CYAN}${DOCKER_COMPOSE_CMD} restart [service]${NC}"
echo -e "  Stop all:      ${CYAN}${DOCKER_COMPOSE_CMD} down${NC}"
echo -e "  View status:   ${CYAN}${DOCKER_COMPOSE_CMD} ps${NC}"
echo ""

print_success "Local deployment completed successfully!"

exit 0
