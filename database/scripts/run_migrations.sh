#!/bin/bash
# run_migrations.sh
# Script to run all database migrations in order

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
NC='\033[0m' # No Color

echo -e "${YELLOW}=== LLM Governance Dashboard - Database Migration ===${NC}"
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql is not installed${NC}"
    exit 1
fi

# Check database connection
echo -e "${YELLOW}Testing database connection...${NC}"
if ! PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c '\q' 2>/dev/null; then
    echo -e "${RED}Error: Cannot connect to PostgreSQL${NC}"
    exit 1
fi

echo -e "${GREEN}Database connection successful${NC}"
echo ""

# Create database if it doesn't exist
echo -e "${YELLOW}Checking if database exists...${NC}"
DB_EXISTS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

if [ "$DB_EXISTS" != "1" ]; then
    echo -e "${YELLOW}Creating database $DB_NAME...${NC}"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"
    echo -e "${GREEN}Database created${NC}"
else
    echo -e "${GREEN}Database already exists${NC}"
fi

echo ""

# Run migrations
MIGRATION_DIR="../migrations"
MIGRATION_COUNT=$(ls -1 $MIGRATION_DIR/*.sql 2>/dev/null | wc -l)

if [ $MIGRATION_COUNT -eq 0 ]; then
    echo -e "${RED}Error: No migration files found in $MIGRATION_DIR${NC}"
    exit 1
fi

echo -e "${YELLOW}Found $MIGRATION_COUNT migration files${NC}"
echo ""

# Create migrations tracking table
echo -e "${YELLOW}Creating migrations tracking table...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    checksum TEXT NOT NULL
);
EOF

# Run each migration
for migration_file in $MIGRATION_DIR/*.sql; do
    filename=$(basename "$migration_file")

    # Calculate checksum
    checksum=$(sha256sum "$migration_file" | cut -d' ' -f1)

    # Check if migration already ran
    already_ran=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT 1 FROM schema_migrations WHERE filename='$filename'")

    if [ "$already_ran" = "1" ]; then
        # Verify checksum
        stored_checksum=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT checksum FROM schema_migrations WHERE filename='$filename'")

        if [ "$checksum" != "$stored_checksum" ]; then
            echo -e "${RED}Warning: Migration $filename has been modified since it was run${NC}"
            echo -e "${RED}Stored checksum: $stored_checksum${NC}"
            echo -e "${RED}Current checksum: $checksum${NC}"
        else
            echo -e "${GREEN}✓ Skipping $filename (already executed)${NC}"
        fi
        continue
    fi

    echo -e "${YELLOW}Running migration: $filename${NC}"

    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$migration_file"; then
        # Record successful migration
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "INSERT INTO schema_migrations (filename, checksum) VALUES ('$filename', '$checksum');"
        echo -e "${GREEN}✓ Successfully executed $filename${NC}"
    else
        echo -e "${RED}✗ Failed to execute $filename${NC}"
        exit 1
    fi

    echo ""
done

echo -e "${GREEN}=== All migrations completed successfully ===${NC}"
echo ""

# Display summary
echo -e "${YELLOW}Database Summary:${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
SELECT
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM roles) as total_roles,
    (SELECT COUNT(*) FROM teams) as total_teams,
    (SELECT COUNT(*) FROM policies) as total_policies,
    (SELECT COUNT(*) FROM audit_logs) as total_audit_logs;
EOF

echo ""
echo -e "${GREEN}Migration completed!${NC}"
echo -e "${YELLOW}Default admin credentials:${NC}"
echo -e "  Email: admin@llmgovernance.local"
echo -e "  Password: Admin123!"
echo -e "${RED}  PLEASE CHANGE THE DEFAULT PASSWORD IMMEDIATELY${NC}"
