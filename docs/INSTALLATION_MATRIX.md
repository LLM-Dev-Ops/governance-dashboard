# Installation Options Matrix

**LLM Governance Dashboard v1.0.0**

This guide compares all available installation methods to help you choose the right approach for your use case.

---

## Quick Comparison Table

| Method | Difficulty | Time | Best For | Production Ready |
|--------|-----------|------|----------|------------------|
| **Docker Compose** | Easy | 5-10 min | Development, Testing, POC | No |
| **Kubernetes + Helm** | Medium | 30-60 min | Production, Scaling | Yes |
| **Kubernetes (Manual)** | Hard | 2-4 hours | Custom deployments | Yes |
| **From Source** | Medium | 30-60 min | Development, Customization | No |
| **Cloud Managed** | Easy | 15-30 min | Managed services, Quick start | Yes |
| **Binary Install** | Easy | 10-20 min | Single server, Simple setup | Limited |

---

## 1. Docker Compose

### Overview
Runs all services in Docker containers using docker-compose orchestration. Best for local development and testing.

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+
- 8 GB RAM minimum
- 20 GB disk space

### Installation Steps
```bash
# 1. Clone repository
git clone https://github.com/your-org/llm-governance-dashboard.git
cd llm-governance-dashboard

# 2. Configure environment
cp .env.example .env
nano .env  # Edit with your settings

# 3. Start services
docker-compose up -d

# 4. Initialize database
docker-compose exec api-gateway /scripts/init-db.sh

# 5. Access dashboard
# http://localhost:3000
```

### Pros
- Fastest setup
- Easy to tear down and restart
- Good for development
- Includes all dependencies
- No external infrastructure needed
- Built-in networking

### Cons
- Not production-ready
- No high availability
- Limited scalability
- No automatic failover
- Manual updates required
- Resource limits not enforced

### When to Use
- Local development
- Testing and POC
- Demo environments
- Learning the platform
- Integration testing

### Cost
- Free (local resources only)

---

## 2. Kubernetes with Helm

### Overview
Production-ready deployment using Kubernetes with Helm charts for simplified management.

### Prerequisites
- Kubernetes 1.24+ cluster
- Helm 3.0+
- kubectl configured
- 16 GB RAM (cluster total)
- 100 GB disk space
- PostgreSQL 14+ with TimescaleDB
- Redis 7+

### Installation Steps
```bash
# 1. Add Helm repository
helm repo add llm-governance https://charts.llm-governance.io
helm repo update

# 2. Create namespace
kubectl create namespace llm-governance

# 3. Create values file
helm show values llm-governance/llm-governance-dashboard > values.yaml

# 4. Edit values
nano values.yaml

# 5. Install chart
helm install llm-governance llm-governance/llm-governance-dashboard \
  --namespace llm-governance \
  --values values.yaml

# 6. Wait for deployment
kubectl -n llm-governance get pods -w

# 7. Access dashboard
kubectl -n llm-governance port-forward svc/frontend 3000:3000
```

### Pros
- Production-ready
- High availability
- Auto-scaling
- Easy upgrades
- Rollback support
- Resource management
- Monitoring included
- Industry standard

### Cons
- Requires K8s knowledge
- Infrastructure overhead
- More complex troubleshooting
- Higher resource requirements
- Managed K8s costs (cloud)

### When to Use
- Production deployments
- High availability required
- Scaling needs
- Team with K8s expertise
- Cloud-native environments
- Enterprise deployments

### Cost
- Managed K8s: $70-500+/month (cloud)
- Self-hosted: Hardware + maintenance
- Database: $50-300+/month (managed)
- Redis: $20-100+/month (managed)

---

## 3. Kubernetes (Manual Manifests)

### Overview
Deploy using raw Kubernetes YAML manifests for maximum control and customization.

### Prerequisites
- Same as Helm method
- Deep Kubernetes knowledge
- Understanding of K8s resources

### Installation Steps
```bash
# 1. Clone repository
git clone https://github.com/your-org/llm-governance-dashboard.git
cd llm-governance-dashboard/k8s

# 2. Create namespace
kubectl apply -f base/namespace.yaml

# 3. Create secrets
kubectl create secret generic llm-governance-secrets \
  --from-env-file=../.env \
  --namespace llm-governance

# 4. Apply configurations
kubectl apply -f base/configmap.yaml
kubectl apply -f base/postgres.yaml
kubectl apply -f base/redis.yaml

# 5. Apply services
kubectl apply -f base/auth-service.yaml
kubectl apply -f base/user-service.yaml
# ... (all services)

# 6. Apply gateway and ingress
kubectl apply -f base/api-gateway.yaml
kubectl apply -f base/ingress.yaml

# 7. Apply monitoring
kubectl apply -f monitoring/
```

