# LLM Governance Dashboard - Quick Start Guide

**Get up and running in 5 minutes**

---

## What is LLM Governance Dashboard?

The LLM Governance Dashboard is an enterprise-grade platform for managing, monitoring, and governing Large Language Model (LLM) usage across your organization. It provides centralized control, cost tracking, policy enforcement, and comprehensive audit trails.

---

## Prerequisites

Before you begin, ensure you have:

- **Docker & Docker Compose** (recommended for quick start) OR
- **Kubernetes cluster** (for production) OR
- **Rust 1.75+, PostgreSQL 14+, Redis 7+** (for source installation)

**System Requirements:**
- 4 GB RAM minimum (8 GB recommended)
- 2 CPU cores minimum (4 cores recommended)
- 20 GB disk space
- Network access to LLM providers

---

## Installation Options

Choose the method that best fits your needs:

### Option 1: Docker Compose (Fastest - Recommended for Testing)

**Best for:** Quick testing, development, small teams

```bash
# 1. Clone the repository
git clone https://github.com/your-org/llm-governance-dashboard.git
cd llm-governance-dashboard

# 2. Configure environment
cp .env.example .env
nano .env  # Edit with your settings (see configuration section below)

# 3. Start all services
docker-compose up -d

# 4. Wait for services to be ready (30-60 seconds)
docker-compose ps

# 5. Access the dashboard
# Open browser to: http://localhost:3000
```

**That's it!** Skip to [First Login](#first-login) section.

---

### Option 2: Kubernetes (Production-Ready)

**Best for:** Production deployments, high availability, scalability

```bash
# 1. Add Helm repository
helm repo add llm-governance https://charts.llm-governance.example
helm repo update

# 2. Create namespace
kubectl create namespace llm-governance

# 3. Create configuration values
cat > custom-values.yaml <<EOF
global:
  domain: llm-gov.yourdomain.com

database:
  enabled: true
  storage: 50Gi

redis:
  enabled: true

ingress:
  enabled: true
  className: nginx
  tls:
    enabled: true

replicas:
  apiGateway: 3
  authService: 2
  userService: 2
EOF

# 4. Install the chart
helm install llm-governance llm-governance/llm-governance-dashboard \
  --namespace llm-governance \
  --values custom-values.yaml

# 5. Wait for pods to be ready
kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/name=llm-governance \
  -n llm-governance \
  --timeout=300s

# 6. Get the application URL
kubectl get ingress -n llm-governance
```

---

### Option 3: From Source (Development)

**Best for:** Development, customization, learning

```bash
# 1. Prerequisites check
rustc --version  # Should be 1.75 or later
psql --version   # Should be 14 or later
redis-cli --version  # Should be 7 or later

# 2. Clone repository
git clone https://github.com/your-org/llm-governance-dashboard.git
cd llm-governance-dashboard

# 3. Set up databases
createdb llm_governance_auth
createdb llm_governance_users
createdb llm_governance_policies
createdb llm_governance_audit
createdb llm_governance_metrics
createdb llm_governance_cost
createdb llm_governance_gateway
createdb llm_governance_integrations

# 4. Configure environment
cp .env.example .env
nano .env  # Edit database URLs and other settings

# 5. Build all services
cargo build --release --workspace

# 6. Run database migrations
./scripts/migrate-all.sh

# 7. Start Redis
redis-server &

# 8. Start services (use tmux or separate terminals)
./target/release/auth-service &
./target/release/user-service &
./target/release/policy-service &
./target/release/audit-service &
./target/release/metrics-service &
./target/release/cost-service &
./target/release/integration-service &
./target/release/api-gateway &

# 9. Start frontend (if included)
cd frontend
npm install
npm run dev
```

---

## Essential Configuration

Edit your `.env` file with these critical settings:

```bash
# Database Configuration
DATABASE_URL=postgresql://llm_gov:password@localhost/llm_governance

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Secret (IMPORTANT: Generate a strong random secret!)
# Use: openssl rand -base64 32
JWT_SECRET=your-super-secret-key-change-this-immediately
JWT_EXPIRATION=3600

# Application URLs
API_GATEWAY_URL=http://localhost:8080
FRONTEND_URL=http://localhost:3000

# LLM Provider API Keys (Optional - add as needed)
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# Email Configuration (Optional - for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@yourdomain.com

# Environment
ENVIRONMENT=development
LOG_LEVEL=info
```

> **Security Note:** Never use default secrets in production! Generate strong, unique secrets for JWT and database passwords.

---

## First Login

### Create Your Admin Account

**If using Docker Compose or K8s with automated setup:**

