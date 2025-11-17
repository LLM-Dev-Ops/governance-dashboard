# LLM Governance Dashboard - Administrator Guide

**Version:** 1.0
**Last Updated:** November 16, 2025

---

## Table of Contents

1. [Introduction](#introduction)
2. [System Setup and Configuration](#system-setup-and-configuration)
3. [User and Team Administration](#user-and-team-administration)
4. [Role and Permission Management](#role-and-permission-management)
5. [Policy Configuration](#policy-configuration)
6. [Security Best Practices](#security-best-practices)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)
8. [Backup and Recovery](#backup-and-recovery)
9. [Performance Tuning](#performance-tuning)
10. [Troubleshooting](#troubleshooting)

---

## Introduction

This administrator guide provides comprehensive instructions for setting up, configuring, and maintaining the LLM Governance Dashboard. It is intended for system administrators, DevOps engineers, and IT personnel responsible for the platform.

### Administrator Responsibilities

As an administrator, you are responsible for:

- **System Configuration**: Initial setup and ongoing configuration
- **User Management**: Creating and managing user accounts
- **Security**: Ensuring system security and compliance
- **Performance**: Monitoring and optimizing system performance
- **Maintenance**: Regular updates and backups
- **Support**: Assisting users with technical issues
- **Compliance**: Ensuring regulatory compliance

### Prerequisites

Before beginning, ensure you have:

- System administrator access to all servers
- Database administrator credentials
- Understanding of Docker/Kubernetes (for containerized deployments)
- Familiarity with PostgreSQL and Redis
- Network configuration access
- SSL/TLS certificates (for production)

---

## System Setup and Configuration

### Initial Installation

The LLM Governance Dashboard can be deployed using three methods:

#### Option 1: Docker Compose (Recommended for Small-Medium Deployments)

```bash
# Clone the repository
git clone https://github.com/your-org/llm-governance-dashboard.git
cd llm-governance-dashboard

# Copy and configure environment variables
cp .env.example .env
nano .env

# Start all services
docker-compose up -d

# Verify services are running
docker-compose ps

# View logs
docker-compose logs -f
```

#### Option 2: Kubernetes (Recommended for Enterprise Deployments)

```bash
# Install using Helm
helm repo add llm-governance https://charts.llm-governance.example
helm repo update

# Create namespace
kubectl create namespace llm-governance

# Install the chart
helm install llm-governance llm-governance/llm-governance-dashboard \
  --namespace llm-governance \
  --values custom-values.yaml

# Verify deployment
kubectl get pods -n llm-governance

# Check service status
kubectl get svc -n llm-governance
```

#### Option 3: Source Deployment (Development/Testing)

```bash
# Prerequisites: Rust 1.75+, PostgreSQL 14+, Redis 7+

# Build all services
cargo build --release --workspace

# Run database migrations
./scripts/migrate-all.sh

# Start services (in separate terminals or use process manager)
./target/release/auth-service &
./target/release/user-service &
./target/release/policy-service &
./target/release/audit-service &
./target/release/metrics-service &
./target/release/cost-service &
./target/release/integration-service &
./target/release/api-gateway &
```

### Environment Configuration

Critical environment variables to configure:

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost/llm_governance

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=<generate-strong-secret-min-32-chars>
JWT_EXPIRATION=3600  # seconds

# OAuth Configuration (if using OAuth)
OAUTH_GOOGLE_CLIENT_ID=your-client-id
OAUTH_GOOGLE_CLIENT_SECRET=your-client-secret
OAUTH_REDIRECT_URL=https://yourdomain.com/auth/callback

# LLM Provider API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# System Configuration
ENVIRONMENT=production
LOG_LEVEL=info
CORS_ORIGINS=https://yourdomain.com
API_RATE_LIMIT=1000  # requests per minute

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notifications@yourdomain.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=LLM Governance <notifications@yourdomain.com>

# Monitoring
PROMETHEUS_PORT=9090
GRAFANA_PORT=3000
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
```

> **Security Warning:** Never commit `.env` files to version control. Use secret management tools in production.

### Database Setup

#### Creating Databases

```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create databases
CREATE DATABASE llm_governance_auth;
CREATE DATABASE llm_governance_users;
CREATE DATABASE llm_governance_policies;
CREATE DATABASE llm_governance_audit;
CREATE DATABASE llm_governance_metrics;
CREATE DATABASE llm_governance_cost;
CREATE DATABASE llm_governance_gateway;
CREATE DATABASE llm_governance_integrations;

-- Create application user
CREATE USER llm_gov_app WITH PASSWORD 'secure-password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE llm_governance_auth TO llm_gov_app;
GRANT ALL PRIVILEGES ON DATABASE llm_governance_users TO llm_gov_app;
GRANT ALL PRIVILEGES ON DATABASE llm_governance_policies TO llm_gov_app;
GRANT ALL PRIVILEGES ON DATABASE llm_governance_audit TO llm_gov_app;
GRANT ALL PRIVILEGES ON DATABASE llm_governance_metrics TO llm_gov_app;
GRANT ALL PRIVILEGES ON DATABASE llm_governance_cost TO llm_gov_app;
GRANT ALL PRIVILEGES ON DATABASE llm_governance_gateway TO llm_gov_app;
GRANT ALL PRIVILEGES ON DATABASE llm_governance_integrations TO llm_gov_app;
```

#### Running Migrations

```bash
# Install SQLx CLI
cargo install sqlx-cli --no-default-features --features postgres

# Run migrations for each service
cd services/auth-service && sqlx migrate run && cd ../..
cd services/user-service && sqlx migrate run && cd ../..
cd services/policy-service && sqlx migrate run && cd ../..
cd services/audit-service && sqlx migrate run && cd ../..
cd services/metrics-service && sqlx migrate run && cd ../..
cd services/cost-service && sqlx migrate run && cd ../..
cd services/integration-service && sqlx migrate run && cd ../..

# Or use the helper script
./scripts/migrate-all.sh
```

### SSL/TLS Configuration

#### Obtaining Certificates

**Using Let's Encrypt (Recommended):**

```bash
# Install certbot
sudo apt-get install certbot

# Obtain certificate
sudo certbot certonly --standalone -d llm-gov.yourdomain.com

# Certificates will be at:
# /etc/letsencrypt/live/llm-gov.yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/llm-gov.yourdomain.com/privkey.pem
```

**Using Custom Certificates:**

Place your certificates in a secure location:
- Certificate: `/etc/ssl/certs/llm-gov.crt`
- Private Key: `/etc/ssl/private/llm-gov.key`

#### Configuring HTTPS

**For Docker Deployment:**

Add to `docker-compose.yml`:

```yaml
services:
  api-gateway:
    environment:
      - TLS_CERT_PATH=/certs/fullchain.pem
      - TLS_KEY_PATH=/certs/privkey.pem
    volumes:
      - /etc/letsencrypt/live/yourdomain.com:/certs:ro
```

**For Kubernetes Deployment:**

Create TLS secret:

```bash
kubectl create secret tls llm-gov-tls \
  --cert=/path/to/cert.pem \
  --key=/path/to/key.pem \
  -n llm-governance
```

Reference in Ingress:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: llm-gov-ingress
spec:
  tls:
  - hosts:
    - llm-gov.yourdomain.com
    secretName: llm-gov-tls
```

### Load Balancer Configuration

For production deployments, configure a load balancer:

**NGINX Configuration:**

```nginx
upstream api_gateway {
    server localhost:8080;
    server localhost:8081;
    server localhost:8082;
}

server {
    listen 443 ssl http2;
    server_name llm-gov.yourdomain.com;

    ssl_certificate /etc/ssl/certs/llm-gov.crt;
    ssl_certificate_key /etc/ssl/private/llm-gov.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://api_gateway;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## User and Team Administration

### Creating the First Admin User

After initial installation, create the first admin user:

```bash
# Using the admin CLI tool
./scripts/create-admin.sh

# Or via API
curl -X POST http://localhost:8081/api/v1/admin/bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "temporary-password",
    "name": "System Administrator"
  }'
```

> **Important:** Change the password immediately after first login.

### Bulk User Import

Import multiple users from CSV:

```bash
# CSV format: email,name,role,team
# Example CSV content:
# john@example.com,John Doe,power_user,engineering
# jane@example.com,Jane Smith,standard_user,marketing

# Import via CLI
./scripts/import-users.sh users.csv

# Or via API
curl -X POST http://localhost:8082/api/v1/users/import \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -F "file=@users.csv"
```

### User Lifecycle Management

#### Onboarding Process

1. **Create User Account**
   - Add user to system
   - Assign appropriate role
   - Add to relevant teams
   - Send welcome email with setup instructions

2. **Initial Setup**
   - User receives invitation email
   - Sets password
   - Configures MFA (if required)
   - Completes profile

3. **Access Provisioning**
   - Verify role assignments
   - Grant necessary permissions
   - Provide documentation
   - Conduct training (if needed)

#### Offboarding Process

1. **Disable Account**
   - Suspend user access immediately
   - Revoke all active sessions
   - Disable API keys

2. **Transfer Ownership**
   - Reassign owned resources
   - Transfer team ownership
   - Migrate policies

3. **Audit and Archive**
   - Export user activity logs
   - Archive user data
   - Document offboarding completion

4. **Delete Account** (after retention period)
   - Remove personal data
   - Anonymize audit logs
   - Clean up references

### Team Administration

#### Creating Team Hierarchy

```bash
# Via API
curl -X POST http://localhost:8082/api/v1/teams \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Engineering",
    "description": "Engineering department",
    "parent_team_id": null
  }'

# Create sub-team
curl -X POST http://localhost:8082/api/v1/teams \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Backend Team",
    "description": "Backend engineering",
    "parent_team_id": "uuid-of-engineering-team"
  }'
```

#### Team Budget Allocation

```bash
# Set team budget
curl -X POST http://localhost:8086/api/v1/budgets \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "team_id": "team-uuid",
    "monthly_limit": 5000,
    "currency": "USD",
    "alert_thresholds": [50, 75, 90, 100]
  }'
```

---

## Role and Permission Management

### Role Definitions

Configure custom roles beyond the defaults:

```bash
# Create custom role
curl -X POST http://localhost:8082/api/v1/roles \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "data_scientist",
    "description": "Data Science Team Member",
    "permissions": [
      "llm.use.gpt4",
      "llm.use.claude",
      "analytics.view",
      "reports.generate",
      "costs.view.own"
    ]
  }'
```

### Permission Granularity

Available permission types:

**Resource-Level Permissions:**
- `users.view` - View users
- `users.create` - Create users
- `users.edit` - Edit users
- `users.delete` - Delete users

**Policy Permissions:**
- `policies.view` - View policies
- `policies.create` - Create policies
- `policies.edit` - Edit policies
- `policies.delete` - Delete policies

**LLM Usage Permissions:**
- `llm.use.*` - Use any LLM
- `llm.use.openai` - Use OpenAI models
- `llm.use.anthropic` - Use Anthropic models
- `llm.use.gpt4` - Use GPT-4 specifically

**Administrative Permissions:**
- `admin.system` - System administration
- `admin.users` - User administration
- `admin.teams` - Team administration
- `admin.billing` - Billing administration

### Permission Inheritance

Configure permission inheritance in team hierarchies:

```yaml
# Configuration example
permission_inheritance:
  enabled: true
  mode: additive  # or 'override'
  inherit_from_parent: true
  allow_overrides: true
```

---

## Policy Configuration

### System-Wide Policies

#### Default Rate Limiting

```bash
# Configure global rate limits
curl -X POST http://localhost:8083/api/v1/policies \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Global Rate Limit",
    "type": "rate_limit",
    "scope": "organization",
    "priority": 100,
    "conditions": {
      "applies_to": "all_users"
    },
    "rules": {
      "requests_per_minute": 60,
      "requests_per_hour": 1000,
      "requests_per_day": 10000
    },
    "actions": {
      "on_exceed": "throttle",
      "notify": true
    }
  }'
```

#### Content Filtering

```bash
# Configure content policies
curl -X POST http://localhost:8083/api/v1/policies \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "PII Protection",
    "type": "content_filter",
    "scope": "organization",
    "priority": 200,
    "rules": {
      "block_patterns": [
        "SSN:\\s*\\d{3}-\\d{2}-\\d{4}",
        "credit_card:\\s*\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}"
      ],
      "sensitive_categories": [
        "personal_identifiable_information",
        "protected_health_information",
        "financial_data"
      ]
    },
    "actions": {
      "on_detect": "block",
      "notify_admin": true,
      "log_violation": true
    }
  }'
```

#### Budget Policies

```bash
# Organization-wide budget policy
curl -X POST http://localhost:8083/api/v1/policies \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Monthly Budget Cap",
    "type": "cost_limit",
    "scope": "organization",
    "priority": 150,
    "rules": {
      "monthly_limit": 50000,
      "currency": "USD",
      "per_user_limit": 500,
      "alert_at_percentage": [50, 75, 90]
    },
    "actions": {
      "at_50_percent": "notify_users",
      "at_75_percent": "notify_admins",
      "at_90_percent": "require_approval",
      "at_100_percent": "block_requests"
    }
  }'
```

### Policy Templates

Create reusable policy templates:

```yaml
# templates/compliance-template.yaml
name: "{{TEMPLATE_NAME}}"
type: compliance
scope: "{{SCOPE}}"
rules:
  require_audit: true
  require_approval_for:
    - high_cost_requests
    - sensitive_models
  retention_period_days: 365
  export_format: json
actions:
  log_all_requests: true
  notify_on_violation: true
```

---

## Security Best Practices

### Authentication Configuration

#### Enforcing MFA

```bash
# Require MFA for all users
curl -X PATCH http://localhost:8081/api/v1/admin/security-settings \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "mfa_required": true,
    "mfa_methods": ["totp", "webauthn"],
    "grace_period_days": 7
  }'