### Pros
- Maximum control
- Full customization
- No Helm dependency
- GitOps friendly
- Transparent configuration

### Cons
- Very complex
- Time-consuming
- Error-prone
- Manual updates
- No templating
- Harder to maintain

### When to Use
- Custom requirements
- GitOps workflows
- No Helm allowed
- Maximum control needed
- Specialized environments

### Cost
- Same as Helm method

---

## 4. From Source

### Overview
Build and run services directly from source code. Best for development and customization.

### Prerequisites
- Rust 1.75+
- Node.js 18+
- PostgreSQL 14+ (local or remote)
- Redis 7+ (local or remote)
- 16 GB RAM
- 50 GB disk space

### Installation Steps
```bash
# 1. Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. Install Node.js (using nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18

# 3. Clone repository
git clone https://github.com/your-org/llm-governance-dashboard.git
cd llm-governance-dashboard

# 4. Set up PostgreSQL
createdb llm_governance_auth
createdb llm_governance_users
createdb llm_governance_policies
createdb llm_governance_audit
createdb llm_governance_metrics
createdb llm_governance_cost
createdb llm_governance_gateway
createdb llm_governance_integrations

# 5. Install TimescaleDB extension
psql -d llm_governance_metrics -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"

# 6. Configure environment
cp .env.example .env
nano .env

# 7. Build backend
cargo build --workspace --release

# 8. Run migrations
cargo install sqlx-cli
cd services/auth-service && sqlx migrate run && cd ../..
# Repeat for each service

# 9. Build frontend
cd frontend
npm install
npm run build
cd ..

# 10. Start services (use multiple terminals or tmux)
cargo run -p api-gateway &
cargo run -p auth-service &
cargo run -p user-service &
# ... (all services)

# 11. Start frontend
cd frontend && npm run preview
```

### Pros
- Full source access
- Easy debugging
- Custom modifications
- Latest features
- No Docker overhead
- Direct development

### Cons
- Complex setup
- Manual service management
- No orchestration
- Platform-specific issues
- Dependency management
- Not production-ready

### When to Use
- Development
- Contributing code
- Custom modifications
- Learning internals
- Performance testing
- Debugging issues

### Cost
- Free (local resources only)
- Development time

---

## 5. Cloud Managed Services

### Overview
Deploy using cloud provider managed services (RDS, ElastiCache, EKS/GKE/AKS).

### Prerequisites
- Cloud account (AWS/GCP/Azure)
- Cloud CLI tools
- kubectl and helm
- Basic cloud knowledge

### Installation Steps (AWS Example)

```bash
# 1. Set up EKS cluster
eksctl create cluster \
  --name llm-governance \
  --region us-west-2 \
  --nodegroup-name standard-workers \
  --node-type t3.large \
  --nodes 3

# 2. Set up RDS PostgreSQL
aws rds create-db-instance \
  --db-instance-identifier llm-governance-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 14.7 \
  --master-username admin \
  --master-user-password YourStrongPassword \
  --allocated-storage 100

# 3. Set up ElastiCache Redis
aws elasticache create-cache-cluster \
  --cache-cluster-id llm-governance-redis \
  --cache-node-type cache.t3.medium \
  --engine redis \
  --num-cache-nodes 1

# 4. Configure kubectl
aws eks update-kubeconfig --region us-west-2 --name llm-governance

# 5. Install with Helm (pointing to managed services)
helm install llm-governance llm-governance/llm-governance-dashboard \
  --set postgresql.enabled=false \
  --set postgresql.external.host=<RDS-ENDPOINT> \
  --set redis.enabled=false \
  --set redis.external.host=<ELASTICACHE-ENDPOINT>
```

### Pros
- Fully managed
- High availability
- Automatic backups
- Scaling included
- Security updates
- Monitoring included
- Disaster recovery
- Enterprise support

### Cons
- Vendor lock-in
- Higher costs
- Less control
- Cloud-specific knowledge
- Potential egress costs

### When to Use
- Production deployments
- Enterprise environments
- Need for SLA
- Limited DevOps resources
- Quick production setup
- Compliance requirements

### Cost (AWS Example)
- EKS: $73/month (cluster) + $140/month (3x t3.large nodes)
- RDS: $60-120/month (db.t3.medium)
- ElastiCache: $30-60/month (cache.t3.medium)
- Load Balancer: $20-30/month
- **Total: ~$350-450/month** (minimum)

---

## 6. Binary Installation

### Overview
Install pre-compiled binaries on a single server. Simplest production deployment for small teams.

