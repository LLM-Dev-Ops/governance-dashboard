#!/usr/bin/env bash

# ============================================================================
# setup-dev.sh - Development Environment Setup
# ============================================================================
# Sets up the complete development environment
# Usage: ./scripts/setup-dev.sh [--skip-docker] [--no-seed]
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
SKIP_DOCKER=false
SEED_DATA=true

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-docker)
            SKIP_DOCKER=true
            shift
            ;;
        --no-seed)
            SEED_DATA=false
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Usage: $0 [--skip-docker] [--no-seed]"
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

check_command() {
    if command -v "$1" &> /dev/null; then
        print_success "$1 is installed"
        return 0
    else
        print_error "$1 is not installed"
        return 1
    fi
}

check_version() {
    local cmd=$1
    local version=$2
    print_info "$cmd version: $version"
}

# ============================================================================
# Setup Process
# ============================================================================

print_header "LLM Governance Dashboard - Development Environment Setup"

# ----------------------------------------------------------------------------
# Step 1: Check Prerequisites
# ----------------------------------------------------------------------------
print_step "Checking prerequisites..."

MISSING_DEPS=false

# Check Rust
if check_command "rustc"; then
    RUST_VERSION=$(rustc --version)
    check_version "Rust" "$RUST_VERSION"
else
    MISSING_DEPS=true
    print_warning "Install Rust from: https://rustup.rs/"
fi

# Check Cargo
if check_command "cargo"; then
    CARGO_VERSION=$(cargo --version)
    check_version "Cargo" "$CARGO_VERSION"
fi

# Check Node.js
if check_command "node"; then
    NODE_VERSION=$(node --version)
    check_version "Node.js" "$NODE_VERSION"
else
    MISSING_DEPS=true
    print_warning "Install Node.js from: https://nodejs.org/"
fi

# Check npm
if check_command "npm"; then
    NPM_VERSION=$(npm --version)
    check_version "npm" "$NPM_VERSION"
fi

# Check Docker
if [[ "$SKIP_DOCKER" == false ]]; then
    if check_command "docker"; then
        DOCKER_VERSION=$(docker --version)
        check_version "Docker" "$DOCKER_VERSION"
    else
        MISSING_DEPS=true
        print_warning "Install Docker from: https://docker.com/"
    fi

    # Check Docker Compose
    if check_command "docker-compose" || docker compose version &> /dev/null; then
        if docker compose version &> /dev/null; then
            COMPOSE_VERSION=$(docker compose version)
        else
            COMPOSE_VERSION=$(docker-compose --version)
        fi
        check_version "Docker Compose" "$COMPOSE_VERSION"
    else
        MISSING_DEPS=true
        print_warning "Install Docker Compose"
    fi
fi

# Check PostgreSQL client
if check_command "psql"; then
    PSQL_VERSION=$(psql --version)
    check_version "PostgreSQL client" "$PSQL_VERSION"
else
    print_warning "PostgreSQL client not found (optional)"
fi

# Check Redis client
if check_command "redis-cli"; then
    REDIS_VERSION=$(redis-cli --version)
    check_version "Redis CLI" "$REDIS_VERSION"
else
    print_warning "Redis CLI not found (optional)"
fi

echo ""

if [[ "$MISSING_DEPS" == true ]]; then
    print_error "Missing required dependencies. Please install them first."
    exit 1
fi

# ----------------------------------------------------------------------------
# Step 2: Install Rust Dependencies
# ----------------------------------------------------------------------------
print_step "Installing Rust dependencies..."

# Install cargo-watch for development
if ! command -v cargo-watch &> /dev/null; then
    print_info "Installing cargo-watch..."
    cargo install cargo-watch
else
    print_success "cargo-watch already installed"
fi

# Install cargo-llvm-cov for coverage
if ! command -v cargo-llvm-cov &> /dev/null; then
    print_info "Installing cargo-llvm-cov..."
    cargo install cargo-llvm-cov
else
    print_success "cargo-llvm-cov already installed"
fi

# Install sqlx-cli for migrations
if ! command -v sqlx &> /dev/null; then
    print_info "Installing sqlx-cli..."
    cargo install sqlx-cli --no-default-features --features postgres
else
    print_success "sqlx-cli already installed"
fi

print_success "Rust dependencies installed"

# ----------------------------------------------------------------------------
# Step 3: Install Node.js Dependencies
# ----------------------------------------------------------------------------
print_step "Installing Node.js dependencies..."

# Root dependencies (if any)
if [[ -f "package.json" ]]; then
    print_info "Installing root dependencies..."
    npm install
fi

# Frontend dependencies
if [[ -d "frontend" ]]; then
    print_info "Installing frontend dependencies..."
    cd "$PROJECT_ROOT/frontend"
    npm install
    cd "$PROJECT_ROOT"
fi

print_success "Node.js dependencies installed"

# ----------------------------------------------------------------------------
# Step 4: Create Environment Files
# ----------------------------------------------------------------------------
print_step "Creating environment files..."

