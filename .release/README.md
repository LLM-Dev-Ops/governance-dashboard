# Release Package Directory

This directory contains release-ready artifacts and deployment resources for LLM Governance Dashboard v1.0.0.

## Directory Structure

```
.release/
├── README.md                   # This file
├── docker/                     # Docker-related files
│   ├── docker-compose.yml      # Complete stack composition
│   └── BUILD_INSTRUCTIONS.md   # Docker build guide
├── helm/                       # Kubernetes Helm charts
│   ├── Chart.yaml              # Helm chart metadata
│   ├── values.yaml             # Default configuration values
│   └── INSTALL_GUIDE.md        # Helm installation instructions
├── scripts/                    # Deployment and utility scripts
│   ├── quick-start.sh          # One-command deployment
│   ├── health-check.sh         # System health verification
│   └── backup.sh               # Backup utility
├── configs/                    # Sample configuration files
│   ├── .env.production         # Production environment template
│   ├── .env.staging            # Staging environment template
│   └── .env.development        # Development environment template
└── migrations/                 # Database migration bundles
    └── all-services/           # Complete migration package
```

## Quick Start

### Option 1: Docker Compose (Fastest)

```bash
cd .release/docker
docker-compose up -d
```

Access the dashboard at: http://localhost:3000

### Option 2: Quick Start Script

```bash
cd .release/scripts
./quick-start.sh
```

### Option 3: Kubernetes with Helm

```bash
cd .release/helm
helm install llm-governance . --namespace llm-governance --create-namespace
```

## Pre-Built Resources

### Docker Images

Pre-built images are available at:
- Docker Hub: `llmgovernance/llm-governance-dashboard:1.0.0`
- GitHub Container Registry: `ghcr.io/your-org/llm-governance-dashboard:1.0.0`

Services included:
- api-gateway:1.0.0
- auth-service:1.0.0
- user-service:1.0.0
- policy-service:1.0.0
- audit-service:1.0.0
- metrics-service:1.0.0
- cost-service:1.0.0
- integration-service:1.0.0
- frontend:1.0.0

### Helm Chart

Packaged chart: `llm-governance-dashboard-1.0.0.tgz`

Install from repository:
```bash
helm repo add llm-governance https://charts.llm-governance.io
helm install llm-governance llm-governance/llm-governance-dashboard
```

## Configuration

### Environment Variables

Sample .env files are provided in `configs/` directory:

1. **Production** (`.env.production`)
   - Optimized for production deployments
   - Security-hardened settings
   - Performance tuning

2. **Staging** (`.env.staging`)
   - Similar to production
   - Testing and QA environment

3. **Development** (`.env.development`)
   - Local development
   - Debug logging enabled
   - Relaxed security for testing

### Database Migrations

All database migrations are bundled in `migrations/all-services/`:
- Organized by service
- Includes rollback scripts
- Versioned and tested

Apply migrations:
```bash
cd migrations/all-services
./apply-migrations.sh
```

## Scripts

### quick-start.sh

One-command deployment for development/testing:
- Sets up environment
- Starts databases
- Deploys all services
- Runs health checks

Usage:
```bash
./scripts/quick-start.sh
```

### health-check.sh

Verifies all services are running and healthy:
- Checks all service endpoints
- Validates database connections
- Tests API gateway routing
- Generates health report

Usage:
```bash
./scripts/health-check.sh
```

### backup.sh

Backup utility for databases and configurations:
- PostgreSQL dumps
- Redis snapshots
- Configuration backups
- Automated scheduling support

Usage:
```bash
./scripts/backup.sh [daily|weekly|manual]
```

## Docker Deployment

### Using Docker Compose

Complete stack with all dependencies:

```bash
cd .release/docker
cp ../configs/.env.production .env
# Edit .env with your settings
docker-compose up -d
```

Services will be available at:
- Frontend: http://localhost:3000
- API Gateway: http://localhost:8080
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001

### Building from Source

See `docker/BUILD_INSTRUCTIONS.md` for:
- Custom image builds
- Multi-stage build optimization
- Image tagging strategies
- Registry push instructions

## Helm Deployment

### Quick Install

```bash
cd .release/helm
kubectl create namespace llm-governance
helm install llm-governance . \
  --namespace llm-governance \
  --set postgresql.password=YourPassword \
  --set redis.password=YourRedisPassword
```

### Custom Values

Create your values file:
```bash
cp values.yaml my-values.yaml
# Edit my-values.yaml
helm install llm-governance . \
  --namespace llm-governance \
  --values my-values.yaml
```

See `helm/INSTALL_GUIDE.md` for detailed instructions.

## Verification

After deployment, verify the installation:

```bash
# Run health checks
./scripts/health-check.sh

# Check service logs
docker-compose logs -f  # Docker
kubectl logs -f -l app=llm-governance  # Kubernetes

# Access the dashboard
# Open http://localhost:3000 in your browser
```

Default credentials:
- Email: admin@example.com
- Password: Change-Me-123!

**Important:** Change default credentials immediately!

## Troubleshooting

Common issues and solutions:

1. **Port conflicts**
   - Check ports 3000, 8080-8087, 5432, 6379, 9090, 3001
   - Modify docker-compose.yml or values.yaml if needed

2. **Database connection errors**
   - Verify PostgreSQL is running
   - Check database credentials in .env
   - Ensure databases are created

3. **Service won't start**
   - Check logs: `docker-compose logs [service]`
   - Verify environment variables
   - Check resource limits (CPU/RAM)

For detailed troubleshooting, see:
- Main docs: `/docs/TROUBLESHOOTING.md`
- Support guide: `/SUPPORT_GUIDE.md`

## Production Deployment

Before deploying to production:

1. **Review Checklists:**
   - [ ] `VALIDATION_CHECKLIST.md`
   - [ ] `PRODUCTION_READINESS_CHECKLIST.md`

2. **Security:**
   - [ ] Change all default passwords
   - [ ] Generate secure JWT secret
   - [ ] Configure TLS/SSL
   - [ ] Set up firewall rules
   - [ ] Enable MFA for admins

3. **Monitoring:**
   - [ ] Configure Prometheus alerts
   - [ ] Set up Grafana dashboards
   - [ ] Configure log aggregation
   - [ ] Set up uptime monitoring

4. **Backup:**
   - [ ] Configure automated backups
   - [ ] Test backup restoration
   - [ ] Set retention policies

5. **Testing:**
   - [ ] Run load tests
   - [ ] Execute security scans
   - [ ] Verify disaster recovery

## Support

- **Documentation:** See main `/docs` directory
- **Issues:** https://github.com/your-org/llm-governance-dashboard/issues
- **Community:** https://discord.gg/llm-governance
- **Professional:** support@llm-governance.io

## Updates

To update to a newer version:

```bash
# Docker Compose
docker-compose pull
docker-compose up -d

# Helm
helm repo update
helm upgrade llm-governance llm-governance/llm-governance-dashboard
```

## License

MIT License - See main LICENSE file

---

**Release Version:** 1.0.0
**Release Date:** 2025-11-16
**Package Maintainer:** Release Team
