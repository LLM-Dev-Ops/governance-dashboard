# Database Setup Guide

Production-ready PostgreSQL database with TimescaleDB for the LLM Governance Dashboard.

## Quick Start

### Using Docker (Recommended)

1. **Start the database:**
   ```bash
   cd database
   docker-compose up -d
   ```

2. **Run migrations:**
   ```bash
   cd scripts
   ./run_migrations.sh
   ```

3. **Verify installation:**
   ```bash
   ./verify_schema.sh
   ```

4. **Access PgAdmin:**
   - URL: http://localhost:5050
   - Email: admin@llmgovernance.local
   - Password: admin

### Manual Installation

1. **Install PostgreSQL 14+ and TimescaleDB:**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql-14 postgresql-14-timescaledb

   # macOS
   brew install postgresql@14 timescaledb
   ```

2. **Create database:**
   ```bash
   createdb -U postgres llm_governance
   ```

3. **Run migrations:**
   ```bash
   cd scripts
   ./run_migrations.sh
   ```

## Directory Structure

```
database/
├── migrations/              # SQL migration files
│   ├── 001_create_extensions.sql
│   ├── 002_create_base_functions.sql
│   ├── 003_create_users_and_auth_tables.sql
│   ├── 004_create_roles_tables.sql
│   ├── 005_create_teams_table.sql
│   ├── 006_create_policies_table.sql
│   ├── 007_create_audit_logs_table.sql
│   ├── 008_create_alerts_table.sql
│   ├── 009_create_metrics_tables.sql
│   ├── 010_create_views.sql
│   ├── 011_create_seed_data.sql
│   └── README.md
├── scripts/                 # Utility scripts
│   ├── run_migrations.sh   # Run all migrations
│   ├── verify_schema.sh    # Verify schema integrity
│   ├── backup.sh           # Backup database
│   └── restore.sh          # Restore from backup
├── docker-compose.yml       # Docker setup
├── .env.example            # Environment variables template
├── SCHEMA.md               # Detailed schema documentation
└── README.md               # This file
```

## Initial Credentials

After running migrations, you'll have a default admin account:

- **Email:** admin@llmgovernance.local
- **Password:** Admin123!
- **Role:** Super Admin

**IMPORTANT:** Change this password immediately after first login!

## Database Schema

The database includes:

### Core Tables
- **users** - User accounts and authentication
- **roles** - Role-based access control with hierarchy
- **user_roles** - User-to-role assignments
- **teams** - Organizational teams with hierarchy
- **team_members** - Team membership
- **policies** - Governance policies
- **policy_assignments** - Policy assignments to teams/users
- **sessions** - Active user sessions
- **api_keys** - API key management
- **mfa_secrets** - Multi-factor authentication secrets
- **audit_logs** - Immutable audit trail
- **alerts** - System alerts and notifications
- **alert_subscriptions** - Alert subscription preferences

### Time-Series Tables (TimescaleDB)
- **llm_metrics** - LLM usage metrics (hypertable)
- **system_metrics** - System performance metrics (hypertable)
- **llm_metrics_daily** - Daily aggregated metrics
- **llm_metrics_hourly** - Hourly aggregated metrics

### Views
- **user_permissions_view** - Aggregated user permissions
- **team_hierarchy_view** - Recursive team structure
- **cost_summary_view** - Aggregated costs by dimensions
- **active_sessions_view** - Currently active sessions
- **alert_summary_view** - Alert statistics
- **policy_compliance_view** - Policy compliance summary
- **user_activity_summary_view** - User activity overview

See [SCHEMA.md](SCHEMA.md) for detailed documentation.

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key variables:
- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 5432)
- `DB_NAME` - Database name (default: llm_governance)
- `DB_USER` - Database user (default: postgres)
- `DB_PASSWORD` - Database password
- `ENCRYPTION_KEY` - Encryption key for MFA secrets (32 chars)
- `JWT_SECRET` - JWT signing secret

## Common Operations

### Run Migrations
```bash
cd scripts
./run_migrations.sh
```

### Verify Schema
```bash
cd scripts
./verify_schema.sh
```

### Backup Database
```bash
cd scripts
./backup.sh
```

### Restore from Backup
```bash
cd scripts
./restore.sh /path/to/backup.sql.gz
```

### Connect via psql
```bash
psql -h localhost -U postgres -d llm_governance
```

### View Database Statistics
```sql
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Check TimescaleDB Status
```sql
SELECT * FROM timescaledb_information.hypertables;
SELECT * FROM timescaledb_information.continuous_aggregates;
SELECT * FROM timescaledb_information.compression_settings;
```

## Performance Features

### Indexes
- B-tree indexes on foreign keys and lookup columns
- GIN indexes on JSONB columns for fast JSON queries
- Composite indexes for common query patterns
- Partial indexes for filtered queries (e.g., unresolved alerts)

### TimescaleDB Features
- **Automatic partitioning** by time
- **Compression policies** (compress data older than 7 days)
- **Retention policies** (llm_metrics: 2 years, system_metrics: 1 year)
- **Continuous aggregates** for fast analytics
- **Automated refresh policies**

