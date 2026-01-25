# Phase 4 Layer 1 - Cloud Run Deployment

## Overview

This deployment guide covers deploying Governance Agents to Google Cloud Run
with Phase 4 Layer 1 compliance for Governance & FinOps.

## Prerequisites

1. Google Cloud SDK installed and configured
2. Project with Cloud Run API enabled
3. Service account: `governance-agents@PROJECT_ID.iam.gserviceaccount.com`
4. Secrets configured in Secret Manager:
   - `RUVECTOR_SERVICE_URL`
   - `RUVECTOR_API_KEY`

## Governance Rules

Agents **MUST**:
- Emit cost signals (`cost_risk_signal`)
- Emit budget threshold signals (`budget_threshold_signal`)
- Emit policy violation signals (`policy_violation_signal`)
- Emit approval required signals (`approval_required_signal`)

Agents **MUST NOT**:
- Auto-enforce policy
- Auto-approve actions

## Performance Budgets

| Metric | Budget |
|--------|--------|
| MAX_TOKENS | 1200 |
| MAX_LATENCY_MS | 2500 |

## Deployment Commands

### Option 1: Cloud Build (Recommended)

```bash
# Set your project ID
export PROJECT_ID=your-project-id
export REGION=us-central1

# Create secrets (one-time setup)
echo -n "https://ruvector.example.com" | \
  gcloud secrets create RUVECTOR_SERVICE_URL --data-file=-

echo -n "your-api-key" | \
  gcloud secrets create RUVECTOR_API_KEY --data-file=-

# Create service account (one-time setup)
gcloud iam service-accounts create governance-agents \
  --display-name="Governance Agents Service Account"

# Grant Secret Manager access
gcloud secrets add-iam-policy-binding RUVECTOR_SERVICE_URL \
  --member="serviceAccount:governance-agents@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding RUVECTOR_API_KEY \
  --member="serviceAccount:governance-agents@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Deploy via Cloud Build
cd packages/agents
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_PROJECT_ID=${PROJECT_ID},_REGION=${REGION}
```

### Option 2: Direct Cloud Run Deploy

```bash
# Build and push image
docker build -t gcr.io/${PROJECT_ID}/governance-agents:latest \
  -f packages/agents/Dockerfile packages/agents

docker push gcr.io/${PROJECT_ID}/governance-agents:latest

# Deploy to Cloud Run
gcloud run deploy governance-agents \
  --image gcr.io/${PROJECT_ID}/governance-agents:latest \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated=false \
  --set-secrets RUVECTOR_SERVICE_URL=RUVECTOR_SERVICE_URL:latest,RUVECTOR_API_KEY=RUVECTOR_API_KEY:latest \
  --set-env-vars AGENT_PHASE=phase4,AGENT_LAYER=layer1,MAX_TOKENS=1200,MAX_LATENCY_MS=2500,NODE_ENV=production \
  --memory 256Mi \
  --cpu 1 \
  --timeout 3s \
  --concurrency 80 \
  --min-instances 0 \
  --max-instances 10 \
  --service-account governance-agents@${PROJECT_ID}.iam.gserviceaccount.com
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | 8080 |
| `AGENT_PHASE` | Deployment phase | phase4 |
| `AGENT_LAYER` | Deployment layer | layer1 |
| `MAX_TOKENS` | Token budget | 1200 |
| `MAX_LATENCY_MS` | Latency budget | 2500 |
| `NODE_ENV` | Node environment | production |

## Secrets (from Secret Manager)

| Secret | Description |
|--------|-------------|
| `RUVECTOR_SERVICE_URL` | RuVector service endpoint |
| `RUVECTOR_API_KEY` | RuVector API authentication |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/ready` | GET | Readiness check |
| `/agents` | GET | List available agents |
| `/agents/usage-oversight` | POST | Execute Usage Oversight Agent |
| `/agents/change-impact` | POST | Execute Change Impact Agent |

## Decision Event Types

Phase 4 Layer 1 adds these signal types:
- `cost_risk_signal` - Cost risk detected
- `budget_threshold_signal` - Budget threshold crossed
- `policy_violation_signal` - Policy violation detected
- `approval_required_signal` - Human approval required

## Verification Checklist

- [ ] Secrets configured in Secret Manager
- [ ] Service account created with Secret Manager access
- [ ] Cloud Run service deployed
- [ ] Health endpoint returns 200
- [ ] Agents emit DecisionEvents to RuVector
- [ ] Performance budgets are logged (not enforced)
- [ ] Agents do NOT auto-enforce policy
- [ ] Agents do NOT auto-approve actions