```

#### Password Policies

```yaml
# config/password-policy.yaml
password_policy:
  min_length: 12
  require_uppercase: true
  require_lowercase: true
  require_numbers: true
  require_special: true
  prevent_reuse: 5
  max_age_days: 90
  complexity_score: 3  # 0-4 scale
  prohibited_passwords:
    - password
    - company_name
    - product_name
```

#### Session Management

```yaml
# config/session-policy.yaml
session_policy:
  max_duration_hours: 8
  idle_timeout_minutes: 30
  max_concurrent_sessions: 3
  remember_me_enabled: false
  ip_binding: true
  user_agent_binding: true
```

### Network Security

#### IP Whitelisting

```bash
# Configure IP whitelist
curl -X POST http://localhost:8080/api/v1/admin/network-security \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "ip_whitelist_enabled": true,
    "allowed_ip_ranges": [
      "10.0.0.0/8",
      "192.168.1.0/24",
      "203.0.113.0/24"
    ],
    "allow_vpn_access": true
  }'
```

#### CORS Configuration

```yaml
# config/cors.yaml
cors:
  enabled: true
  allowed_origins:
    - https://llm-gov.yourdomain.com
    - https://app.yourdomain.com
  allowed_methods:
    - GET
    - POST
    - PUT
    - DELETE
  allowed_headers:
    - Authorization
    - Content-Type
  expose_headers:
    - X-RateLimit-Remaining
  max_age_seconds: 3600
  credentials: true
