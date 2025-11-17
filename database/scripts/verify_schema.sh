#!/bin/bash
# verify_schema.sh
# Script to verify database schema integrity

set -e

# Load environment variables
if [ -f ../.env ]; then
    export $(cat ../.env | grep -v '^#' | xargs)
fi

# Default values
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-llm_governance}
DB_USER=${DB_USER:-postgres}

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}=== Database Schema Verification ===${NC}"
echo ""

# Check database connection
echo -e "${BLUE}Testing database connection...${NC}"
if ! PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c '\q' 2>/dev/null; then
    echo -e "${RED}✗ Cannot connect to database${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Database connection successful${NC}"
echo ""

# Check extensions
echo -e "${BLUE}Checking extensions...${NC}"
EXTENSIONS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto', 'timescaledb', 'pg_trgm', 'btree_gist');")
EXPECTED_EXTENSIONS=("uuid-ossp" "pgcrypto" "timescaledb" "pg_trgm" "btree_gist")

for ext in "${EXPECTED_EXTENSIONS[@]}"; do
    if echo "$EXTENSIONS" | grep -q "^$ext$"; then
        echo -e "${GREEN}✓ Extension $ext is installed${NC}"
    else
        echo -e "${RED}✗ Extension $ext is missing${NC}"
    fi
done
echo ""

# Check tables
echo -e "${BLUE}Checking tables...${NC}"
TABLES=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;")
EXPECTED_TABLES=("alerts" "alert_subscriptions" "api_keys" "audit_logs" "llm_metrics" "mfa_secrets" "policies" "policy_assignments" "roles" "sessions" "system_metrics" "team_members" "teams" "user_roles" "users")

for table in "${EXPECTED_TABLES[@]}"; do
    if echo "$TABLES" | grep -q "^$table$"; then
        echo -e "${GREEN}✓ Table $table exists${NC}"
    else
        echo -e "${RED}✗ Table $table is missing${NC}"
    fi
done
echo ""

# Check views
echo -e "${BLUE}Checking views...${NC}"
VIEWS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT viewname FROM pg_views WHERE schemaname = 'public' ORDER BY viewname;")
EXPECTED_VIEWS=("active_sessions_view" "alert_summary_view" "cost_summary_view" "policy_compliance_view" "team_hierarchy_view" "user_activity_summary_view" "user_permissions_view")

for view in "${EXPECTED_VIEWS[@]}"; do
    if echo "$VIEWS" | grep -q "^$view$"; then
        echo -e "${GREEN}✓ View $view exists${NC}"
    else
        echo -e "${RED}✗ View $view is missing${NC}"
    fi
done
echo ""

# Check functions
echo -e "${BLUE}Checking functions...${NC}"
FUNCTIONS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace ORDER BY proname;")
EXPECTED_FUNCTIONS=("audit_log_trigger" "generate_audit_checksum" "prevent_audit_log_modification" "update_updated_at" "validate_permissions")

for func in "${EXPECTED_FUNCTIONS[@]}"; do
    if echo "$FUNCTIONS" | grep -q "^$func$"; then
        echo -e "${GREEN}✓ Function $func exists${NC}"
    else
        echo -e "${RED}✗ Function $func is missing${NC}"
    fi
done
echo ""

# Check hypertables
echo -e "${BLUE}Checking TimescaleDB hypertables...${NC}"
HYPERTABLES=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT hypertable_name FROM timescaledb_information.hypertables;")
EXPECTED_HYPERTABLES=("llm_metrics" "system_metrics")

for ht in "${EXPECTED_HYPERTABLES[@]}"; do
    if echo "$HYPERTABLES" | grep -q "^$ht$"; then
        echo -e "${GREEN}✓ Hypertable $ht exists${NC}"
    else
        echo -e "${RED}✗ Hypertable $ht is missing${NC}"
    fi
done
echo ""

# Check continuous aggregates
echo -e "${BLUE}Checking continuous aggregates...${NC}"
CAGGS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT view_name FROM timescaledb_information.continuous_aggregates;")
EXPECTED_CAGGS=("llm_metrics_daily" "llm_metrics_hourly")

for cagg in "${EXPECTED_CAGGS[@]}"; do
    if echo "$CAGGS" | grep -q "^$cagg$"; then
        echo -e "${GREEN}✓ Continuous aggregate $cagg exists${NC}"
    else
        echo -e "${RED}✗ Continuous aggregate $cagg is missing${NC}"
    fi
done
echo ""

# Check seed data
echo -e "${BLUE}Checking seed data...${NC}"

ROLE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM roles WHERE is_system_role = true;")
echo -e "${GREEN}✓ System roles: $ROLE_COUNT${NC}"

USER_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM users;")
echo -e "${GREEN}✓ Users: $USER_COUNT${NC}"

POLICY_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM policies WHERE status = 'active';")
echo -e "${GREEN}✓ Active policies: $POLICY_COUNT${NC}"

TEAM_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM teams;")
echo -e "${GREEN}✓ Teams: $TEAM_COUNT${NC}"

echo ""

# Database statistics
echo -e "${BLUE}Database Statistics:${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC
LIMIT 10;
EOF

echo ""
echo -e "${GREEN}=== Schema verification completed ===${NC}"
