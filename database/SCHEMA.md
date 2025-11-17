# Database Schema Documentation

## Overview

The LLM Governance Dashboard uses PostgreSQL 14+ with TimescaleDB extension for time-series data. The schema is designed for enterprise-grade governance, security, and cost management of LLM usage.

## Entity Relationship Diagram

```
┌─────────────────┐
│     Users       │
├─────────────────┤
│ id (PK)         │◄──┐
│ email (UQ)      │   │
│ name            │   │
│ password_hash   │   │
│ status          │   │
│ mfa_enabled     │   │
└─────────────────┘   │
        │             │
        │             │
        ▼             │
┌─────────────────┐   │
│  MFA Secrets    │   │
├─────────────────┤   │
│ id (PK)         │   │
│ user_id (FK)────┼───┘
│ secret_encrypted│
│ backup_codes    │
└─────────────────┘

┌─────────────────┐         ┌─────────────────┐
│   User Roles    │         │     Roles       │
├─────────────────┤         ├─────────────────┤
│ user_id (FK)────┼────────►│ id (PK)         │
│ role_id (FK)────┼────────►│ name (UQ)       │
│ granted_at      │         │ description     │
│ granted_by (FK) │         │ permissions     │
└─────────────────┘         │ parent_role_id  │◄┐
                            │ is_system_role  │ │
                            └─────────────────┘ │
                                     │          │
                                     └──────────┘

┌─────────────────┐         ┌─────────────────┐
│  Team Members   │         │     Teams       │
├─────────────────┤         ├─────────────────┤
│ team_id (FK)────┼────────►│ id (PK)         │
│ user_id (FK)────┼─────┐   │ name            │
│ role            │     │   │ parent_team_id  │◄┐
│ joined_at       │     │   │ budget          │ │
└─────────────────┘     │   │ cost_center     │ │
                        │   │ metadata        │ │
                        │   └─────────────────┘ │
                        │            │          │
                        │            └──────────┘
                        │
                        │   ┌─────────────────┐
                        └──►│ LLM Metrics     │
                            ├─────────────────┤
                            │ time (PK)       │
                            │ provider        │
                            │ model           │
                            │ user_id (FK)    │
                            │ team_id (FK)    │
                            │ tokens_in       │
                            │ tokens_out      │
                            │ latency_ms      │
                            │ cost            │
                            │ metadata        │
                            └─────────────────┘

┌─────────────────┐         ┌─────────────────┐
│Policy Assignments│        │    Policies     │
├─────────────────┤         ├─────────────────┤
│ id (PK)         │         │ id (PK)         │
│ policy_id (FK)──┼────────►│ name (UQ)       │
│ team_id (FK)    │         │ description     │
│ user_id (FK)    │         │ policy_type     │
│ assigned_at     │         │ rules           │
└─────────────────┘         │ enforcement_lvl │
                            │ status          │
                            │ version         │
                            └─────────────────┘

┌─────────────────┐
│  Audit Logs     │
├─────────────────┤
│ id (PK)         │
│ timestamp       │
│ user_id (FK)    │
│ action          │
│ resource_type   │
│ resource_id     │
│ ip_address      │
│ details         │
│ checksum        │
└─────────────────┘

┌─────────────────┐         ┌─────────────────┐
│ Alert Subs      │         │     Alerts      │
├─────────────────┤         ├─────────────────┤
│ id (PK)         │         │ id (PK)         │
│ user_id (FK)────┼─────┐   │ alert_type      │
│ alert_type      │     │   │ severity        │
│ min_severity    │     │   │ title           │
│ team_id (FK)    │     │   │ description     │
└─────────────────┘     │   │ triggered_at    │
                        │   │ acknowledged_at │
                        │   │ resolved_at     │
                        │   │ related_*_id    │
                        │   └─────────────────┘
                        │
                        │   ┌─────────────────┐
                        └──►│   Sessions      │
                            ├─────────────────┤
                            │ id (PK)         │
                            │ user_id (FK)    │
                            │ token_hash (UQ) │
                            │ ip_address      │
                            │ user_agent      │
                            │ expires_at      │
                            └─────────────────┘

                            ┌─────────────────┐
                            │   API Keys      │
                            ├─────────────────┤
                            │ id (PK)         │
                            │ user_id (FK)    │
                            │ key_hash (UQ)   │
                            │ name            │
                            │ permissions     │
                            │ expires_at      │
                            │ last_used_at    │
                            └─────────────────┘

                            ┌─────────────────┐
                            │System Metrics   │
                            ├─────────────────┤
                            │ time (PK)       │
                            │ service         │
                            │ metric_name     │
                            │ value           │
                            │ labels          │
                            └─────────────────┘
```

