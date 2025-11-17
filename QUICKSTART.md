# 🚀 Quick Start Guide

Get your self-hosted LLM Governance Dashboard running in under 5 minutes!

## Prerequisites

- **Docker** 20.10+ and **Docker Compose** 2.0+
- **2GB RAM** minimum (4GB recommended)
- **5GB disk space** for images and data

## Option 1: Docker Compose (Recommended for Getting Started)

### Step 1: Clone and Configure

```bash
# Clone the repository
git clone https://github.com/yourusername/llm-governance-dashboard.git
cd llm-governance-dashboard

# Copy and configure environment variables
cp .env.example .env
```

### Step 2: Edit Configuration

Open `.env` in your editor and update these critical values:

```bash
# REQUIRED: Change these security-critical values!
AUTH_JWT_SECRET=$(openssl rand -base64 32)
DATABASE_PASSWORD=$(openssl rand -base64 24)
REDIS_PASSWORD=$(openssl rand -base64 24)

# OPTIONAL: Add your LLM provider API keys
OPENAI_API_KEY=sk-your-actual-key-here
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

### Step 3: Start All Services

```bash
# Start the platform
docker-compose up -d

# Watch the logs (optional)
docker-compose logs -f
```

### Step 4: Access the Dashboard

1. Open your browser to **http://localhost:3000**
2. Login with default credentials:
   - **Email**: `admin@example.com`
   - **Password**: `Admin123!`
3. **⚠️ IMPORTANT**: Change the admin password immediately!

### Step 5: Create Your First Organization

1. Navigate to **Settings → Organizations**
2. Click **Create Organization**
3. Fill in:
   - **Name**: Your Company Name
   - **Slug**: `your-company` (used in URLs)
   - **Description**: Optional description
4. Click **Create**

### Step 6: Configure LLM Providers

1. Go to **Organizations → [Your Org] → Providers**
2. Click **Add Provider**
3. Select provider (OpenAI, Anthropic, etc.)
4. Enter your API key
5. Click **Save**

### Step 7: Add Models

1. Go to **Providers → [Your Provider] → Models**
2. Click **Add Model**
3. Configure:
   - **Model Name**: `gpt-4`, `claude-3-sonnet`, etc.
   - **Display Name**: Friendly name
   - **Cost per 1K tokens**: Input and output pricing
   - **Context Window**: Token limit
4. Click **Save**

### Step 8: Set Budget Limits (Optional)

1. Go to **Cost Management → Budgets**
2. Click **Create Budget**
3. Configure:
   - **Name**: "Monthly Team Budget"
   - **Amount**: $500
   - **Period**: Monthly
   - **Alert Threshold**: 80%
   - **Hard Limit**: Yes/No
4. Click **Create**

## ✅ You're Ready!

Your LLM Governance Dashboard is now running! Here's what you can do:

### For Developers
```bash
# Make an LLM request through the gateway
curl -X POST http://localhost:8080/api/v1/llm/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model_id": "YOUR_MODEL_ID",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

### For Administrators
- **Dashboard**: View real-time metrics and costs
- **Policies**: Create governance rules
- **Audit Logs**: Review all API activity
- **Reports**: Generate cost and usage reports

## Common Tasks

### Add Team Members

```bash
# Navigate to Organizations → Members → Invite
# Or use the API:
curl -X POST http://localhost:8080/api/v1/organizations/{org_id}/members \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"user_id": "USER_UUID", "role": "member"}'
```

### Create Teams

1. Go to **Organizations → Teams → Create Team**
2. Add team members
3. Set team-specific budgets and quotas

### View Cost Analytics

1. Navigate to **Cost Analytics**
2. Filter by:
   - Time period
   - Organization/Team/User
   - Model/Provider
3. Export reports as CSV/JSON

## Stopping the Platform

```bash
# Stop all services (keeps data)
docker-compose stop

# Stop and remove containers (keeps data volumes)
docker-compose down

# DANGER: Remove everything including data
docker-compose down -v
```

## Troubleshooting

### Services Won't Start

```bash
# Check service status
docker-compose ps

# View logs for specific service
docker-compose logs postgres
docker-compose logs api-gateway

# Restart specific service
docker-compose restart api-gateway
```

### Database Connection Errors

```bash
# Check postgres is healthy
docker-compose exec postgres pg_isready

# Check TimescaleDB extension
docker-compose exec postgres psql -U postgres -d llm_governance -c "SELECT * FROM pg_extension WHERE extname='timescaledb';"
```

### Can't Login

```bash
# Reset admin password
docker-compose exec postgres psql -U postgres -d llm_governance
# Then run:
UPDATE users SET password_hash = crypt('NewPassword123!', gen_salt('bf')) WHERE email = 'admin@example.com';
```

### Port Already in Use

Edit `docker-compose.yml` and change port mappings:

```yaml
# Change 3000 to another port
frontend:
  ports:
    - "3001:3000"  # Change here
```

## Next Steps

- 📖 [User Guide](docs/USER_GUIDE.md) - Comprehensive user documentation
- 🏗️ [Architecture](docs/ARCHITECTURE.md) - System design and components
- 🔒 [Security Guide](docs/SECURITY_GUIDE.md) - Security best practices
- ☸️ [Kubernetes Deployment](docs/KUBERNETES_DEPLOYMENT.md) - Production deployment
- 📊 [API Documentation](docs/API_DOCUMENTATION.md) - REST API reference

## Getting Help

- **GitHub Issues**: https://github.com/yourusername/llm-governance-dashboard/issues
- **Discussions**: https://github.com/yourusername/llm-governance-dashboard/discussions
- **Discord**: https://discord.gg/llm-governance

## Production Deployment

⚠️ This quickstart is for development/testing. For production:

1. Use **Kubernetes** with the provided Helm charts
2. Set up **TLS/SSL** certificates
3. Configure **external database** (managed PostgreSQL)
4. Enable **monitoring** (Prometheus/Grafana)
5. Set up **backups** and disaster recovery
6. Review [Production Deployment Guide](docs/PRODUCTION_DEPLOYMENT.md)

---

**Happy Governing! 🎉**
