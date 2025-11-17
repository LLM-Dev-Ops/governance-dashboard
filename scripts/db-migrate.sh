#!/usr/bin/env bash

# ============================================================================
# db-migrate.sh - Database Migration Script
# ============================================================================
# Runs pending database migrations for all services
# Usage: ./scripts/db-migrate.sh [--rollback] [--service SERVICE]
# ============================================================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Options
ROLLBACK=false
SPECIFIC_SERVICE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --rollback)
            ROLLBACK=true
            shift
            ;;
        --service)
            SPECIFIC_SERVICE="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Usage: $0 [--rollback] [--service SERVICE]"
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

# ============================================================================
# Migration Process
# ============================================================================

print_header "Database Migration Script"

# ----------------------------------------------------------------------------
# Step 1: Load Environment Variables
# ----------------------------------------------------------------------------
print_step "Loading environment variables..."

if [[ -f ".env" ]]; then
    set -a
    source .env
    set +a
    print_success "Environment variables loaded"
else
    print_error ".env file not found"
    exit 1
fi

# ----------------------------------------------------------------------------
# Step 2: Check Prerequisites
# ----------------------------------------------------------------------------
print_step "Checking prerequisites..."

if ! command -v sqlx &> /dev/null; then
    print_error "sqlx-cli not found. Installing..."
    cargo install sqlx-cli --no-default-features --features postgres
fi
print_success "sqlx-cli is available"

# Check PostgreSQL connectivity
print_info "Checking PostgreSQL connectivity..."
if command -v psql &> /dev/null; then
    if PGPASSWORD="$DATABASE_PASSWORD" psql -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER" -d postgres -c "SELECT 1" &> /dev/null; then
        print_success "PostgreSQL is accessible"
    else
        print_error "Cannot connect to PostgreSQL. Make sure it's running."
        exit 1
    fi
else
    print_warning "psql not found, skipping connectivity check"
fi

# ----------------------------------------------------------------------------
# Step 3: Define Database Services
# ----------------------------------------------------------------------------
declare -A DATABASES=(
    ["auth-service"]="${AUTH_DATABASE_URL}"
    ["user-service"]="${USER_SERVICE_DATABASE_URL}"
    ["policy-service"]="${POLICY_SERVICE_DATABASE_URL}"
    ["audit-service"]="${AUDIT_SERVICE_DATABASE_URL}"
    ["metrics-service"]="${METRICS_SERVICE_DATABASE_URL}"
    ["cost-service"]="${COST_SERVICE_DATABASE_URL}"
    ["api-gateway"]="${API_GATEWAY_DATABASE_URL}"
    ["integration-service"]="${INTEGRATION_SERVICE_DATABASE_URL}"
)

# ----------------------------------------------------------------------------
# Step 4: Run Migrations
# ----------------------------------------------------------------------------
print_step "Running migrations..."

FAILED_MIGRATIONS=0

for service in "${!DATABASES[@]}"; do
    # Skip if specific service is set and this isn't it
    if [[ -n "$SPECIFIC_SERVICE" ]] && [[ "$service" != "$SPECIFIC_SERVICE" ]]; then
        continue
    fi

    db_url="${DATABASES[$service]}"
    migration_dir="database/migrations/${service}"

    echo ""
    print_info "Processing ${service}..."

    # Check if migration directory exists
    if [[ ! -d "$migration_dir" ]]; then
        print_warning "Migration directory not found: ${migration_dir}"
        continue
    fi

    # Create database if it doesn't exist
    db_name=$(echo "$db_url" | sed 's/.*\///')
    print_info "Ensuring database exists: ${db_name}..."

    if command -v psql &> /dev/null; then
        PGPASSWORD="$DATABASE_PASSWORD" psql -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER" -d postgres \
            -c "CREATE DATABASE ${db_name};" 2>/dev/null || print_info "Database already exists"
    fi

    # Run migrations or rollback
    if [[ "$ROLLBACK" == true ]]; then
        print_info "Rolling back last migration for ${service}..."

        if DATABASE_URL="$db_url" sqlx migrate revert --source "$migration_dir"; then
            print_success "${service}: Migration rolled back"
        else
            print_error "${service}: Rollback failed"
            FAILED_MIGRATIONS=$((FAILED_MIGRATIONS + 1))
        fi
    else
        print_info "Running migrations for ${service}..."

        if DATABASE_URL="$db_url" sqlx migrate run --source "$migration_dir"; then
            print_success "${service}: Migrations applied"
        else
            print_error "${service}: Migration failed"
            FAILED_MIGRATIONS=$((FAILED_MIGRATIONS + 1))
        fi
    fi

    # Show migration status
    print_info "Current migration status:"
    DATABASE_URL="$db_url" sqlx migrate info --source "$migration_dir" || true
done

# ----------------------------------------------------------------------------
# Step 5: Verify Schema
# ----------------------------------------------------------------------------
print_step "Verifying database schemas..."

for service in "${!DATABASES[@]}"; do
    if [[ -n "$SPECIFIC_SERVICE" ]] && [[ "$service" != "$SPECIFIC_SERVICE" ]]; then
        continue
    fi

    db_url="${DATABASES[$service]}"

    if command -v psql &> /dev/null; then
        db_name=$(echo "$db_url" | sed 's/.*\///')
        table_count=$(PGPASSWORD="$DATABASE_PASSWORD" psql -h "$DATABASE_HOST" -p "$DATABASE_PORT" \
            -U "$DATABASE_USER" -d "$db_name" -t \
            -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ' || echo "0")

        print_info "${service}: ${table_count} tables"
    fi
done

# ----------------------------------------------------------------------------
# Step 6: Summary
# ----------------------------------------------------------------------------
print_header "Migration Summary"

if [[ $FAILED_MIGRATIONS -eq 0 ]]; then
    print_success "All migrations completed successfully!"

    echo ""
    echo -e "${BOLD}Next Steps:${NC}"
    echo -e "  Seed data:     ${CYAN}./scripts/db-seed.sh${NC}"
    echo -e "  Start services:${CYAN}./scripts/start-services.sh${NC}"
    echo ""

    exit 0
else
    print_error "${FAILED_MIGRATIONS} migration(s) failed"
    echo ""
    echo -e "${BOLD}Troubleshooting:${NC}"
    echo -e "  Check database logs"
    echo -e "  Verify .env configuration"
    echo -e "  Ensure PostgreSQL is running"
    echo ""

    exit 1
fi
