#!/bin/bash
# backup.sh
# Script to backup the PostgreSQL database

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
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}=== Database Backup ===${NC}"
echo ""

# Create backup directory
mkdir -p $BACKUP_DIR

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo -e "${YELLOW}Creating backup: $BACKUP_FILE${NC}"

# Perform backup
if PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME | gzip > $BACKUP_FILE; then
    echo -e "${GREEN}✓ Backup created successfully${NC}"

    # Get backup size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}Backup size: $BACKUP_SIZE${NC}"
else
    echo -e "${RED}✗ Backup failed${NC}"
    exit 1
fi

# Clean old backups
echo ""
echo -e "${YELLOW}Cleaning up old backups (older than $BACKUP_RETENTION_DAYS days)...${NC}"
find $BACKUP_DIR -name "${DB_NAME}_*.sql.gz" -type f -mtime +$BACKUP_RETENTION_DAYS -delete
echo -e "${GREEN}✓ Cleanup completed${NC}"

# List recent backups
echo ""
echo -e "${YELLOW}Recent backups:${NC}"
ls -lht $BACKUP_DIR/${DB_NAME}_*.sql.gz | head -5

echo ""
echo -e "${GREEN}Backup completed successfully${NC}"