1. Open your browser to the dashboard URL
2. You'll see a "First Time Setup" page
3. Create your admin account:
   - **Email:** admin@yourdomain.com
   - **Password:** Create a strong password (12+ characters)
   - **Full Name:** Your name
4. Click "Create Admin Account"

**If using manual setup:**

```bash
# Create admin user via API
curl -X POST http://localhost:8081/api/v1/admin/bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "temporary-password-change-me",
    "name": "System Administrator"
  }'
```

### Login

1. Navigate to: `http://localhost:3000` (or your configured URL)
2. Enter your email and password
3. Click "Sign In"

### Set Up Multi-Factor Authentication (Recommended)

1. After login, you'll be prompted to set up MFA
2. Scan the QR code with your authenticator app:
   - Google Authenticator
   - Authy
   - 1Password
   - Microsoft Authenticator
3. Enter the 6-digit code to verify
4. **Save your backup codes** in a secure location
5. Click "Complete Setup"

> **Important:** Store backup codes securely. You'll need them if you lose your phone.

---

## Basic Configuration

### Step 1: Configure Your Organization

1. Click **Settings** (gear icon) in the top right
2. Go to **Organization** tab
3. Fill in your organization details:
   - Organization Name
   - Industry
   - Size
   - Primary Use Case
4. Click **Save**

### Step 2: Set Up Your First Team

1. Navigate to **Teams** in the sidebar
2. Click **Create Team**
3. Enter team details:
   - **Name:** Engineering (or your team name)
   - **Description:** Software Engineering Team
4. Click **Create Team**

### Step 3: Invite Team Members

1. Navigate to **Users** > **Invite User**
2. Enter user details:
   - **Email:** colleague@yourdomain.com
   - **Name:** John Doe
   - **Role:** Standard User (or appropriate role)
   - **Team:** Engineering
3. Click **Send Invitation**
4. User will receive an email to complete setup

### Step 4: Connect Your First LLM Provider

1. Navigate to **Integrations** > **LLM Providers**
2. Click **Add Provider**
3. Select your provider (e.g., OpenAI)
4. Enter your API key
5. Test the connection
6. Click **Save**

**Supported Providers:**
- OpenAI (GPT-4, GPT-3.5, etc.)
- Anthropic (Claude)
- Google (PaLM, Gemini)
- Azure OpenAI
- Custom providers via API

---

## Create Your First Policy

Policies control how LLMs can be used in your organization.

### Example: Daily Cost Limit Policy

1. Navigate to **Policies** > **Create Policy**
2. Select **Cost Policy** as the type
3. Configure the policy:

```yaml
Name: Daily Cost Limit
Description: Prevent excessive daily spending
Type: Cost Limit
Scope: Organization-wide

Rules:
  - Daily limit: $100
  - Per-user limit: $10
  - Alert at: 75%
  - Block at: 100%

Actions:
  - At 75%: Send email notification
  - At 90%: Alert administrators
  - At 100%: Block new requests
```

4. Click **Create & Activate**

### Example: Rate Limiting Policy

1. Navigate to **Policies** > **Create Policy**
2. Select **Rate Limit** as the type
3. Configure:

```yaml
Name: Standard Rate Limit
Description: Prevent API abuse
Type: Rate Limit
Scope: Organization-wide

Rules:
  - Requests per minute: 60
  - Requests per hour: 1000
  - Requests per day: 10000

Actions:
  - On exceed: Throttle
  - Notify user: Yes
```

### Example: Content Filter Policy

1. Navigate to **Policies** > **Create Policy**
2. Select **Content Filter** as the type
3. Configure:

```yaml
Name: PII Protection
Description: Block sensitive data
Type: Content Filter
Scope: Organization-wide

Rules:
  - Block: Social Security Numbers
  - Block: Credit Card Numbers
  - Block: API Keys
  - Block: Passwords

Actions:
  - On detect: Block request
  - Log violation: Yes
  - Notify admin: Yes
```

---

## Making Your First LLM Request

### Using the Web Interface

1. Navigate to **Playground**
2. Select a model (e.g., GPT-4)
3. Enter your prompt
4. Click **Send Request**
5. View the response and metadata (cost, tokens, etc.)

### Using the API

```bash
# Get your API key
# Navigate to: Settings > API Keys > Create API Key

# Make a request
curl -X POST http://localhost:8080/api/v1/llm/chat \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "model": "gpt-4",
    "messages": [
      {
        "role": "user",
        "content": "Hello, how are you?"
      }
    ]
  }'
```

### Using the SDK (Python)

```python
# Install the SDK
pip install llm-governance-client

# Initialize client
from llm_governance import Client

client = Client(
    api_url="http://localhost:8080",
    api_key="YOUR_API_KEY"
)

# Make a request
response = client.chat.create(
    provider="openai",
    model="gpt-4",
    messages=[
        {"role": "user", "content": "Hello, how are you?"}
    ]
)

print(response.content)
print(f"Cost: ${response.cost}")
print(f"Tokens: {response.tokens}")
```

