# Backend Quick Start Guide

## Overview

This guide will help you get all 8 microservices up and running quickly.

## Prerequisites

- Rust 1.70+ (`rustup install stable`)
- PostgreSQL 15+ with TimescaleDB extension
- Redis 7+
- Docker & Docker Compose (optional, recommended)

## Quick Start

### 1. Environment Setup

Create `.env` file in project root:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/llm_governance

# Redis
REDIS_URL=redis://localhost:6379

# Auth Service
AUTH_HOST=0.0.0.0
AUTH_PORT=8081
AUTH_JWT_SECRET=your-super-secret-jwt-key-min-32-chars
AUTH_JWT_EXPIRATION=3600
AUTH_REFRESH_TOKEN_EXPIRATION=2592000
AUTH_MFA_ISSUER=LLM-Governance

# LLM Provider API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# User Service
USER_HOST=0.0.0.0
USER_PORT=8082
USER_DATABASE_URL=${DATABASE_URL}
USER_REDIS_URL=${REDIS_URL}

# Policy Service
POLICY_HOST=0.0.0.0
POLICY_PORT=8083
POLICY_DATABASE_URL=${DATABASE_URL}

# Audit Service
AUDIT_HOST=0.0.0.0
AUDIT_PORT=8084
AUDIT_DATABASE_URL=${DATABASE_URL}

# Metrics Service
METRICS_HOST=0.0.0.0
METRICS_PORT=8085
METRICS_DATABASE_URL=${DATABASE_URL}

# Cost Service
COST_HOST=0.0.0.0
COST_PORT=8086
COST_DATABASE_URL=${DATABASE_URL}

# Integration Service
INTEGRATION_HOST=0.0.0.0
INTEGRATION_PORT=8087
INTEGRATION_DATABASE_URL=${DATABASE_URL}

# API Gateway
GATEWAY_HOST=0.0.0.0
GATEWAY_PORT=8080
GATEWAY_JWT_SECRET=${AUTH_JWT_SECRET}
GATEWAY_AUTH_SERVICE_URL=http://localhost:8081
GATEWAY_USER_SERVICE_URL=http://localhost:8082
GATEWAY_POLICY_SERVICE_URL=http://localhost:8083
GATEWAY_AUDIT_SERVICE_URL=http://localhost:8084
GATEWAY_METRICS_SERVICE_URL=http://localhost:8085
GATEWAY_COST_SERVICE_URL=http://localhost:8086
GATEWAY_INTEGRATION_SERVICE_URL=http://localhost:8087
```

### 2. Database Setup

```bash
# Start PostgreSQL with TimescaleDB
docker run -d \
  --name llm-governance-db \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  timescale/timescaledb:latest-pg15

# Run migrations
cd database
psql $DATABASE_URL -f migrations/001_create_extensions.sql
psql $DATABASE_URL -f migrations/002_create_base_functions.sql
psql $DATABASE_URL -f migrations/003_create_users_and_auth_tables.sql
psql $DATABASE_URL -f migrations/004_create_roles_tables.sql
psql $DATABASE_URL -f migrations/005_create_teams_table.sql
psql $DATABASE_URL -f migrations/006_create_policies_table.sql
psql $DATABASE_URL -f migrations/007_create_audit_logs_table.sql
psql $DATABASE_URL -f migrations/008_create_alerts_table.sql
psql $DATABASE_URL -f migrations/009_create_metrics_tables.sql
psql $DATABASE_URL -f migrations/010_create_views.sql
psql $DATABASE_URL -f migrations/011_create_seed_data.sql
```

### 3. Start Redis

```bash
docker run -d \
  --name llm-governance-redis \
  -p 6379:6379 \
  redis:7-alpine
```

### 4. Build All Services

```bash
# Build workspace
cargo build --release

# Or build individual services
cargo build -p auth-service --release
cargo build -p user-service --release
cargo build -p policy-service --release
cargo build -p audit-service --release
cargo build -p metrics-service --release
cargo build -p cost-service --release
cargo build -p integration-service --release
cargo build -p api-gateway --release
```

### 5. Run Services

#### Option A: Run individually (for development)

```bash
# Terminal 1 - Auth Service
cd services/auth-service
cargo run

# Terminal 2 - User Service
cd services/user-service
cargo run

# Terminal 3 - Policy Service
cd services/policy-service
cargo run

# Terminal 4 - Audit Service
cd services/audit-service
cargo run

# Terminal 5 - Metrics Service
cd services/metrics-service
cargo run

# Terminal 6 - Cost Service
cd services/cost-service
cargo run

# Terminal 7 - Integration Service
cd services/integration-service
cargo run

# Terminal 8 - API Gateway
cd services/api-gateway
cargo run
```

#### Option B: Use tmux script (recommended)

```bash
#!/bin/bash
# save as start-services.sh

tmux new-session -d -s llm-governance

tmux split-window -h
tmux split-window -h
tmux split-window -h
tmux select-layout tiled

tmux select-pane -t 0
tmux send-keys "cd services/auth-service && cargo run" C-m

tmux select-pane -t 1
tmux send-keys "cd services/user-service && cargo run" C-m

tmux select-pane -t 2
tmux send-keys "cd services/policy-service && cargo run" C-m

tmux select-pane -t 3
tmux send-keys "cd services/audit-service && cargo run" C-m

tmux attach-session -t llm-governance
```

### 6. Verify Services

```bash
# Check auth service
curl http://localhost:8081/api/v1/health

# Check user service
curl http://localhost:8082/api/v1/health

# Check policy service
curl http://localhost:8083/api/v1/health

