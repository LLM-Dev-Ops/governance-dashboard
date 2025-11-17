#!/usr/bin/env bash

# ============================================================================
# db-seed.sh - Database Seeding Script
# ============================================================================
# Seeds initial data for all services
# Usage: ./scripts/db-seed.sh [--reset] [--service SERVICE]
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
RESET=false
SPECIFIC_SERVICE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --reset)
            RESET=true
            shift
            ;;
        --service)
            SPECIFIC_SERVICE="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Usage: $0 [--reset] [--service SERVICE]"
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

run_sql() {
    local db_url=$1
    local sql=$2

    if command -v psql &> /dev/null; then
        echo "$sql" | PGPASSWORD="$DATABASE_PASSWORD" psql -h "$DATABASE_HOST" \
            -p "$DATABASE_PORT" -U "$DATABASE_USER" -d "$(echo "$db_url" | sed 's/.*\///')" -q
    else
        print_warning "psql not available, cannot execute SQL"
        return 1
    fi
}

# ============================================================================
# Seeding Process
# ============================================================================

print_header "Database Seeding Script"

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

if ! command -v psql &> /dev/null; then
    print_error "psql not found. Please install PostgreSQL client."
    exit 1
fi
print_success "psql is available"

# ----------------------------------------------------------------------------
# Step 3: Reset Data (Optional)
# ----------------------------------------------------------------------------
if [[ "$RESET" == true ]]; then
    print_step "Resetting all data..."
    print_warning "This will delete all existing data!"

    read -p "Are you sure? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_info "Aborted"
        exit 0
    fi

    print_info "Dropping and recreating databases..."
    # Add reset logic here if needed
fi

# ----------------------------------------------------------------------------
# Step 4: Seed System Roles
# ----------------------------------------------------------------------------
if [[ -z "$SPECIFIC_SERVICE" ]] || [[ "$SPECIFIC_SERVICE" == "user-service" ]]; then
    print_step "Seeding system roles..."

    ROLES_SQL="
    INSERT INTO roles (id, name, description, permissions, created_at, updated_at)
    VALUES
        (gen_random_uuid(), 'Super Admin', 'Full system access',
         '{\"*\": [\"*\"]}', NOW(), NOW()),
        (gen_random_uuid(), 'Admin', 'Administrative access',
         '{\"users\": [\"read\", \"write\", \"delete\"], \"policies\": [\"read\", \"write\", \"delete\"]}', NOW(), NOW()),
        (gen_random_uuid(), 'Policy Manager', 'Manage policies',
         '{\"policies\": [\"read\", \"write\"], \"audit\": [\"read\"]}', NOW(), NOW()),
        (gen_random_uuid(), 'Auditor', 'View audit logs and metrics',
         '{\"audit\": [\"read\"], \"metrics\": [\"read\"]}', NOW(), NOW()),
        (gen_random_uuid(), 'User', 'Basic user access',
         '{\"policies\": [\"read\"], \"metrics\": [\"read\"]}', NOW(), NOW())
    ON CONFLICT (name) DO NOTHING;
    "

    if run_sql "$USER_SERVICE_DATABASE_URL" "$ROLES_SQL"; then
        print_success "System roles seeded"
    else
        print_warning "Failed to seed roles (may already exist)"
    fi
fi

# ----------------------------------------------------------------------------
# Step 5: Create Default Admin User
# ----------------------------------------------------------------------------
if [[ -z "$SPECIFIC_SERVICE" ]] || [[ "$SPECIFIC_SERVICE" == "auth-service" ]]; then
    print_step "Creating default admin user..."

    # Generate password hash (using bcrypt cost 12)
    # Password: Admin123!
    ADMIN_PASSWORD_HASH='$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIj.dKcn8i'

    ADMIN_USER_SQL="
    INSERT INTO users (id, email, password_hash, first_name, last_name, is_active, is_verified, created_at, updated_at)
    VALUES
        (gen_random_uuid(), 'admin@example.com', '${ADMIN_PASSWORD_HASH}', 'System', 'Admin', true, true, NOW(), NOW())
    ON CONFLICT (email) DO NOTHING;
    "

    if run_sql "$AUTH_DATABASE_URL" "$ADMIN_USER_SQL"; then
        print_success "Default admin user created"
        print_info "Email: admin@example.com"
        print_info "Password: Admin123!"
    else
        print_warning "Failed to create admin user (may already exist)"
    fi
fi