## Tables

### Users & Authentication

#### users
Core user account information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Unique user identifier |
| email | VARCHAR(255) | NOT NULL, UNIQUE | User email (login) |
| name | VARCHAR(255) | NOT NULL | Full name |
| password_hash | TEXT | NOT NULL | Bcrypt hashed password |
| status | VARCHAR(50) | NOT NULL, DEFAULT 'active' | active, inactive, suspended, pending |
| mfa_enabled | BOOLEAN | NOT NULL, DEFAULT FALSE | MFA status |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_users_email` on (email)
- `idx_users_status` on (status)
- `idx_users_created_at` on (created_at)

#### mfa_secrets
Multi-factor authentication secrets (encrypted at application level).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK→users.id, UNIQUE, ON DELETE CASCADE | User reference |
| secret_encrypted | TEXT | NOT NULL | Encrypted TOTP secret |
| backup_codes_encrypted | TEXT | NOT NULL | Encrypted backup codes |
| enabled_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | When MFA was enabled |

#### sessions
Active user sessions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK→users.id, ON DELETE CASCADE | User reference |
| token_hash | TEXT | NOT NULL, UNIQUE | Hashed session token |
| ip_address | INET | | Client IP address |
| user_agent | TEXT | | Browser/client user agent |
| expires_at | TIMESTAMP | NOT NULL | Session expiration |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_sessions_user_id` on (user_id)
- `idx_sessions_token_hash` on (token_hash)
- `idx_sessions_expires_at` on (expires_at)

#### api_keys
API keys for programmatic access.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK→users.id, ON DELETE CASCADE | User reference |
| key_hash | TEXT | NOT NULL, UNIQUE | Hashed API key |
| name | VARCHAR(255) | NOT NULL | Key description |
| permissions | JSONB | NOT NULL, DEFAULT '{}' | Key-specific permissions |
| expires_at | TIMESTAMP | | Optional expiration |
| last_used_at | TIMESTAMP | | Last usage timestamp |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_api_keys_user_id` on (user_id)
- `idx_api_keys_key_hash` on (key_hash)
- `idx_api_keys_permissions` GIN on (permissions)

### Roles & Permissions

#### roles
Role definitions with hierarchical inheritance.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | VARCHAR(255) | NOT NULL, UNIQUE | Role name |
| description | TEXT | | Role description |
| permissions | JSONB | NOT NULL, DEFAULT '{}' | Permission definitions |
| parent_role_id | UUID | FK→roles.id, ON DELETE SET NULL | Parent role for inheritance |
| is_system_role | BOOLEAN | NOT NULL, DEFAULT FALSE | System roles can't be deleted |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_roles_name` on (name)
- `idx_roles_parent_role_id` on (parent_role_id)
- `idx_roles_permissions` GIN on (permissions)

#### user_roles
User to role assignments.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | UUID | FK→users.id, ON DELETE CASCADE | User reference |
| role_id | UUID | FK→roles.id, ON DELETE CASCADE | Role reference |
| granted_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Grant timestamp |
| granted_by | UUID | FK→users.id, ON DELETE SET NULL | Who granted the role |

**Primary Key:** (user_id, role_id)

### Teams & Organization

