# LLM Governance Dashboard - Deployment Guide

Complete guide for deploying the LLM Governance Dashboard to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Docker Compose Deployment](#docker-compose-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Post-Deployment](#post-deployment)

## Prerequisites

### Required Tools

- Docker 24.0+
- Docker Compose 2.20+
- Kubernetes 1.28+ (for K8s deployment)
- kubectl 1.28+
- Helm 3.13+
- Terraform 1.5+ (for cloud deployment)

### Cloud Provider Accounts

- AWS Account with EKS permissions (for AWS)
- Azure Account with AKS permissions (for Azure)
- GCP Account with GKE permissions (for GCP)

## Local Development

### 1. Clone Repository

```bash
git clone https://github.com/your-org/llm-governance-dashboard.git
cd llm-governance-dashboard
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Build Services

```bash
# Build Rust services
cargo build --workspace

# Build frontend
cd frontend
npm install
npm run build
cd ..
```

### 4. Run Services

```bash
# Start databases
docker compose up -d postgres redis

# Run migrations
./scripts/run-migrations.sh

# Start services
cargo run --package api-gateway
cargo run --package auth-service
# ... start other services

# Start frontend
cd frontend
npm run dev
```

## Docker Compose Deployment

### Quick Start

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Production Configuration

Create `docker-compose.prod.yml`:

```yaml
version: '3.9'
services:
  postgres:
    restart: always
    environment:
      POSTGRES_PASSWORD: ${SECURE_PASSWORD}

  redis:
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
```

Deploy:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Health Checks

```bash
# Check service health
docker compose ps

# Test API Gateway
curl http://localhost:8080/health

# Test services
for port in 8081 8082 8083 8084 8085 8086 8087; do
  echo "Testing port $port..."
  curl http://localhost:$port/health
done
```

## Kubernetes Deployment

### 1. Prepare Cluster

```bash
# For AWS EKS
aws eks update-kubeconfig --name llm-governance-cluster --region us-east-1

# For Azure AKS
az aks get-credentials --resource-group llm-governance-rg --name llm-governance-aks

# For GCP GKE
gcloud container clusters get-credentials llm-governance-gke --region us-central1
```

### 2. Install Prerequisites

```bash
# Install cert-manager for TLS
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Install NGINX Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.0/deploy/static/provider/cloud/deploy.yaml

# Install Metrics Server (for HPA)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### 3. Create Namespace and Secrets

```bash
# Create namespace
kubectl create namespace llm-governance

# Create secrets (DO NOT commit to git)
kubectl create secret generic llm-governance-secrets \
  --from-literal=DATABASE_PASSWORD='your-secure-password' \
  --from-literal=REDIS_PASSWORD='your-redis-password' \
  --from-literal=AUTH_JWT_SECRET='your-jwt-secret' \
  --from-literal=OPENAI_API_KEY='your-openai-key' \
  --namespace llm-governance
```

### 4. Deploy with kubectl

```bash
# Apply base manifests
kubectl apply -f k8s/base/namespace.yaml
kubectl apply -f k8s/base/configmap.yaml
kubectl apply -f k8s/base/secret.yaml
kubectl apply -f k8s/base/rbac.yaml

# Deploy databases
kubectl apply -f k8s/base/postgres.yaml
kubectl apply -f k8s/base/redis.yaml

# Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n llm-governance --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n llm-governance --timeout=300s

# Deploy services
kubectl apply -f k8s/base/auth-service.yaml
kubectl apply -f k8s/base/user-service.yaml
kubectl apply -f k8s/base/policy-service.yaml
kubectl apply -f k8s/base/audit-service.yaml
kubectl apply -f k8s/base/metrics-service.yaml
kubectl apply -f k8s/base/cost-service.yaml
kubectl apply -f k8s/base/integration-service.yaml
kubectl apply -f k8s/base/api-gateway.yaml
kubectl apply -f k8s/base/frontend.yaml

# Deploy networking and scaling
kubectl apply -f k8s/base/ingress.yaml
kubectl apply -f k8s/base/hpa.yaml
kubectl apply -f k8s/base/networkpolicy.yaml
```

### 5. Deploy with Helm (Recommended)

```bash
# Install with default values
helm install llm-governance ./helm/llm-governance \
  --namespace llm-governance \
  --create-namespace

# Install with custom values
helm install llm-governance ./helm/llm-governance \
  --namespace llm-governance \
  --create-namespace \
  --values custom-values.yaml

# Upgrade existing deployment
helm upgrade llm-governance ./helm/llm-governance \
  --namespace llm-governance \
  --values custom-values.yaml

# Rollback if needed
helm rollback llm-governance -n llm-governance
```

### 6. Verify Deployment

```bash
# Check pods
kubectl get pods -n llm-governance

# Check services
kubectl get services -n llm-governance

# Check ingress
kubectl get ingress -n llm-governance

# View logs
kubectl logs -f deployment/api-gateway -n llm-governance

# Port forward for testing
kubectl port-forward svc/api-gateway 8080:8080 -n llm-governance
```

## Cloud Deployment

### AWS EKS

#### 1. Initialize Terraform

```bash
cd terraform/aws

# Initialize
terraform init

# Create terraform.tfvars
cat > terraform.tfvars <<EOF
aws_region = "us-east-1"
environment = "production"
project_name = "llm-governance"
db_username = "postgres"
EOF
```

#### 2. Deploy Infrastructure

```bash
# Plan
terraform plan -out=tfplan

# Apply
terraform apply tfplan

# Get outputs
terraform output -json > outputs.json
```

#### 3. Configure kubectl

```bash
aws eks update-kubeconfig --name llm-governance-cluster --region us-east-1
```

#### 4. Deploy Application

```bash
# Update Helm values with Terraform outputs
export RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
export REDIS_ENDPOINT=$(terraform output -raw redis_endpoint)

# Deploy with Helm
helm install llm-governance ./helm/llm-governance \
  --namespace llm-governance \
  --create-namespace \
  --set postgresql.enabled=false \
  --set redis.enabled=false \
  --set config.database.host=$RDS_ENDPOINT \
  --set config.redis.host=$REDIS_ENDPOINT
```

### Azure AKS

```bash
cd terraform/azure

# Initialize and apply
terraform init
terraform plan -out=tfplan
terraform apply tfplan

# Configure kubectl
az aks get-credentials --resource-group llm-governance-rg --name llm-governance-aks

# Deploy application
helm install llm-governance ./helm/llm-governance \
  --namespace llm-governance \
  --create-namespace \
  --values values-azure.yaml
```

### GCP GKE

```bash
cd terraform/gcp

# Initialize and apply
terraform init
terraform plan -out=tfplan
terraform apply tfplan

# Configure kubectl
gcloud container clusters get-credentials llm-governance-gke --region us-central1

# Deploy application
helm install llm-governance ./helm/llm-governance \
  --namespace llm-governance \
  --create-namespace \
  --values values-gcp.yaml
```

## Post-Deployment

### 1. Configure DNS

```bash
# Get LoadBalancer IP/Hostname
kubectl get ingress -n llm-governance

# Update DNS records to point to the ingress
# Example:
# llm-governance.example.com -> <INGRESS_IP>
# api.llm-governance.example.com -> <INGRESS_IP>
```

### 2. Configure TLS Certificates

```bash
# Verify cert-manager issued certificates
kubectl get certificate -n llm-governance

# Check certificate status
kubectl describe certificate llm-governance-tls -n llm-governance
```

### 3. Deploy Monitoring

```bash
# Deploy Prometheus, Grafana, AlertManager
kubectl apply -f k8s/monitoring/

# Access Grafana
kubectl port-forward svc/grafana 3000:80 -n monitoring

# Default credentials: admin/admin123
```

### 4. Run Database Migrations

```bash
# Port forward to database
kubectl port-forward svc/postgres-service 5432:5432 -n llm-governance

# Run migrations
./database/migrations/run.sh
```

### 5. Create Initial Admin User

```bash
# Execute in auth-service pod
kubectl exec -it deployment/auth-service -n llm-governance -- /bin/sh

# Use API to create admin user
curl -X POST http://localhost:8081/api/admin/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword123!",
    "role": "admin"
  }'
```

### 6. Verify Services

```bash
# Check all services are healthy
kubectl get pods -n llm-governance
kubectl get svc -n llm-governance

# Test endpoints
curl https://llm-governance.example.com/health
curl https://api.llm-governance.example.com/health
```

### 7. Configure Backup

```bash
# PostgreSQL backups (using pg_dump)
kubectl create cronjob postgres-backup \
  --image=postgres:16 \
  --schedule="0 2 * * *" \
  -- pg_dump -h postgres-service -U postgres -d llm_governance > /backup/$(date +%Y%m%d).sql

# Or use cloud-native backup solutions:
# - AWS: RDS automated backups
# - Azure: Azure Database for PostgreSQL backups
# - GCP: Cloud SQL automated backups
```

## Troubleshooting

### Pod not starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n llm-governance

# Check logs
kubectl logs <pod-name> -n llm-governance

# Check events
kubectl get events -n llm-governance --sort-by='.lastTimestamp'
```

### Database connection issues

```bash
# Test database connectivity
kubectl run -it --rm debug --image=postgres:16 --restart=Never -- \
  psql -h postgres-service.llm-governance.svc.cluster.local -U postgres

# Check database service
kubectl get svc postgres-service -n llm-governance
```

### Ingress not working

```bash
# Check ingress controller
kubectl get pods -n ingress-nginx

# Check ingress resource
kubectl describe ingress llm-governance-ingress -n llm-governance

# Check ingress controller logs
kubectl logs -f deployment/ingress-nginx-controller -n ingress-nginx
```

## Security Checklist

- [ ] Change all default passwords
- [ ] Configure TLS/SSL certificates
- [ ] Enable network policies
- [ ] Configure RBAC properly
- [ ] Use secrets management (Vault, AWS Secrets Manager, etc.)
- [ ] Enable audit logging
- [ ] Configure firewall rules
- [ ] Enable Pod Security Standards
- [ ] Regular security scans
- [ ] Keep dependencies updated

## Next Steps

- [Scaling Guide](SCALING.md)
- [Monitoring Guide](MONITORING.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [Backup and Recovery](BACKUP.md)