```

### Data Encryption

#### At-Rest Encryption

```yaml
# Database encryption
database:
  encryption:
    enabled: true
    algorithm: AES-256-GCM
    key_rotation_days: 90
    key_management: aws-kms  # or vault, local

# File storage encryption
storage:
  encryption:
    enabled: true
    algorithm: AES-256-GCM
    encrypt_file_names: true
```

#### In-Transit Encryption

All communications should use TLS 1.2 or higher:

```nginx
# Enforce HTTPS
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# HSTS
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### Audit and Compliance

#### Audit Log Configuration

```yaml
# config/audit.yaml
audit:
  enabled: true
  tamper_proof: true
  log_all_requests: true
  log_levels:
    authentication: all
    authorization: all
    data_access: all
    configuration_changes: all
    policy_updates: all
  retention:
    default_days: 365
    compliance_mode_days: 2555  # 7 years
  export:
    format: json
    encryption: true
    compression: gzip
```

---

## Monitoring and Maintenance

### Health Checks

Configure health monitoring:

```bash
# Check all services
curl http://localhost:8080/api/v1/health

# Expected response:
# {
#   "status": "healthy",
#   "services": {
#     "auth": "healthy",
#     "user": "healthy",
#     "policy": "healthy",
#     "audit": "healthy",
#     "metrics": "healthy",
#     "cost": "healthy",
#     "integration": "healthy"
#   },
#   "dependencies": {
#     "database": "healthy",
#     "redis": "healthy"
#   }
# }
```