if [[ ! -f ".env" ]]; then
    if [[ -f ".env.example" ]]; then
        print_info "Creating .env from .env.example..."
        cp .env.example .env
        print_success ".env file created"
        print_warning "Please update .env with your actual configuration"
    else
        print_warning ".env.example not found, skipping .env creation"
    fi
else
    print_success ".env file already exists"
fi

# Create logs directory
mkdir -p logs/{build,test,services}
print_success "Log directories created"

# Create coverage directory
mkdir -p coverage
print_success "Coverage directory created"

# ----------------------------------------------------------------------------
# Step 5: Start PostgreSQL and Redis with Docker
# ----------------------------------------------------------------------------
if [[ "$SKIP_DOCKER" == false ]]; then
    print_step "Starting PostgreSQL and Redis containers..."

    # Check if docker-compose.yml exists
    if [[ -f "docker-compose.yml" ]]; then
        print_info "Starting database services..."

        # Start only PostgreSQL and Redis
        if docker compose up -d postgres redis 2>/dev/null || docker-compose up -d postgres redis 2>/dev/null; then
            print_success "Database services started"

            # Wait for PostgreSQL to be ready
            print_info "Waiting for PostgreSQL to be ready..."
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

            # Wait for Redis to be ready
            print_info "Waiting for Redis to be ready..."
            sleep 2
            print_success "Redis is ready"
        else
            print_error "Failed to start database services"
            exit 1
        fi
    else
        print_warning "docker-compose.yml not found, skipping container startup"
    fi
else
    print_info "Skipping Docker setup (--skip-docker flag set)"
fi

# ----------------------------------------------------------------------------
# Step 6: Run Database Migrations
# ----------------------------------------------------------------------------
print_step "Running database migrations..."

if [[ -f "scripts/db-migrate.sh" ]]; then
    print_info "Executing migration script..."
    bash scripts/db-migrate.sh
else
    print_warning "Migration script not found"
    print_info "To run migrations manually, use: sqlx migrate run"
fi

# ----------------------------------------------------------------------------
# Step 7: Seed Initial Data
# ----------------------------------------------------------------------------
if [[ "$SEED_DATA" == true ]]; then
    print_step "Seeding initial data..."

    if [[ -f "scripts/db-seed.sh" ]]; then
        print_info "Executing seed script..."
        bash scripts/db-seed.sh
    else
        print_warning "Seed script not found"
    fi
else
    print_info "Skipping data seeding (--no-seed flag set)"
fi

# ----------------------------------------------------------------------------
# Step 8: Build Project
# ----------------------------------------------------------------------------
print_step "Building project..."

print_info "Running initial build (this may take a while)..."
if cargo build; then
    print_success "Rust workspace built successfully"
else
    print_error "Build failed"
    exit 1
fi

if [[ -d "frontend" ]]; then
    print_info "Building frontend..."
    cd "$PROJECT_ROOT/frontend"
    if npm run build; then
        print_success "Frontend built successfully"
    else
        print_warning "Frontend build failed (non-critical)"
    fi
    cd "$PROJECT_ROOT"
fi

# ----------------------------------------------------------------------------
# Step 9: Display Summary
# ----------------------------------------------------------------------------
print_header "Setup Complete!"

echo -e "${BOLD}Development Environment Ready${NC}\n"

echo -e "${BOLD}Service URLs:${NC}"
echo -e "  API Gateway:        http://localhost:8080"
echo -e "  Auth Service:       http://localhost:8081"
echo -e "  User Service:       http://localhost:8082"
echo -e "  Policy Service:     http://localhost:8083"
echo -e "  Audit Service:      http://localhost:8084"
echo -e "  Metrics Service:    http://localhost:8085"
echo -e "  Cost Service:       http://localhost:8086"
echo -e "  Integration Service:http://localhost:8087"
echo -e "  Frontend:           http://localhost:5173"
echo ""

if [[ "$SKIP_DOCKER" == false ]]; then
    echo -e "${BOLD}Database Connections:${NC}"
    echo -e "  PostgreSQL:  postgresql://postgres:password@localhost:5432/llm_governance"
    echo -e "  Redis:       redis://127.0.0.1:6379"
    echo ""
fi

echo -e "${BOLD}Default Credentials (if seeded):${NC}"
echo -e "  Admin Email:    admin@example.com"
echo -e "  Admin Password: Admin123!"
echo ""

echo -e "${BOLD}Next Steps:${NC}"
echo -e "  1. Review and update .env file with your configuration"
echo -e "  2. Start all services:  ${CYAN}./scripts/start-services.sh${NC}"
echo -e "  3. Run tests:           ${CYAN}./scripts/test-all.sh${NC}"
echo -e "  4. Build everything:    ${CYAN}./scripts/build-all.sh${NC}"
echo ""

echo -e "${BOLD}Useful Commands:${NC}"
echo -e "  make dev        - Start development mode"
echo -e "  make test       - Run all tests"
echo -e "  make build      - Build everything"
echo -e "  make clean      - Clean build artifacts"
echo ""

print_success "Development environment setup complete!"

exit 0