---

## Monitor Your Usage

### View Dashboard

1. Navigate to **Home** (dashboard icon)
2. Review key metrics:
   - **Total Requests Today:** Number of LLM requests
   - **Current Cost:** Spending today
   - **Active Policies:** Policies in effect
   - **Recent Activity:** Latest requests

### Check Costs

1. Navigate to **Analytics** > **Costs**
2. View cost breakdown by:
   - Time period
   - Provider
   - Model
   - Team
   - User

### Review Audit Logs

1. Navigate to **Audit** > **Audit Logs**
2. Filter by:
   - Date range
   - User
   - Action type
   - Result

---

## Next Steps

Now that you're up and running, explore these features:

### Immediate Next Steps

1. **Set Up Budgets**
   - Navigate to **Analytics** > **Budgets**
   - Create monthly budget limits
   - Configure alerts

2. **Create More Policies**
   - Content filtering
   - Time-based restrictions
   - Model-specific limits

3. **Configure Alerts**
   - Set up cost alerts
   - Policy violation notifications
   - Usage threshold warnings

4. **Invite Your Team**
   - Add team members
   - Assign appropriate roles
   - Organize into teams

### Learn More

- **[USER_GUIDE.md](USER_GUIDE.md)** - Comprehensive user guide
- **[ADMIN_GUIDE.md](ADMIN_GUIDE.md)** - Administrator guide
- **[TUTORIALS.md](TUTORIALS.md)** - Step-by-step tutorials
- **[FEATURES.md](FEATURES.md)** - Full feature catalog
- **[FAQ.md](FAQ.md)** - Frequently asked questions

### Advanced Features

- **Team Hierarchies** - Create nested team structures
- **Custom Reports** - Generate compliance reports
- **Slack Integration** - Receive alerts in Slack
- **SSO Integration** - Connect to your identity provider
- **API Access** - Integrate with your applications
- **Webhooks** - Automate workflows

---

## Common Issues

### Can't Access the Dashboard

**Check services are running:**

```bash
# Docker
docker-compose ps

# Kubernetes
kubectl get pods -n llm-governance

# Source
ps aux | grep llm-gov
```

**Check logs:**

```bash
# Docker
docker-compose logs api-gateway

# Kubernetes
kubectl logs -n llm-governance deployment/api-gateway
```

### Login Fails

1. Verify email and password are correct
2. Check Caps Lock is off
3. Try password reset
4. Check service logs for errors

### LLM Requests Fail

1. Verify provider API key is correct
2. Check integration is active
3. Review applicable policies
4. Check provider service status

### Services Won't Start

1. Verify all prerequisites are installed
2. Check database is running and accessible
3. Verify Redis is running
4. Check environment variables are set
5. Review logs for specific errors

---

## Getting Help

### Documentation

- **User Guide:** [USER_GUIDE.md](USER_GUIDE.md)
- **Admin Guide:** [ADMIN_GUIDE.md](ADMIN_GUIDE.md)
- **Tutorials:** [TUTORIALS.md](TUTORIALS.md)
- **FAQ:** [FAQ.md](FAQ.md)

### Support

- **Email:** support@llm-governance.example
- **Documentation:** https://docs.llm-governance.example
- **Community:** https://community.llm-governance.example
- **GitHub Issues:** https://github.com/your-org/llm-governance-dashboard/issues

### Community

- **Discord:** https://discord.gg/llm-governance
- **Slack:** https://llm-governance.slack.com
- **Forum:** https://forum.llm-governance.example

---

## Security Checklist

Before going to production, ensure you:

- [ ] Changed all default passwords
- [ ] Generated strong JWT secret
- [ ] Enabled HTTPS/TLS
- [ ] Configured firewall rules
- [ ] Enabled MFA for admin accounts
- [ ] Set up database backups
- [ ] Configured audit logging
- [ ] Reviewed security policies
- [ ] Tested disaster recovery
- [ ] Updated to latest version

---

## Congratulations!

You've successfully set up the LLM Governance Dashboard! You can now:

✅ Manage LLM usage across your organization
✅ Enforce policies and compliance
✅ Track costs and optimize spending
✅ Maintain comprehensive audit trails
✅ Secure your LLM infrastructure

**What's next?** Explore the [full feature set](FEATURES.md) or dive into [advanced tutorials](TUTORIALS.md).

---

**Version:** 1.0
**Last Updated:** November 16, 2025

**Need help?** Visit our [documentation](https://docs.llm-governance.example) or [contact support](mailto:support@llm-governance.example).