### Prometheus Metrics

Key metrics to monitor:

**System Metrics:**
- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request latency
- `http_requests_in_flight` - Concurrent requests
- `http_response_size_bytes` - Response sizes

**Application Metrics:**
- `llm_requests_total` - Total LLM requests
- `llm_request_cost_usd` - LLM request costs
- `policy_evaluations_total` - Policy evaluations
- `policy_violations_total` - Policy violations
- `auth_attempts_total` - Authentication attempts
- `auth_failures_total` - Failed authentications

**Infrastructure Metrics:**
- `db_connections_active` - Active DB connections
- `db_query_duration_seconds` - Query performance
- `redis_operations_total` - Redis operations
- `cache_hit_ratio` - Cache effectiveness

### Grafana Dashboards

Import pre-built dashboards:

```bash
# Import dashboard
curl -X POST http://localhost:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${GRAFANA_API_KEY}" \
  -d @dashboards/llm-governance-overview.json
```

Key dashboards:
1. **System Overview** - Overall health and performance
2. **LLM Usage** - Request volumes and patterns
3. **Cost Analytics** - Spending trends and forecasts
4. **Security** - Authentication and violations
5. **Performance** - Latency and throughput

### Log Aggregation

Configure centralized logging:

**Using ELK Stack:**

```yaml
# filebeat.yaml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/llm-governance/*.log
    fields:
      service: llm-governance
      environment: production

output.elasticsearch:
  hosts: ["localhost:9200"]
  index: "llm-governance-%{+yyyy.MM.dd}"
```