### Prerequisites
- Linux server (Ubuntu 22.04 recommended)
- 8 GB RAM
- 50 GB disk space
- PostgreSQL 14+
- Redis 7+
- systemd

### Installation Steps

```bash
# 1. Download latest release
wget https://github.com/your-org/llm-governance-dashboard/releases/download/v1.0.0/llm-governance-linux-amd64.tar.gz

# 2. Extract binaries
tar -xzf llm-governance-linux-amd64.tar.gz
cd llm-governance-linux-amd64

# 3. Install binaries
sudo cp bin/* /usr/local/bin/
sudo chmod +x /usr/local/bin/llm-governance-*

# 4. Set up databases
createdb llm_governance

# 5. Configure environment
sudo mkdir -p /etc/llm-governance
sudo cp .env.example /etc/llm-governance/.env
sudo nano /etc/llm-governance/.env

# 6. Install systemd services
sudo cp systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload

# 7. Start services
sudo systemctl enable llm-governance-*
sudo systemctl start llm-governance-*

# 8. Check status
sudo systemctl status llm-governance-api-gateway
```

### Pros
- Simple installation
- No containers needed
- Direct system access
- Low overhead
- Easy monitoring
- Traditional sysadmin friendly

### Cons
- Single point of failure
- Manual scaling
- No orchestration
- Manual updates
- Limited HA
- Platform-specific binaries

### When to Use
- Small deployments
- Single server setup
- Traditional infrastructure
- No container environment
- Limited K8s expertise
- POC to production bridge

### Cost
- VPS: $40-100/month (8GB RAM)
- Managed PostgreSQL: $20-50/month
- Managed Redis: $10-30/month
- **Total: ~$70-180/month**

---

## Decision Matrix

### Choose Docker Compose if:
- You're developing or testing
- You need quick setup
- You're doing a POC
- You're learning the platform

### Choose Kubernetes + Helm if:
- You need production deployment
- You require high availability
- You need auto-scaling
- You have K8s expertise
- You're cloud-native

### Choose Kubernetes Manual if:
- You need maximum control
- You have specific customizations
- You're doing GitOps
- You have deep K8s knowledge

### Choose From Source if:
- You're developing features
- You're debugging issues
- You need custom modifications
- You're contributing code

### Choose Cloud Managed if:
- You want fully managed
- You need enterprise SLA
- You have cloud budget
- You want quick production setup

### Choose Binary Install if:
- You have a single server
- You want traditional deployment
- You have limited resources
- You're transitioning to production

---

## Migration Paths

### From Docker Compose → Kubernetes
1. Export data from Docker volumes
2. Set up K8s cluster
3. Deploy with Helm
4. Import data
5. Test thoroughly
6. Switch DNS/traffic

### From Binary → Kubernetes
1. Backup databases
2. Set up K8s cluster
3. Deploy with Helm
4. Restore databases
5. Test
6. Decommission old server

### From Source → Production
1. Build release binaries
2. Choose deployment method
3. Set up infrastructure
4. Deploy binaries
5. Configure monitoring
6. Go live

---

## Recommended Configurations

### Small Team (< 10 users)
- **Method:** Binary Installation or Docker Compose
- **Infrastructure:** Single VPS (8GB RAM)
- **Database:** SQLite or managed PostgreSQL
- **Cost:** $50-100/month

### Medium Team (10-100 users)
- **Method:** Kubernetes + Helm
- **Infrastructure:** 3-node K8s cluster
- **Database:** Managed PostgreSQL with replicas
- **Cost:** $300-600/month

### Large Enterprise (100+ users)
- **Method:** Kubernetes + Helm on Cloud
- **Infrastructure:** Multi-region K8s
- **Database:** HA PostgreSQL cluster
- **Cost:** $1,000-5,000+/month

---

## Support for Each Method

| Method | Community Support | Documentation | Professional Support |
|--------|------------------|---------------|---------------------|
| Docker Compose | Excellent | Excellent | Available |
| K8s + Helm | Excellent | Excellent | Available |
| K8s Manual | Good | Good | Available |
| From Source | Excellent | Excellent | Limited |
| Cloud Managed | Good | Good | Available |
| Binary | Good | Good | Available |

---

## Next Steps

After choosing your installation method:

1. Review the **PRODUCTION_READINESS_CHECKLIST.md**
2. Follow installation steps in **DEPLOYMENT.md**
3. Configure according to **CONFIGURATION_GUIDE.md**
4. Set up monitoring per **MONITORING.md**
5. Review security in **SECURITY_GUIDE.md**
6. Read **TROUBLESHOOTING.md** for common issues

---

**Need help deciding?** Contact us at support@llm-governance.io or join our Discord community.
