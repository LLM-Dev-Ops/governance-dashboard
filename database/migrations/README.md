# Database Migrations

This directory contains SQL migration files for the LLM Governance Dashboard PostgreSQL database with TimescaleDB extension.

## Migration Files

The migrations are numbered and should be executed in order:

1. **001_create_extensions.sql** - Enable required PostgreSQL extensions (uuid-ossp, pgcrypto, timescaledb, pg_trgm, btree_gist)
2. **002_create_base_functions.sql** - Create utility functions and triggers (update_updated_at, audit_log_trigger, etc.)
3. **003_create_users_and_auth_tables.sql** - Create users, sessions, MFA, and API keys tables
4. **004_create_roles_tables.sql** - Create roles and user_roles tables with hierarchical support
5. **005_create_teams_table.sql** - Create teams table with hierarchical structure and team_members junction table
6. **006_create_policies_table.sql** - Create policies and policy_assignments tables
7. **007_create_audit_logs_table.sql** - Create immutable audit_logs table with checksum integrity
8. **008_create_alerts_table.sql** - Create alerts and alert_subscriptions tables
9. **009_create_metrics_tables.sql** - Create TimescaleDB hypertables for metrics (llm_metrics, system_metrics) with continuous aggregates
10. **010_create_views.sql** - Create database views for common queries
11. **011_create_seed_data.sql** - Seed system roles, initial admin user, and default policies

## Prerequisites

- PostgreSQL 14 or higher
- TimescaleDB 2.10 or higher
- Required extensions: uuid-ossp, pgcrypto, timescaledb, pg_trgm, btree_gist

## Running Migrations

### Using psql

```bash
# Run all migrations in order
for file in database/migrations/*.sql; do
    psql -U postgres -d llm_governance -f "$file"
done
```

### Individual Migration

```bash
psql -U postgres -d llm_governance -f database/migrations/001_create_extensions.sql
```

### Docker

```bash
docker exec -i postgres_container psql -U postgres -d llm_governance < database/migrations/001_create_extensions.sql
```

## Initial Setup

After running all migrations, you will have:

### Default Admin User
- **Email**: admin@llmgovernance.local
- **Password**: Admin123! (CHANGE THIS IMMEDIATELY)
- **Role**: Super Admin

### System Roles
1. **Super Admin** - Full system access
2. **Admin** - Administrative access
3. **Team Manager** - Team management
4. **Developer** - Standard developer access
5. **Viewer** - Read-only access
6. **Security Officer** - Security and compliance
7. **Finance Manager** - Cost and budget management

### Default Policies
1. **Default Cost Limit** - Daily/monthly cost limits
2. **Default Rate Limit** - Request rate limiting
3. **PII Detection** - Content filtering for sensitive data
4. **Security Best Practices** - Security enforcement

## Database Schema Overview

### Core Tables
- **users** - User accounts with authentication
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
- **llm_metrics_daily** - Daily aggregated metrics (continuous aggregate)
- **llm_metrics_hourly** - Hourly aggregated metrics (continuous aggregate)

### Views
- **user_permissions_view** - Aggregated user permissions from roles
- **team_hierarchy_view** - Recursive team structure
- **cost_summary_view** - Aggregated costs by dimensions
- **active_sessions_view** - Currently active sessions
- **alert_summary_view** - Alert statistics
- **policy_compliance_view** - Policy compliance summary
- **user_activity_summary_view** - User activity overview

## Performance Features

### Indexes
- B-tree indexes on foreign keys and lookup columns
- GIN indexes on JSONB columns for fast JSON queries
- Composite indexes for common query patterns
- Partial indexes for filtered queries (e.g., unresolved alerts)

### TimescaleDB Features
- Automatic partitioning by time
- Compression policies (compress data older than 7 days)
- Retention policies (llm_metrics: 2 years, system_metrics: 1 year)
- Continuous aggregates for fast analytics
- Automated refresh policies

### Security Features
- Immutable audit logs (prevent updates/deletes)
- Cryptographic checksums for audit integrity
- Password hashing with bcrypt
- Encrypted MFA secrets
- Token hashing for sessions and API keys

## Rollback

To rollback migrations, you'll need to create corresponding down migration files or manually drop tables in reverse order:

```sql
-- Example rollback order
DROP VIEW IF EXISTS user_activity_summary_view CASCADE;
DROP VIEW IF EXISTS policy_compliance_view CASCADE;
DROP VIEW IF EXISTS alert_summary_view CASCADE;
DROP VIEW IF EXISTS active_sessions_view CASCADE;
DROP VIEW IF EXISTS cost_summary_view CASCADE;
DROP VIEW IF EXISTS team_hierarchy_view CASCADE;
DROP VIEW IF EXISTS user_permissions_view CASCADE;

DROP TABLE IF EXISTS system_metrics CASCADE;
DROP TABLE IF EXISTS llm_metrics CASCADE;
DROP TABLE IF EXISTS alert_subscriptions CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS policy_assignments CASCADE;
DROP TABLE IF EXISTS policies CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS mfa_secrets CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP FUNCTION IF EXISTS validate_permissions CASCADE;
DROP FUNCTION IF EXISTS audit_log_trigger CASCADE;
DROP FUNCTION IF EXISTS generate_audit_checksum CASCADE;
DROP FUNCTION IF EXISTS update_updated_at CASCADE;
DROP FUNCTION IF EXISTS prevent_audit_log_modification CASCADE;
```

## Maintenance

### Vacuum and Analyze
```sql
VACUUM ANALYZE;
```

### Check TimescaleDB Status
```sql
SELECT * FROM timescaledb_information.hypertables;
SELECT * FROM timescaledb_information.continuous_aggregates;
SELECT * FROM timescaledb_information.compression_settings;
```

### Monitor Table Sizes
```sql
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Support

For issues or questions, refer to the main project documentation or contact the development team.