### Security Features
- **Immutable audit logs** (prevent updates/deletes)
- **Cryptographic checksums** for audit integrity
- **Password hashing** with bcrypt
- **Encrypted MFA secrets**
- **Token hashing** for sessions and API keys

## Maintenance

### Regular Maintenance Tasks

#### Vacuum and Analyze (Weekly)
```sql
VACUUM ANALYZE;
```

#### Reindex (Monthly)
```sql
REINDEX DATABASE llm_governance;
```

#### Check Table Bloat
```sql
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    n_dead_tup,
    n_live_tup,
    ROUND(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_ratio
FROM pg_stat_user_tables
WHERE n_live_tup > 0
ORDER BY n_dead_tup DESC;
```

#### Update Table Statistics
```sql
ANALYZE;
```

### Monitoring

#### Active Queries
```sql
SELECT
    pid,
    usename,
    application_name,
    state,
    query,
    query_start
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;
```

#### Slow Queries
Enable slow query logging in `postgresql.conf`:
```
log_min_duration_statement = 1000  # Log queries slower than 1 second
```

#### Database Size
```sql
SELECT
    pg_size_pretty(pg_database_size('llm_governance')) AS database_size;
```

#### Connection Pool Status
```sql
SELECT
    COUNT(*) AS total_connections,
    COUNT(*) FILTER (WHERE state = 'active') AS active,
    COUNT(*) FILTER (WHERE state = 'idle') AS idle
FROM pg_stat_activity;
```

## Troubleshooting

### Connection Issues

**Problem:** Cannot connect to database

**Solution:**
1. Check if PostgreSQL is running: `pg_isready`
2. Verify connection parameters in `.env`
3. Check firewall rules: `sudo ufw status`
4. Check PostgreSQL logs: `/var/log/postgresql/`

### Migration Failures

**Problem:** Migration fails midway

**Solution:**
1. Check error message in migration output
2. Review PostgreSQL logs
3. Verify TimescaleDB extension is installed
4. Try running the failed migration manually

### Performance Issues

**Problem:** Slow queries

**Solution:**
1. Check if ANALYZE has been run: `ANALYZE;`
2. Verify indexes exist: `\di` in psql
3. Check for table bloat (see Maintenance section)
4. Review query execution plans: `EXPLAIN ANALYZE <query>;`

### Disk Space Issues

**Problem:** Running out of disk space

**Solution:**
1. Check database size (see Monitoring section)
2. Review retention policies
3. Clean up old backups
4. Enable compression for time-series data
5. Consider partitioning large tables

## Backup & Recovery

### Automated Backups

Set up a cron job for daily backups:

```bash
# Add to crontab (crontab -e)
0 2 * * * /path/to/database/scripts/backup.sh >> /var/log/db_backup.log 2>&1
```

### Backup to S3 (Production)

```bash
# Install AWS CLI
pip install awscli

# Backup and upload to S3
./backup.sh && aws s3 cp ../backups/*.sql.gz s3://llm-governance-backups/
```

### Point-in-Time Recovery

Enable WAL archiving in `postgresql.conf`:
```
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /path/to/archive/%f && cp %p /path/to/archive/%f'
```

## Security Best Practices

1. **Change default passwords** immediately after installation
2. **Use strong encryption keys** (32+ characters)
3. **Enable SSL/TLS** for database connections in production
4. **Restrict database access** to specific IP addresses
5. **Rotate API keys** and session tokens regularly
6. **Enable MFA** for all admin accounts
7. **Monitor audit logs** for suspicious activity
8. **Keep PostgreSQL updated** with security patches
9. **Use connection pooling** (e.g., PgBouncer) in production
10. **Implement row-level security** for multi-tenant scenarios

## Production Deployment

### Prerequisites
- PostgreSQL 14+ with TimescaleDB 2.10+
- Minimum 4GB RAM (8GB+ recommended)
- SSD storage for optimal performance
- Regular backup system
- Monitoring and alerting setup

### Recommended Configuration

#### postgresql.conf
```
# Connection settings
max_connections = 100
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
work_mem = 16MB

# WAL settings
wal_buffers = 16MB
checkpoint_completion_target = 0.9
max_wal_size = 4GB
min_wal_size = 1GB

# Query planning
random_page_cost = 1.1  # For SSD storage
effective_io_concurrency = 200

# Logging
log_min_duration_statement = 1000
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on

# TimescaleDB
shared_preload_libraries = 'timescaledb'
timescaledb.max_background_workers = 8
```

### High Availability Setup

Consider using:
- **PostgreSQL Streaming Replication** for read replicas
- **PgBouncer** for connection pooling
- **HAProxy** or **PgPool-II** for load balancing
- **Patroni** for automatic failover
- **pgBackRest** for backup management

## Support

For issues or questions:
1. Check the [SCHEMA.md](SCHEMA.md) documentation
2. Review PostgreSQL logs: `/var/log/postgresql/`
3. Check TimescaleDB documentation: https://docs.timescale.com/
4. Contact the development team

## License

See the main project LICENSE file for details.