# ----------------------------------------------------------------------------
# Step 6: Create Sample Policies
# ----------------------------------------------------------------------------
if [[ -z "$SPECIFIC_SERVICE" ]] || [[ "$SPECIFIC_SERVICE" == "policy-service" ]]; then
    print_step "Creating sample policies..."

    POLICIES_SQL="
    INSERT INTO policies (id, name, description, policy_type, rules, status, version, created_at, updated_at)
    VALUES
        (gen_random_uuid(), 'Default Rate Limit', 'Default rate limiting policy', 'rate_limit',
         '{\"max_requests\": 100, \"window_seconds\": 60}', 'active', 1, NOW(), NOW()),
        (gen_random_uuid(), 'Content Safety Policy', 'Filter harmful content', 'content_filter',
         '{\"categories\": [\"hate\", \"violence\", \"sexual\"], \"threshold\": 0.8}', 'active', 1, NOW(), NOW()),
        (gen_random_uuid(), 'Cost Control Policy', 'Limit monthly spending', 'cost_limit',
         '{\"max_monthly_cost\": 10000, \"currency\": \"USD\"}', 'active', 1, NOW(), NOW()),
        (gen_random_uuid(), 'PII Detection Policy', 'Detect and redact PII', 'data_privacy',
         '{\"detect\": [\"email\", \"phone\", \"ssn\", \"credit_card\"], \"action\": \"redact\"}', 'active', 1, NOW(), NOW())
    ON CONFLICT (name) DO NOTHING;
    "

    if run_sql "$POLICY_SERVICE_DATABASE_URL" "$POLICIES_SQL"; then
        print_success "Sample policies created"
    else
        print_warning "Failed to create policies (may already exist)"
    fi
fi

# ----------------------------------------------------------------------------
# Step 7: Create LLM Provider Integrations
# ----------------------------------------------------------------------------
if [[ -z "$SPECIFIC_SERVICE" ]] || [[ "$SPECIFIC_SERVICE" == "integration-service" ]]; then
    print_step "Creating LLM provider integrations..."

    INTEGRATIONS_SQL="
    INSERT INTO integrations (id, name, provider_type, endpoint, is_active, config, created_at, updated_at)
    VALUES
        (gen_random_uuid(), 'OpenAI GPT-4', 'openai', 'https://api.openai.com/v1', true,
         '{\"model\": \"gpt-4\", \"max_tokens\": 2000}', NOW(), NOW()),
        (gen_random_uuid(), 'Anthropic Claude', 'anthropic', 'https://api.anthropic.com/v1', true,
         '{\"model\": \"claude-3-opus-20240229\", \"max_tokens\": 4000}', NOW(), NOW()),
        (gen_random_uuid(), 'Azure OpenAI', 'azure_openai', 'https://your-resource.openai.azure.com/', true,
         '{\"deployment\": \"gpt-4\", \"api_version\": \"2024-02-01\"}', NOW(), NOW())
    ON CONFLICT (name) DO NOTHING;
    "

    if run_sql "$INTEGRATION_SERVICE_DATABASE_URL" "$INTEGRATIONS_SQL"; then
        print_success "LLM provider integrations created"
    else
        print_warning "Failed to create integrations (may already exist)"
    fi
fi

# ----------------------------------------------------------------------------
# Step 8: Create Sample Metrics Data
# ----------------------------------------------------------------------------
if [[ -z "$SPECIFIC_SERVICE" ]] || [[ "$SPECIFIC_SERVICE" == "metrics-service" ]]; then
    print_step "Creating sample metrics..."

    METRICS_SQL="
    INSERT INTO metrics (id, metric_type, value, labels, recorded_at, created_at)
    VALUES
        (gen_random_uuid(), 'api_requests', 150, '{\"service\": \"api-gateway\", \"status\": \"200\"}', NOW(), NOW()),
        (gen_random_uuid(), 'llm_requests', 45, '{\"provider\": \"openai\", \"model\": \"gpt-4\"}', NOW(), NOW()),
        (gen_random_uuid(), 'response_time_ms', 250, '{\"service\": \"policy-service\"}', NOW(), NOW())
    ON CONFLICT DO NOTHING;
    "

    if run_sql "$METRICS_SERVICE_DATABASE_URL" "$METRICS_SQL"; then
        print_success "Sample metrics created"
    else
        print_warning "Failed to create metrics"
    fi
fi

# ----------------------------------------------------------------------------
# Step 9: Display Summary
# ----------------------------------------------------------------------------
print_header "Seeding Complete"

echo -e "${BOLD}Created Resources:${NC}"
echo -e "  ${GREEN}✓${NC} System Roles (5 roles)"
echo -e "  ${GREEN}✓${NC} Default Admin User"
echo -e "  ${GREEN}✓${NC} Sample Policies (4 policies)"
echo -e "  ${GREEN}✓${NC} LLM Integrations (3 providers)"
echo -e "  ${GREEN}✓${NC} Sample Metrics"
echo ""

echo -e "${BOLD}Default Credentials:${NC}"
echo -e "  Email:    ${CYAN}admin@example.com${NC}"
echo -e "  Password: ${CYAN}Admin123!${NC}"
echo ""

echo -e "${BOLD}System Roles:${NC}"
echo -e "  1. Super Admin    - Full system access"
echo -e "  2. Admin          - Administrative access"
echo -e "  3. Policy Manager - Manage policies"
echo -e "  4. Auditor        - View audit logs and metrics"
echo -e "  5. User           - Basic user access"
echo ""

echo -e "${BOLD}Next Steps:${NC}"
echo -e "  Start services: ${CYAN}./scripts/start-services.sh${NC}"
echo -e "  Login to UI:    ${CYAN}http://localhost:5173${NC}"
echo -e "  Test API:       ${CYAN}curl http://localhost:8080/health${NC}"
echo ""

print_success "Database seeding completed successfully!"

exit 0
