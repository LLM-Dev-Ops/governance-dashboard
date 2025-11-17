# Build Automation Guide

## Overview

This guide provides comprehensive documentation for all build and automation scripts in the LLM Governance Dashboard project.

## Table of Contents

- [Quick Start](#quick-start)
- [Script Reference](#script-reference)
- [Makefile Commands](#makefile-commands)
- [Development Workflow](#development-workflow)
- [CI/CD Pipeline](#cicd-pipeline)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Initial Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd llm-governance-dashboard

# 2. Setup development environment
make setup
# OR
./scripts/setup-dev.sh

# 3. Start all services
make dev
# OR
./scripts/start-services.sh

# 4. Open the application
# Frontend: http://localhost:5173
# API Gateway: http://localhost:8080
```

### Daily Development

```bash
# Start services
make dev

# Run tests
make test

# Build everything
make build

# Stop services
make stop
```

---

## Script Reference

### 1. build-all.sh - Master Build Script

**Purpose:** Builds all Rust services and frontend with linting and timing.

**Usage:**
```bash
./scripts/build-all.sh [OPTIONS]
```

**Options:**
- `--release` - Build in release mode (optimized)
- `--clean` - Clean build artifacts before building

**Examples:**
```bash
# Debug build
./scripts/build-all.sh

# Release build
./scripts/build-all.sh --release

# Clean build
./scripts/build-all.sh --clean --release
```

**Features:**
- Runs cargo fmt and clippy linters
- Builds all 8 backend services
- Builds frontend production bundle
- Displays timing breakdown
- Logs to `logs/build/build_TIMESTAMP.log`

**Output:**
- Rust binaries: `target/debug/` or `target/release/`
- Frontend build: `frontend/build/`

---

### 2. test-all.sh - Master Test Script

**Purpose:** Runs all tests (backend, frontend, integration, E2E) with coverage.

**Usage:**
```bash
./scripts/test-all.sh [OPTIONS]
```

**Options:**
- `--coverage` - Generate coverage reports
- `--no-e2e` - Skip E2E tests
- `--verbose` or `-v` - Verbose output

**Examples:**
```bash
# Run all tests
./scripts/test-all.sh

# With coverage
./scripts/test-all.sh --coverage

# Skip E2E tests
./scripts/test-all.sh --no-e2e

# Verbose mode with coverage
./scripts/test-all.sh --coverage --verbose
```

**Features:**
- Backend unit tests
- Backend integration tests
- Frontend unit tests
- Frontend E2E tests (Playwright)
- Coverage reports (optional)
- Test timing and statistics

**Output:**
- Logs: `logs/test/test_TIMESTAMP.log`
- Coverage: `coverage/backend/` and `coverage/frontend/`

---

### 3. setup-dev.sh - Development Environment Setup

**Purpose:** Sets up the complete development environment.

**Usage:**
```bash
./scripts/setup-dev.sh [OPTIONS]
```

**Options:**
- `--skip-docker` - Skip Docker container setup
- `--no-seed` - Don't seed initial data

**Examples:**
```bash
# Full setup
./scripts/setup-dev.sh

# Without Docker
./scripts/setup-dev.sh --skip-docker

# Without seeding data
./scripts/setup-dev.sh --no-seed
```

**Features:**
- Checks prerequisites (Rust, Node.js, Docker, PostgreSQL, Redis)
- Installs Rust tools (cargo-watch, cargo-llvm-cov, sqlx-cli)
- Installs Node.js dependencies
- Creates .env file from .env.example
- Starts PostgreSQL and Redis containers
- Runs database migrations
- Seeds initial data
- Builds the project

**What it installs:**
- `cargo-watch` - Auto-rebuild on file changes
- `cargo-llvm-cov` - Code coverage tool
- `sqlx-cli` - Database migration tool
- Frontend npm dependencies

---

### 4. start-services.sh - Start All Services

**Purpose:** Starts PostgreSQL, Redis, all backend services, and frontend.

**Usage:**
```bash
./scripts/start-services.sh [OPTIONS]
```

**Options:**
- `--build` - Build services before starting
- `--no-frontend` - Don't start frontend

**Examples:**
```bash
# Start all services
./scripts/start-services.sh

# Build and start
./scripts/start-services.sh --build

# Backend only
./scripts/start-services.sh --no-frontend
```

**Features:**
- Starts PostgreSQL and Redis with Docker
- Starts all 8 backend services in background
- Starts frontend dev server (Vite)
- Saves PIDs to `logs/services/services.pid`
- Logs each service to separate files

**Service URLs:**
- API Gateway: http://localhost:8080
- Auth Service: http://localhost:8081
- User Service: http://localhost:8082
- Policy Service: http://localhost:8083
- Audit Service: http://localhost:8084
- Metrics Service: http://localhost:8085
- Cost Service: http://localhost:8086
- Integration Service: http://localhost:8087
- Frontend: http://localhost:5173

**Logs:**
- Location: `logs/services/SERVICE_NAME.log`
- PID file: `logs/services/services.pid`

---

### 5. stop-services.sh - Stop All Services

**Purpose:** Stops all running backend services and frontend.

**Usage:**
```bash
./scripts/stop-services.sh [OPTIONS]
```

**Options:**
- `--keep-db` - Keep database services running

**Examples:**
```bash
# Stop everything
./scripts/stop-services.sh

# Keep databases running
./scripts/stop-services.sh --keep-db
```

**Features:**
- Graceful shutdown (SIGTERM) with fallback to force kill (SIGKILL)
- Reads PIDs from `logs/services/services.pid`
- Cleans up any remaining processes
- Optionally stops PostgreSQL and Redis

---

### 6. deploy-local.sh - Local Docker Deployment

**Purpose:** Builds Docker images and deploys using docker-compose.

**Usage:**
```bash
./scripts/deploy-local.sh [OPTIONS]
```

**Options:**
- `--rebuild` - Stop existing containers and rebuild
- `--no-cache` - Build without Docker cache

**Examples:**
```bash
# Deploy
./scripts/deploy-local.sh

# Rebuild everything
./scripts/deploy-local.sh --rebuild --no-cache
```

**Features:**
- Builds all Docker images
- Starts services with docker-compose
- Waits for database readiness
- Runs migrations
- Performs health checks
- Displays service URLs

**Access URLs:**
- Same as start-services.sh
- Plus: Prometheus (http://localhost:9090), Grafana (http://localhost:3000)

---

### 7. deploy-k8s.sh - Kubernetes Deployment

**Purpose:** Builds Docker images, pushes to registry, and deploys to Kubernetes.

**Usage:**
```bash
./scripts/deploy-k8s.sh [OPTIONS]
```

**Options:**
- `--use-helm` - Deploy using Helm charts
- `--namespace NAME` - Kubernetes namespace (default: llm-governance)
- `--registry REGISTRY` - Docker registry (default: localhost:5000)
- `--tag TAG` - Image tag (default: latest)

**Examples:**
```bash
# Deploy with kubectl
./scripts/deploy-k8s.sh

# Deploy with Helm
./scripts/deploy-k8s.sh --use-helm

# Custom registry and namespace
./scripts/deploy-k8s.sh --registry gcr.io/myproject --namespace production --tag v1.0.0
```

**Features:**
- Builds and tags Docker images
- Pushes images to registry
- Creates Kubernetes namespace
- Deploys with kubectl or Helm
- Waits for rollout completion
- Displays deployment status

**Kubernetes Resources:**
- Deployments for all 8 services + frontend
- Services (ClusterIP)
- ConfigMaps and Secrets
- Ingress (optional)
- PostgreSQL and Redis StatefulSets

---

### 8. db-migrate.sh - Database Migration Script

**Purpose:** Runs pending database migrations for all services.

**Usage:**
```bash
./scripts/db-migrate.sh [OPTIONS]
```

**Options:**
- `--rollback` - Rollback last migration
- `--service SERVICE` - Migrate specific service only

**Examples:**
```bash
# Run all migrations
./scripts/db-migrate.sh

# Migrate specific service
./scripts/db-migrate.sh --service auth-service

# Rollback
./scripts/db-migrate.sh --rollback
```

**Features:**
- Creates databases if they don't exist
- Runs migrations using sqlx
- Shows migration status
- Verifies schema
- Handles all 8 service databases

**Databases:**
- `llm_governance_auth` - Auth service
- `llm_governance_users` - User service
- `llm_governance_policies` - Policy service
- `llm_governance_audit` - Audit service
- `llm_governance_metrics` - Metrics service
- `llm_governance_cost` - Cost service
- `llm_governance_gateway` - API Gateway
- `llm_governance_integrations` - Integration service

---

### 9. db-seed.sh - Database Seeding Script

**Purpose:** Seeds initial data for all services.

**Usage:**
```bash
./scripts/db-seed.sh [OPTIONS]
```

**Options:**
- `--reset` - Reset all data (with confirmation)
- `--service SERVICE` - Seed specific service only

**Examples:**
```bash
# Seed all data
./scripts/db-seed.sh

# Seed specific service
./scripts/db-seed.sh --service policy-service
```

**Features:**
- Creates system roles (5 roles)
- Creates default admin user
- Creates sample policies (4 policies)
- Creates LLM provider integrations (3 providers)
- Creates sample metrics data

**Default Credentials:**
- Email: `admin@example.com`
- Password: `Admin123!`

**System Roles:**
1. **Super Admin** - Full system access
2. **Admin** - Administrative access
3. **Policy Manager** - Manage policies
4. **Auditor** - View audit logs and metrics
5. **User** - Basic user access

---

### 10. run-performance-tests.sh - Performance Testing

**Purpose:** Runs k6 load tests and generates reports.

**Usage:**
```bash
./scripts/run-performance-tests.sh [OPTIONS]
```

**Options:**
- `--scenario SCENARIO` - Test scenario (load, stress, spike, soak)
- `--duration DURATION` - Test duration (default: 30s)
- `--vus VUS` - Virtual users (default: 10)

**Examples:**
```bash
# Load test
./scripts/run-performance-tests.sh

# Stress test
./scripts/run-performance-tests.sh --scenario stress --duration 5m --vus 50

# Spike test
./scripts/run-performance-tests.sh --scenario spike --vus 100
```

**Features:**
- Installs k6 if not present
- Starts services if not running
- Generates k6 test scripts
- Runs performance tests
- Generates HTML and JSON reports
- Displays results summary

**Output:**
- JSON results: `performance-results/SCENARIO_TIMESTAMP.json`
- HTML report: `performance-results/report_SCENARIO_TIMESTAMP.html`
- k6 script: `performance-results/test_SCENARIO_TIMESTAMP.js`

---

### 11. ci-pipeline.sh - CI/CD Pipeline Simulation

**Purpose:** Simulates a complete CI/CD pipeline with linting, building, testing, and security scanning.

**Usage:**
```bash
./scripts/ci-pipeline.sh [OPTIONS]
```

**Options:**
- `--skip-tests` - Skip testing stage
- `--skip-security` - Skip security scanning

**Examples:**
```bash
# Full pipeline
./scripts/ci-pipeline.sh

# Skip tests
./scripts/ci-pipeline.sh --skip-tests

# Build and security only
./scripts/ci-pipeline.sh --skip-tests
```

**Pipeline Stages:**
1. **Environment Setup** - Check prerequisites
2. **Code Linting** - cargo fmt, clippy, svelte-check
3. **Build** - Release build of all services
4. **Unit Tests** - Backend and frontend tests
5. **Security Scanning** - cargo audit, npm audit
6. **Generate Artifacts** - Collect binaries and build info

**Output:**
- Artifacts: `ci-artifacts/`
- Binaries: `ci-artifacts/binaries/`
- Frontend: `ci-artifacts/frontend/`
- Build info: `ci-artifacts/build_info.txt`
- Audit report: `ci-artifacts/audit_TIMESTAMP.txt`
- Pipeline log: `logs/ci/ci_TIMESTAMP.log`

---

## Makefile Commands

The Makefile provides convenient shortcuts for all common operations.

### Setup & Installation

```bash
make install       # Install all dependencies
make setup         # Setup development environment
```

### Development

```bash
make dev           # Start all services
make start         # Alias for 'make dev'
make stop          # Stop all services
make restart       # Restart all services
make watch         # Watch and rebuild on changes
```

### Building

```bash
make build         # Build all services (debug)
make build-release # Build all services (release)
make build-clean   # Clean and rebuild
```

### Testing

```bash
make test          # Run all tests
make test-coverage # Run tests with coverage
make test-backend  # Backend tests only
make test-frontend # Frontend tests only
make test-e2e      # E2E tests only
make test-watch    # Tests in watch mode
```

### Code Quality

```bash
make lint          # Run all linters
make format        # Format all code
make check         # Lint + test
make security      # Security audit
```

### Database

```bash
make db-migrate    # Run migrations
make db-seed       # Seed data
make db-reset      # Migrate + seed
make db-shell      # Open PostgreSQL shell
```

### Docker

```bash
make docker-build  # Build Docker images
make docker-up     # Start docker-compose
make docker-down   # Stop docker-compose
make docker-logs   # View logs
make docker-ps     # Show containers
make docker-clean  # Clean Docker resources
```

### Deployment

```bash
make deploy-local  # Deploy with Docker Compose
make deploy-k8s    # Deploy to Kubernetes
make deploy-k8s-helm # Deploy with Helm
```

### Performance & CI

```bash
make perf          # Run performance tests
make perf-stress   # Run stress tests
make ci            # Run CI/CD pipeline
```

### Utilities

```bash
make logs          # Tail all logs
make logs-auth     # Tail auth service logs
make logs-gateway  # Tail API gateway logs
make logs-frontend # Tail frontend logs
make version       # Show tool versions
make status        # Show service status
make health        # Check service health
make docs          # Generate documentation
make clean         # Clean build artifacts
make clean-all     # Clean everything
make help          # Show help message
```

---

## Development Workflow

### First Time Setup

```bash
# 1. Setup environment
make setup

# 2. Verify installation
make version

# 3. Check health
make health
```

### Daily Development

```bash
# Morning - Start services
make dev

# Development cycle
make watch         # In one terminal
make test-watch    # In another terminal

# Before committing
make lint
make test

# Evening - Stop services
make stop
```

### Making Changes

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes
# ... edit code ...

# 3. Format code
make format

# 4. Run linters
make lint

# 5. Run tests
make test

# 6. Build
make build

# 7. Commit
git add .
git commit -m "feat: add new feature"

# 8. Push
git push origin feature/new-feature
```

### Testing Workflow

```bash
# Unit tests only
make test-backend
make test-frontend

# With coverage
make test-coverage

# E2E tests
make test-e2e

# Performance tests
make perf
```

---

## CI/CD Pipeline

### Local CI Simulation

```bash
# Full pipeline
make ci

# Or with script
./scripts/ci-pipeline.sh
```

### Pipeline Stages

1. **Environment Setup** (5-10s)
   - Check Rust, Node.js versions
   - Verify toolchain

2. **Linting** (30-60s)
   - cargo fmt --check
   - cargo clippy
   - svelte-check

3. **Build** (2-5 minutes)
   - cargo build --release
   - npm run build

4. **Testing** (1-3 minutes)
   - Backend unit tests
   - Frontend unit tests
   - Integration tests

5. **Security** (30-60s)
   - cargo audit
   - npm audit

6. **Artifacts** (10-30s)
   - Collect binaries
   - Package frontend
   - Generate build info

### Expected Output

```
Pipeline Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Stages:
  ✓ setup - 8s
  ✓ lint - 45s
  ✓ build - 3m 12s
  ✓ tests - 1m 45s
  ✓ security - 32s
  ✓ artifacts - 15s

Statistics:
  Total Stages:   6
  Passed:         6
  Failed:         0
  Total Duration: 6m 37s

Artifacts:
  Location:      ./ci-artifacts
  Binaries:      ./ci-artifacts/binaries/
  Frontend:      ./ci-artifacts/frontend/
  Build Info:    ./ci-artifacts/build_info.txt
```

---

## Troubleshooting

### Common Issues

#### 1. Services fail to start

**Symptom:**
```
✗ auth-service failed to start
```

**Solutions:**
```bash
# Check if port is in use
lsof -i :8081

# Check logs
tail -f logs/services/auth-service.log

# Verify database is running
make docker-ps

# Rebuild and restart
make build-clean
make dev
```

#### 2. Database connection errors

**Symptom:**
```
Error: Failed to connect to PostgreSQL
```

**Solutions:**
```bash
# Start databases
docker-compose up -d postgres redis

# Check database status
docker ps | grep postgres

# Reset database
make db-reset

# Check connection
PGPASSWORD=password psql -h localhost -U postgres -d llm_governance
```

#### 3. Build failures

**Symptom:**
```
error: could not compile `auth-service`
```

**Solutions:**
```bash
# Clean and rebuild
make clean
make build

# Update dependencies
cargo update

# Check Rust version
rustc --version
```

#### 4. Test failures

**Symptom:**
```
test result: FAILED. 2 passed; 1 failed
```

**Solutions:**
```bash
# Run specific test
cargo test test_name -- --nocapture

# Check test logs
tail -f logs/test/test_*.log

# Run with verbose output
./scripts/test-all.sh --verbose
```

#### 5. Frontend build issues

**Symptom:**
```
✗ Frontend build failed
```

**Solutions:**
```bash
# Clean and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build

# Check Node version
node --version  # Should be >= 18
```

#### 6. Docker issues

**Symptom:**
```
Cannot connect to Docker daemon
```

**Solutions:**
```bash
# Start Docker
sudo systemctl start docker  # Linux
open -a Docker              # macOS

# Check Docker status
docker info

# Clean Docker resources
make docker-clean
```

### Performance Issues

#### Slow builds

```bash
# Use release build caching
export CARGO_INCREMENTAL=1

# Parallel builds
cargo build -j $(nproc)

# Use sccache
cargo install sccache
export RUSTC_WRAPPER=sccache
```

#### High memory usage

```bash
# Limit parallel jobs
cargo build -j 2

# Stop unnecessary services
make stop
```

### Getting Help

```bash
# Show all available commands
make help

# Check versions
make version

# View service status
make status

# Check health
make health
```

### Log Files

All logs are stored in the `logs/` directory:

- `logs/build/` - Build logs
- `logs/test/` - Test logs
- `logs/services/` - Service runtime logs
- `logs/ci/` - CI pipeline logs

```bash
# Tail all logs
make logs

# View specific log
tail -f logs/services/auth-service.log

# Search logs
grep "ERROR" logs/services/*.log
```

---

## Best Practices

### 1. Always run linters before committing

```bash
make lint
make format
```

### 2. Run tests locally before pushing

```bash
make test
```

### 3. Keep services stopped when not developing

```bash
make stop
```

### 4. Use make commands instead of scripts directly

```bash
# Good
make build

# Less convenient
./scripts/build-all.sh
```

### 5. Check health before testing

```bash
make health
```

### 6. Clean periodically

```bash
make clean
```

### 7. Update dependencies regularly

```bash
cargo update
cd frontend && npm update
```

---

## Environment Variables

Key environment variables (see `.env.example` for full list):

```bash
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Auth
AUTH_JWT_SECRET=your-secret-key
AUTH_JWT_EXPIRATION=3600

# Logging
RUST_LOG=info
LOG_FORMAT=json

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

---

## Additional Resources

- [Project README](README.md)
- [Backend Implementation Summary](BACKEND_IMPLEMENTATION_SUMMARY.md)
- [Testing Guide](TESTING_QUICK_START.md)
- [DevOps Deployment Report](DEVOPS_DEPLOYMENT_REPORT.md)

---

## Support

For issues or questions:
1. Check this guide
2. Review logs in `logs/` directory
3. Run `make health` to check service status
4. Check individual service logs
5. Open an issue on the project repository