**Using Loki:**

```yaml
# promtail-config.yaml
server:
  http_listen_port: 9080

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: llm-governance
    static_configs:
      - targets:
          - localhost
        labels:
          job: llm-governance
          __path__: /var/log/llm-governance/*.log
```

### Alerting

Configure critical alerts:

```yaml
# prometheus/alerts.yaml
groups:
  - name: llm-governance
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} requests/sec"

      - alert: ServiceDown
        expr: up{job="llm-governance"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "{{ $labels.instance }} is unreachable"

      - alert: HighCost
        expr: llm_daily_cost_usd > 1000
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "High daily LLM costs"
          description: "Daily cost is ${{ $value }}"

      - alert: PolicyViolation
        expr: rate(policy_violations_total[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High policy violation rate"
          description: "{{ $value }} violations per second"
```

### Regular Maintenance Tasks

**Daily:**
- Review dashboard for anomalies
- Check error logs
- Verify backup completion
- Monitor cost trends

**Weekly:**
- Review policy violations
- Analyze performance metrics
- Update documentation
- User access review

**Monthly:**
- Security audit
- Capacity planning review
- Cost optimization analysis
- Update dependencies
- Generate compliance reports

**Quarterly:**
- Full security assessment
- Disaster recovery test
- Performance tuning
- User training refresh
- License renewal

