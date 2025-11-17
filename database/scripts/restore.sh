#!/bin/bash
# restore.sh
# Script to restore the PostgreSQL database from backup

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
BACKUP_DIR=${BACKUP_DIR:-../backups}

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}=== Database Restore ===${NC}"
echo ""

# Check if backup file provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Available backups:${NC}"
    ls -lt $BACKUP_DIR/${DB_NAME}_*.sql.gz | head -10
    echo ""
    echo -e "${RED}Usage: $0 <backup_file>${NC}"
    echo -e "Example: $0 $BACKUP_DIR/${DB_NAME}_20250116_120000.sql.gz"
    exit 1
fi

BACKUP_FILE=$1

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}Restoring from: $BACKUP_FILE${NC}"
echo ""

# Warning
echo -e "${RED}WARNING: This will DROP and recreate the database!${NC}"
echo -e "${RED}All existing data will be lost!${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Restore cancelled${NC}"
    exit 0
fi

# Drop existing database
echo -e "${YELLOW}Dropping existing database...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
echo -e "${GREEN}✓ Database dropped${NC}"

# Create new database
echo -e "${YELLOW}Creating new database...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"
echo -e "${GREEN}✓ Database created${NC}"

# Restore backup
echo -e "${YELLOW}Restoring backup...${NC}"
if gunzip -c $BACKUP_FILE | PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME; then
    echo -e "${GREEN}✓ Restore completed successfully${NC}"
else
    echo -e "${RED}✗ Restore failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Database restored successfully${NC}"
