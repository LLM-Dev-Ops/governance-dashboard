# Scripts Quick Reference Card

## Essential Commands

### First Time Setup
```bash
make setup          # Complete environment setup
make dev            # Start all services
```

### Daily Development
```bash
make dev            # Start services
make stop           # Stop services
make restart        # Restart services
make test           # Run all tests
make build          # Build everything
```

## All Scripts Overview

| Script | Purpose | Key Options |
|--------|---------|-------------|
| `build-all.sh` | Build all services | `--release`, `--clean` |
| `test-all.sh` | Run all tests | `--coverage`, `--no-e2e`, `-v` |
| `setup-dev.sh` | Setup dev environment | `--skip-docker`, `--no-seed` |
| `start-services.sh` | Start all services | `--build`, `--no-frontend` |
| `stop-services.sh` | Stop all services | `--keep-db` |
| `deploy-local.sh` | Docker deployment | `--rebuild`, `--no-cache` |
| `deploy-k8s.sh` | Kubernetes deployment | `--use-helm`, `--namespace`, `--registry` |
| `db-migrate.sh` | Database migrations | `--rollback`, `--service` |
| `db-seed.sh` | Seed initial data | `--reset`, `--service` |
| `run-performance-tests.sh` | Performance tests | `--scenario`, `--duration`, `--vus` |
| `ci-pipeline.sh` | CI/CD simulation | `--skip-tests`, `--skip-security` |

## Make Commands Cheat Sheet

### Setup & Installation
```bash
make install        # Install dependencies
make setup          # Complete setup
```

### Development
```bash
make dev           # Start all services
make stop          # Stop all services
make restart       # Restart services
make watch         # Watch mode (auto-rebuild)
```

### Building
```bash
make build         # Debug build
make build-release # Release build
make build-clean   # Clean + rebuild
```

### Testing
```bash
make test          # All tests
make test-coverage # With coverage
make test-backend  # Backend only
make test-frontend # Frontend only
make test-e2e      # E2E only
make test-watch    # Watch mode
```

### Code Quality
```bash
make lint          # Run linters
make format        # Format code
make check         # Lint + test
make security      # Security audit
```

### Database
```bash
make db-migrate    # Run migrations
make db-seed       # Seed data
make db-reset      # Migrate + seed
make db-shell      # PostgreSQL shell
```

### Docker
```bash
make docker-build  # Build images
make docker-up     # Start containers
make docker-down   # Stop containers
make docker-logs   # View logs
make docker-clean  # Clean resources
```

### Deployment
```bash
make deploy-local  # Docker Compose
make deploy-k8s    # Kubernetes
```

### Monitoring
```bash
make logs          # All logs
make status        # Service status
make health        # Health checks
```

### Utilities
```bash
make version       # Tool versions
make docs          # Generate docs
make clean         # Clean artifacts
make help          # Show help
```

## Service URLs

After running `make dev` or `./scripts/start-services.sh`:

```
Frontend:           http://localhost:5173
API Gateway:        http://localhost:8080
Auth Service:       http://localhost:8081
User Service:       http://localhost:8082
Policy Service:     http://localhost:8083
Audit Service:      http://localhost:8084
Metrics Service:    http://localhost:8085
Cost Service:       http://localhost:8086
Integration Service:http://localhost:8087
```

## Default Credentials

After seeding data:
```
Email:    admin@example.com
Password: Admin123!
```

## Common Workflows

### Start Development
```bash
make setup    # First time only
make dev      # Daily
```

### Run Tests
```bash
make test              # All tests
make test-coverage     # With coverage
```

### Build & Deploy Locally
```bash
make build-release     # Build
make deploy-local      # Deploy
```

### Check Code Quality
```bash
make format   # Format
make lint     # Lint
make test     # Test
```

### CI/CD Pipeline
```bash
make ci       # Run full pipeline
```

## Troubleshooting Quick Fixes

### Services won't start
```bash
make stop
make build-clean
make dev
```

### Database issues
```bash
docker-compose restart postgres redis
make db-reset
```

### Build failures
```bash
make clean
cargo update
make build
```

### Test failures
```bash
./scripts/test-all.sh --verbose
tail -f logs/test/test_*.log
```

### Port conflicts
```bash
make stop
lsof -i :8080  # Check port usage
make dev
```

## Log Locations

```
logs/build/      # Build logs
logs/test/       # Test logs
logs/services/   # Runtime logs
logs/ci/         # CI logs
```

View logs:
```bash
make logs                              # All logs
tail -f logs/services/SERVICE.log     # Specific service
```

## File Locations

```
Scripts:        scripts/
Artifacts:      ci-artifacts/
Coverage:       coverage/
Perf Results:   performance-results/
Docker:         docker-compose.yml
Kubernetes:     k8s/
Helm Charts:    helm/
Migrations:     database/migrations/
```

## Environment Files

```
.env              # Your configuration
.env.example      # Template
```

## Quick Health Check

```bash
make health
```

Expected output:
```
✓ API Gateway
✓ Auth Service
✓ User Service
✓ Policy Service
✓ Audit Service
✓ Metrics Service
✓ Cost Service
✓ Integration Service
```

## Performance Testing

```bash
# Load test (default)
make perf

# Stress test
make perf-stress

# Custom test
./scripts/run-performance-tests.sh --scenario spike --duration 2m --vus 50
```

## Documentation

```
BUILD_AUTOMATION_GUIDE.md  # This guide (detailed)
SCRIPTS_QUICK_REFERENCE.md # Quick reference (you are here)
README.md                  # Project overview
TESTING_QUICK_START.md     # Testing guide
```

---

**Need help?** Run `make help` for all available commands.