---

## Backup and Recovery

### Database Backup

**Automated Backups:**

```bash
#!/bin/bash
# backup-databases.sh

BACKUP_DIR="/var/backups/llm-governance"
DATE=$(date +%Y%m%d_%H%M%S)
DATABASES=(
  "llm_governance_auth"
  "llm_governance_users"
  "llm_governance_policies"
  "llm_governance_audit"
  "llm_governance_metrics"
  "llm_governance_cost"
  "llm_governance_gateway"
  "llm_governance_integrations"
)

for DB in "${DATABASES[@]}"; do
  echo "Backing up $DB..."
  pg_dump -U llm_gov_app -d $DB | gzip > "${BACKUP_DIR}/${DB}_${DATE}.sql.gz"
done

# Upload to S3
aws s3 sync ${BACKUP_DIR} s3://your-backup-bucket/llm-governance/

# Clean up old backups (keep 30 days)
find ${BACKUP_DIR} -type f -mtime +30 -delete
```

**Cron Schedule:**

```cron
# Run backups daily at 2 AM
0 2 * * * /usr/local/bin/backup-databases.sh >> /var/log/backups.log 2>&1
```

### Configuration Backup

```bash
#!/bin/bash
# backup-config.sh

CONFIG_DIR="/etc/llm-governance"
BACKUP_DIR="/var/backups/llm-governance-config"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup configuration files
tar -czf "${BACKUP_DIR}/config_${DATE}.tar.gz" ${CONFIG_DIR}

# Backup environment variables (encrypted)
gpg --encrypt --recipient admin@yourdomain.com \
  -o "${BACKUP_DIR}/env_${DATE}.gpg" .env
```

### Disaster Recovery

**Recovery Procedure:**

1. **Restore Infrastructure**
   ```bash
   # Deploy fresh instance
   helm install llm-governance llm-governance/llm-governance-dashboard \
     --namespace llm-governance
   ```

2. **Restore Databases**
   ```bash
   # Download latest backup
   aws s3 cp s3://your-backup-bucket/llm-governance/latest/ ./backups/ --recursive

   # Restore each database
   for file in backups/*.sql.gz; do
     DB=$(basename $file .sql.gz)
     gunzip -c $file | psql -U postgres -d $DB
   done
   ```

3. **Restore Configuration**
   ```bash
   # Extract configuration
   tar -xzf config_latest.tar.gz -C /etc/

   # Decrypt environment variables
   gpg --decrypt env_latest.gpg > .env
   ```

4. **Verify Services**
   ```bash
   # Check all services are running
   kubectl get pods -n llm-governance

   # Verify database connectivity
   psql -U llm_gov_app -d llm_governance_auth -c "SELECT 1;"

   # Run health checks
   curl http://localhost:8080/api/v1/health
   ```

5. **Test Functionality**
   - Login as admin
   - Verify user accounts
   - Check policies
   - Review audit logs
   - Test LLM integrations

### Recovery Time Objectives

**Target RTOs:**
- Critical systems: < 1 hour
- User-facing services: < 2 hours
- Analytics/reporting: < 4 hours
- Historical data: < 24 hours

**Target RPOs:**
- Database: < 1 hour (hourly backups)
- Configuration: < 24 hours (daily backups)
- Audit logs: 0 (real-time replication)

---

## Performance Tuning

### Database Optimization

**Connection Pooling:**

```yaml
# config/database.yaml
database:
  pool:
    max_connections: 100
    min_idle: 10
    max_lifetime_seconds: 1800
    idle_timeout_seconds: 600
    connection_timeout_seconds: 30
```

**Query Optimization:**

```sql
-- Create indexes for common queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_policies_scope ON policies(scope, priority);
CREATE INDEX idx_requests_user_timestamp ON llm_requests(user_id, timestamp);

-- Analyze tables
ANALYZE users;
ANALYZE policies;
ANALYZE audit_logs;
ANALYZE llm_requests;
```

**Partitioning Large Tables:**