# Check audit service
curl http://localhost:8084/api/v1/health

# Check metrics service
curl http://localhost:8085/api/v1/health

# Check cost service
curl http://localhost:8086/api/v1/health

# Check integration service
curl http://localhost:8087/api/v1/health

# Check API gateway
curl http://localhost:8080/health
```

## API Testing

### 1. Register a User

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword123!",
    "name": "Admin User"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword123!"
  }'
```

Save the `access_token` from response.

### 3. Create a Policy

```bash
curl -X POST http://localhost:8080/api/v1/policies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Cost Limit Policy",
    "description": "Limit costs to $1 per request",
    "policy_type": "cost",
    "enforcement_level": "strict",
    "rules": {
      "max_cost_per_request": 1.0
    }
  }'
```

### 4. Proxy LLM Request

```bash
curl -X POST http://localhost:8080/api/v1/integrations/proxy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "provider": "openai",
    "model": "gpt-3.5-turbo",
    "messages": [
      {
        "role": "user",
        "content": "Hello, world!"
      }
    ],
    "max_tokens": 100
  }'
```

### 5. Check Metrics

```bash
curl -X GET "http://localhost:8080/api/v1/metrics/stats/usage?team_id=YOUR_TEAM_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 6. View Audit Logs

```bash
curl -X GET "http://localhost:8080/api/v1/audit/logs?limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Common Issues

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker ps | grep llm-governance-db

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### Redis Connection Issues

```bash
# Check Redis is running
docker ps | grep llm-governance-redis

# Test connection
redis-cli ping
```

### Port Conflicts

```bash
# Check if ports are in use
lsof -i :8080,8081,8082,8083,8084,8085,8086,8087
```

### Compilation Errors

```bash
# Clean build
cargo clean

# Update dependencies
cargo update

# Rebuild
cargo build
```

## Service Ports

| Service | Port | URL |
|---------|------|-----|
| API Gateway | 8080 | http://localhost:8080 |
| Auth Service | 8081 | http://localhost:8081 |
| User Service | 8082 | http://localhost:8082 |
| Policy Service | 8083 | http://localhost:8083 |
| Audit Service | 8084 | http://localhost:8084 |
| Metrics Service | 8085 | http://localhost:8085 |
| Cost Service | 8086 | http://localhost:8086 |
| Integration Service | 8087 | http://localhost:8087 |

## API Documentation

### Authentication Endpoints

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/mfa/verify` - Verify MFA code
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Logout

### User Management

- `GET /api/v1/users` - List users
- `GET /api/v1/users/{id}` - Get user
- `POST /api/v1/users` - Create user
- `PUT /api/v1/users/{id}` - Update user
- `DELETE /api/v1/users/{id}` - Delete user

### Policy Management

- `GET /api/v1/policies` - List policies
- `GET /api/v1/policies/{id}` - Get policy
- `POST /api/v1/policies` - Create policy
- `PUT /api/v1/policies/{id}` - Update policy
- `POST /api/v1/policies/{id}/evaluate` - Evaluate policy

### Audit Logs

- `POST /api/v1/audit/logs` - Create audit log
- `GET /api/v1/audit/logs` - Query logs
- `GET /api/v1/audit/logs/{id}` - Get log
- `POST /api/v1/audit/export` - Export logs

### Metrics

- `POST /api/v1/metrics/ingest` - Ingest metric
- `GET /api/v1/metrics/query` - Query metrics
- `GET /api/v1/metrics/aggregate/hourly` - Hourly stats
- `GET /api/v1/metrics/aggregate/daily` - Daily stats

### Cost Management

- `POST /api/v1/costs/calculate` - Calculate cost
- `GET /api/v1/costs/team/{id}` - Team costs
- `POST /api/v1/costs/budgets` - Create budget
- `GET /api/v1/costs/forecast` - Forecast costs

### LLM Integration

- `POST /api/v1/integrations/proxy` - Proxy LLM request
- `GET /api/v1/integrations/providers` - List providers
- `GET /api/v1/integrations/health` - Provider health

## Development Tips

### Hot Reload

Use `cargo-watch` for automatic recompilation:

```bash
cargo install cargo-watch

# In service directory
cargo watch -x run
```

### Logging

Set logging level:

```bash
RUST_LOG=debug cargo run
RUST_LOG=info,sqlx=debug cargo run
```

### Testing

```bash
# Run tests
cargo test

# Run tests with output
cargo test -- --nocapture

# Run specific test
cargo test test_name
```

### Database Queries

```bash
# Connect to database
psql $DATABASE_URL

# Common queries
SELECT * FROM users;
SELECT * FROM policies;
SELECT * FROM audit_logs LIMIT 10;
SELECT * FROM llm_metrics ORDER BY time DESC LIMIT 10;
```

## Production Deployment

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: timescale/timescaledb:latest-pg15
    environment:
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  auth-service:
    build: ./services/auth-service
    ports:
      - "8081:8081"
    depends_on:
      - postgres
      - redis

  # Add other services...

volumes:
  postgres-data:
```

### Kubernetes

See `k8s/` directory for Kubernetes manifests.

## Support

For issues or questions:
1. Check logs: `journalctl -u service-name`
2. Check database: `psql $DATABASE_URL`
3. Check Redis: `redis-cli`
4. Review error messages in terminal output

## Next Steps

1. Complete database migrations
2. Set up monitoring (Prometheus + Grafana)
3. Configure SSL/TLS certificates
4. Set up CI/CD pipeline
5. Add comprehensive tests
6. Deploy to staging environment