#### teams
Hierarchical organizational teams.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | VARCHAR(255) | NOT NULL | Team name |
| parent_team_id | UUID | FK→teams.id, ON DELETE CASCADE | Parent team |
| budget | DECIMAL(15,2) | | Allocated budget |
| cost_center | VARCHAR(100) | | Cost center code |
| metadata | JSONB | DEFAULT '{}' | Additional metadata |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_teams_name` on (name)
- `idx_teams_parent_team_id` on (parent_team_id)
- `idx_teams_metadata` GIN on (metadata)

#### team_members
Team membership assignments.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| team_id | UUID | FK→teams.id, ON DELETE CASCADE | Team reference |
| user_id | UUID | FK→users.id, ON DELETE CASCADE | User reference |
| role | VARCHAR(50) | NOT NULL, DEFAULT 'member' | owner, admin, member, viewer |
| joined_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Join timestamp |

**Primary Key:** (team_id, user_id)

### Policies & Governance

#### policies
Governance policy definitions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | VARCHAR(255) | NOT NULL, UNIQUE | Policy name |
| description | TEXT | | Policy description |
| policy_type | VARCHAR(50) | NOT NULL | cost, security, compliance, usage, rate_limit, content_filter |
| rules | JSONB | NOT NULL, DEFAULT '{}' | Policy rules definition |
| enforcement_level | VARCHAR(50) | NOT NULL, DEFAULT 'warning' | strict, warning, monitor |
| status | VARCHAR(50) | NOT NULL, DEFAULT 'active' | active, inactive, draft |
| version | INTEGER | NOT NULL, DEFAULT 1 | Policy version |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |
| created_by | UUID | FK→users.id, ON DELETE SET NULL | Creator reference |

**Indexes:**
- `idx_policies_policy_type` on (policy_type)
- `idx_policies_status` on (status)
- `idx_policies_rules` GIN on (rules)

#### policy_assignments
Policy assignments to teams or users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| policy_id | UUID | FK→policies.id, ON DELETE CASCADE | Policy reference |
| team_id | UUID | FK→teams.id, ON DELETE CASCADE | Team reference (mutually exclusive with user_id) |
| user_id | UUID | FK→users.id, ON DELETE CASCADE | User reference (mutually exclusive with team_id) |
| assigned_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Assignment timestamp |
| assigned_by | UUID | FK→users.id, ON DELETE SET NULL | Assigner reference |

**Constraint:** Either team_id OR user_id must be set, not both.

### Audit & Monitoring

#### audit_logs
Immutable audit trail (inserts only, no updates/deletes).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| timestamp | TIMESTAMP | NOT NULL, DEFAULT NOW() | Event timestamp |
| user_id | UUID | FK→users.id, ON DELETE SET NULL | User who performed action |
| action | VARCHAR(100) | NOT NULL | Action performed |
| resource_type | VARCHAR(100) | NOT NULL | Resource type affected |
| resource_id | VARCHAR(255) | NOT NULL | Resource ID affected |
| ip_address | INET | | Client IP address |
| details | JSONB | DEFAULT '{}' | Additional details |
| checksum | TEXT | NOT NULL | SHA-256 integrity checksum |

**Indexes:**
- `idx_audit_logs_timestamp` on (timestamp DESC)
- `idx_audit_logs_user_id` on (user_id)
- `idx_audit_logs_action` on (action)
- `idx_audit_logs_composite` on (user_id, timestamp DESC)
- `idx_audit_logs_details` GIN on (details)

**Triggers:**
- Automatic checksum generation on INSERT
- Prevents UPDATE and DELETE operations

#### alerts
System alerts and notifications.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| alert_type | VARCHAR(50) | NOT NULL | cost, security, compliance, performance, quota, anomaly |
| severity | VARCHAR(50) | NOT NULL | critical, high, medium, low, info |
| title | VARCHAR(255) | NOT NULL | Alert title |
| description | TEXT | NOT NULL | Alert description |
| triggered_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Trigger timestamp |
| acknowledged_at | TIMESTAMP | | Acknowledgment timestamp |
| acknowledged_by | UUID | FK→users.id, ON DELETE SET NULL | Acknowledger reference |
| resolved_at | TIMESTAMP | | Resolution timestamp |
| resolved_by | UUID | FK→users.id, ON DELETE SET NULL | Resolver reference |
| metadata | JSONB | DEFAULT '{}' | Additional metadata |
| related_policy_id | UUID | FK→policies.id, ON DELETE SET NULL | Related policy |
| related_team_id | UUID | FK→teams.id, ON DELETE SET NULL | Related team |
| related_user_id | UUID | FK→users.id, ON DELETE SET NULL | Related user |

**Indexes:**
- `idx_alerts_alert_type` on (alert_type)
- `idx_alerts_severity` on (severity)
- `idx_alerts_triggered_at` on (triggered_at DESC)
- `idx_alerts_unresolved` on (severity, triggered_at DESC) WHERE resolved_at IS NULL

### Time-Series Metrics (TimescaleDB Hypertables)

#### llm_metrics
LLM usage metrics (hypertable partitioned by time).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| time | TIMESTAMP | NOT NULL | Metric timestamp |
| provider | VARCHAR(100) | NOT NULL | LLM provider (OpenAI, Anthropic, etc.) |
| model | VARCHAR(100) | NOT NULL | Model name |
| user_id | UUID | FK→users.id, ON DELETE SET NULL | User reference |
| team_id | UUID | FK→teams.id, ON DELETE SET NULL | Team reference |
| tokens_in | INTEGER | NOT NULL, DEFAULT 0 | Input tokens |
| tokens_out | INTEGER | NOT NULL, DEFAULT 0 | Output tokens |
| latency_ms | INTEGER | NOT NULL, DEFAULT 0 | Request latency |
| cost | DECIMAL(10,6) | NOT NULL, DEFAULT 0 | Request cost (USD) |
| metadata | JSONB | DEFAULT '{}' | Additional metadata |
| request_id | VARCHAR(255) | | Request identifier |
| endpoint | VARCHAR(255) | | API endpoint |
| status | VARCHAR(50) | | success, error, timeout, rate_limited |

**Hypertable:** Partitioned by `time`
**Compression:** Data older than 7 days
**Retention:** 2 years

**Indexes:**
- `idx_llm_metrics_provider` on (provider, time DESC)
- `idx_llm_metrics_user_id` on (user_id, time DESC)
- `idx_llm_metrics_team_id` on (team_id, time DESC)
- `idx_llm_metrics_composite` on (team_id, provider, model, time DESC)

#### system_metrics
System performance metrics (hypertable partitioned by time).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| time | TIMESTAMP | NOT NULL | Metric timestamp |
| service | VARCHAR(100) | NOT NULL | Service name |
| metric_name | VARCHAR(100) | NOT NULL | Metric name |
| value | DOUBLE PRECISION | NOT NULL | Metric value |
| labels | JSONB | DEFAULT '{}' | Additional labels |
| unit | VARCHAR(50) | | Unit of measurement |

**Hypertable:** Partitioned by `time`
**Compression:** Data older than 7 days
**Retention:** 1 year

## Views

### user_permissions_view
Aggregated user permissions from all assigned roles including inheritance.

### team_hierarchy_view
Hierarchical team structure with path and metrics.

### cost_summary_view
Daily cost summary aggregated by provider, model, team, and user.

### active_sessions_view
Currently active user sessions with expiration info.

### alert_summary_view
Alert statistics by type and severity for the last 30 days.

### policy_compliance_view
Policy compliance summary with assignment and alert statistics.

### user_activity_summary_view
User activity and usage summary.

## Functions & Triggers

### update_updated_at()
Automatically updates `updated_at` timestamp on row modification.

### generate_audit_checksum()
Generates SHA-256 checksum for audit log integrity.

### audit_log_trigger()
Automatically populates audit log checksum on INSERT.

### prevent_audit_log_modification()
Prevents UPDATE and DELETE operations on audit_logs (immutability).

### validate_permissions()
Validates JSONB permissions structure.

## Security Features

1. **Password Security**: Bcrypt hashing with salts
2. **Token Security**: SHA-256 hashing for sessions and API keys
3. **MFA Support**: Encrypted TOTP secrets and backup codes
4. **Audit Trail**: Immutable logs with cryptographic checksums
5. **Row-Level Security**: Foreign key constraints with CASCADE/SET NULL
6. **JSONB Validation**: Schema validation for permissions and rules

## Performance Optimizations

1. **Indexes**: B-tree, GIN, and composite indexes for common queries
2. **TimescaleDB**: Automatic partitioning, compression, and retention
3. **Continuous Aggregates**: Pre-computed hourly and daily metrics
4. **Materialized Views**: Cached complex queries
5. **Partial Indexes**: Filtered indexes for specific query patterns

## Data Retention

- **LLM Metrics**: 2 years (compressed after 7 days)
- **System Metrics**: 1 year (compressed after 7 days)
- **Audit Logs**: Indefinite (immutable)
- **Sessions**: Auto-expired based on expires_at
- **Alerts**: Indefinite (can be archived manually)