```sql
-- Partition audit logs by month
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    -- other columns
) PARTITION BY RANGE (timestamp);

CREATE TABLE audit_logs_2025_11 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE TABLE audit_logs_2025_12 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
```

### Redis Optimization

```yaml
# config/redis.yaml
redis:
  max_connections: 50
  connection_timeout_ms: 5000
  command_timeout_ms: 3000
  retry_attempts: 3
  retry_delay_ms: 100

  # Eviction policy
  maxmemory: 2gb
  maxmemory_policy: allkeys-lru

  # Persistence
  save_policy:
    - seconds: 900
      changes: 1
    - seconds: 300
      changes: 10
```

### Application Tuning

**Thread Pool Configuration:**

```yaml
# config/runtime.yaml
runtime:
  worker_threads: 8  # Number of CPU cores
  max_blocking_threads: 512
  thread_stack_size: 2mb
  thread_name_prefix: "llm-gov-"
```

**Caching Strategy:**

```yaml
# config/cache.yaml
cache:
  enabled: true
  default_ttl_seconds: 300

  strategies:
    user_data:
      ttl_seconds: 600
      max_size: 10000

    policies:
      ttl_seconds: 300
      max_size: 5000
      preload: true

    audit_logs:
      enabled: false  # Don't cache audit logs
```

### Load Balancing

**Horizontal Scaling:**

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 3  # Scale based on load
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

**Autoscaling:**

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---

## Troubleshooting

### Service Won't Start

**Check Logs:**
```bash
# Docker
docker-compose logs auth-service

# Kubernetes
kubectl logs -n llm-governance deployment/auth-service

# Systemd
journalctl -u llm-governance-auth.service
```

**Common Issues:**
1. Database connection failure - verify credentials and connectivity
2. Port already in use - check for conflicting processes
3. Missing environment variables - verify .env file
4. Permission issues - check file/directory permissions

### Database Issues

**Connection Pool Exhausted:**
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Kill idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND state_change < current_timestamp - interval '5 minutes';
```

**Slow Queries:**
```sql
-- Enable query logging
ALTER DATABASE llm_governance_auth SET log_min_duration_statement = 1000;

-- View slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### High Memory Usage

**Identify Memory Hogs:**
```bash
# Docker
docker stats

# Kubernetes
kubectl top pods -n llm-governance

# System
ps aux --sort=-%mem | head
```

**Solutions:**
- Increase memory limits
- Optimize database queries
- Reduce cache sizes
- Enable memory profiling

### High CPU Usage

**Profile CPU Usage:**
```bash
# Sample CPU profile
perf record -F 99 -p $(pidof auth-service) -g -- sleep 30
perf report

# Rust-specific profiling
cargo flamegraph --bin auth-service
```

**Common Causes:**
- Inefficient algorithms
- Missing indexes on database queries
- Excessive logging
- Busy loops

### Authentication Failures

**Debug Steps:**
1. Verify user exists in database
2. Check password hash
3. Verify JWT secret matches
4. Check token expiration
5. Review CORS settings
6. Check IP whitelist

### Getting Support

**Before Contacting Support:**
1. Check this guide and documentation
2. Review logs for error messages
3. Verify configuration
4. Test with minimal setup
5. Gather diagnostic information

**Support Channels:**
- Email: admin-support@llm-governance.example
- Enterprise Support Portal: https://support.llm-governance.example
- Emergency Hotline: Available for enterprise customers

**Include in Support Requests:**
- Version information
- Deployment method (Docker/K8s/Source)
- Error messages and logs
- Steps to reproduce
- Configuration (sanitized, no secrets)
- System specifications

---

**Document Version:** 1.0
**Last Updated:** November 16, 2025
**Maintainer:** Platform Team

For additional resources, see:
- [USER_GUIDE.md](USER_GUIDE.md)
- [SECURITY_GUIDE.md](SECURITY_GUIDE.md)
- [MONITORING.md](MONITORING.md)
- [DEPLOYMENT.md](DEPLOYMENT.md)
