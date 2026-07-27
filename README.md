# 🚀 LLM Governance Dashboard

**Open Source, Self-Hosted Platform for LLM DevOps, Cost Analytics, and Multi-Tenant Governance**

[![Version](https://img.shields.io/badge/version-0.x--dev-orange.svg)](https://github.com/LLM-Dev-Ops/governance-dashboard)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![CI](https://github.com/LLM-Dev-Ops/governance-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/LLM-Dev-Ops/governance-dashboard/actions/workflows/ci.yml)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

> **Status: pre-1.0, under active development — not production-ready.** This is an open source, self-hosted platform being built for multi-tenant LLM governance: real-time cost tracking, budget enforcement, policy management, and comprehensive analytics, deployed on your own infrastructure with full control and data privacy. The feature list below describes the target scope, not a shipped release — see [`docs/COMPLETION_ROADMAP.md`](docs/COMPLETION_ROADMAP.md) for what is built versus planned. Notably, `services/auth-service` is still largely stubbed (login, JWT validation, MFA, OAuth, and rate limiting are unimplemented), so this is **not** safe to expose to untrusted users or real tenant data today.

---

## ✨ Features

### 🏢 Multi-Tenancy & Organizations
- **Organizations & Teams** - Complete workspace isolation with hierarchical access control
- **Role-Based Access** - Owner, Admin, Member, Viewer roles at org and team levels
- **Self-Hosted** - Deploy on your own infrastructure for complete data sovereignty
- **Multi-Tenant Ready** - Serve multiple organizations from a single deployment

### 💰 Cost Analytics & Budget Management
- **Real-Time Cost Tracking** - Track every LLM API request with token-level granularity using TimescaleDB
- **Multi-Level Budgets** - Set budgets at organization, team, or user level
- **Budget Alerts** - Configurable thresholds with hard limits to prevent overspending
- **Cost Forecasting** - Predict future spend based on historical usage patterns
- **Chargeback Reports** - Allocate costs across teams and projects with custom tags

### 🔌 LLM Provider Integration
- **Multiple Providers** - OpenAI, Anthropic, Azure OpenAI, Cohere, Hugging Face, custom endpoints
- **Model Management** - Configure pricing per model with automatic cost calculation
- **Provider Configuration** - Secure API key storage and endpoint management per organization
- **Usage Analytics** - Track requests, tokens, latency, and errors across all providers

### 📊 Governance & Policy
- **Policy Management** - 6 policy types with real-time enforcement
- **Rate Limiting** - Quotas for requests/tokens per minute/hour/day
- **Audit Logs** - Immutable audit trail for compliance (GDPR/HIPAA/SOC 2)
- **Security** - JWT auth, OAuth2 (Google/GitHub), MFA/2FA, RBAC

### 🚀 Deployment & DevOps
- **Docker Compose** - Single command deployment for development
- **Kubernetes** - Manifests and Helm charts (`k8s/`, `helm/`)
- **Infrastructure as Code** - Terraform modules included
- **Monitoring** - Prometheus metrics, Grafana dashboards, OpenTelemetry

---

## 📦 Published Packages

### NPM Packages

We provide a complete SDK and CLI for integrating with the LLM Governance Dashboard:

#### [@llm-dev-ops/llm-governance-types](https://www.npmjs.com/package/@llm-dev-ops/llm-governance-types) ![npm](https://img.shields.io/npm/v/@llm-dev-ops/llm-governance-types)

TypeScript type definitions for the entire API surface.

```bash
npm install @llm-dev-ops/llm-governance-types
```

```typescript
import type { User, Organization, LLMProvider } from '@llm-dev-ops/llm-governance-types';
```

#### [@llm-dev-ops/llm-governance-sdk](https://www.npmjs.com/package/@llm-dev-ops/llm-governance-sdk) ![npm](https://img.shields.io/npm/v/@llm-dev-ops/llm-governance-sdk)

Full-featured TypeScript/JavaScript SDK for interacting with the API.

```bash
npm install @llm-dev-ops/llm-governance-sdk
```

```typescript
import { LLMGovernanceSDK } from '@llm-dev-ops/llm-governance-sdk';

const sdk = new LLMGovernanceSDK({
  baseUrl: 'https://api.example.com/v1',
  token: 'your-access-token'
});

// Use the SDK
const user = await sdk.auth.getCurrentUser();
const orgs = await sdk.organizations.listOrganizations();
```

**Features:**
- ✅ Browser-agnostic (uses standard Fetch API)
- ✅ Authentication API (login, register, MFA, password reset)
- ✅ Organizations API (CRUD, members, teams)
- ✅ LLM Providers & Models API
- ✅ Comprehensive TypeScript types
- ✅ Full documentation with examples

#### [@llm-dev-ops/llm-governance-cli](https://www.npmjs.com/package/@llm-dev-ops/llm-governance-cli) ![npm](https://img.shields.io/npm/v/@llm-dev-ops/llm-governance-cli)

Command-line interface for managing your LLM Governance Dashboard from the terminal.

```bash
npm install -g @llm-dev-ops/llm-governance-cli
```

```bash
# Login
llm-gov auth login

# List organizations
llm-gov org list

# Create a provider
llm-gov provider create <org-id>

# View all commands
llm-gov --help
```

**Commands:**
- `auth` - Authentication (login, logout, whoami)
- `org` - Organization management (CRUD, members)
- `team` - Team management (CRUD, members)
- `provider` - LLM provider management (OpenAI, Anthropic, Azure, Bedrock, custom)
- `model` - LLM model management
- `config` - CLI configuration management

**Features:**
- ✅ Interactive prompts for complex operations
- ✅ JSON output mode for scripting (`--json`)
- ✅ Colored and formatted table output
- ✅ Secure credential storage
- ✅ CI/CD ready

### Rust Crates (Coming Soon)

Rust libraries for building custom integrations and services:

- **llm-governance-common** - Shared types and utilities
- **llm-governance-auth** - Authentication library
- **llm-governance-db** - Database utilities
- **llm-governance-api-client** - Rust API client

---

## 🎯 Quick Start

### Docker Compose (Fastest - 2 minutes)

```bash
# Clone the repository
git clone https://github.com/LLM-Dev-Ops/governance-dashboard.git
cd governance-dashboard

# Copy environment template and configure
cp .env.example .env
# Edit .env and set your LLM provider API keys and database passwords

# Start all services
docker-compose up -d

# Run database migrations
docker-compose exec postgres psql -U postgres -d llm_governance -f /docker-entrypoint-initdb.d/migrations/0011_organizations_and_cost_tracking.sql

# Access dashboard
open http://localhost:3000
```

**Default Credentials:** `admin@example.com` / `Admin123!` ⚠️ **Change immediately!**

**What's Included:**
- PostgreSQL with TimescaleDB extension
- Redis for caching and sessions
- 8 microservices (auth, user, policy, audit, metrics, cost, integration, api-gateway)
- SvelteKit frontend
- PgAdmin for database management (optional, dev profile)

### Kubernetes (Production)

```bash
# Using Helm
helm install llm-governance ./helm/llm-governance \
  --namespace llm-governance \
  --create-namespace

# Or using kubectl
kubectl apply -f k8s/
```

### From Source

```bash
# Prerequisites: Rust 1.75+, Node.js 20+, PostgreSQL, Redis
make setup && make dev
```

---

## 📚 Documentation

### Getting Started
- [Quick Start Guide](docs/QUICK_START.md) - 5-minute setup
- [User Guide](docs/USER_GUIDE.md) - Complete user manual
- [Admin Guide](docs/ADMIN_GUIDE.md) - System administration
- [Tutorials](docs/TUTORIALS.md) - Step-by-step guides

### Development
- [API Documentation](docs/API_DOCUMENTATION.md) - REST API reference
- [Architecture](docs/ARCHITECTURE.md) - System design
- [Contributing](docs/CONTRIBUTING.md) - Contribution guidelines
- [Testing Guide](docs/TESTING.md) - Testing infrastructure

### Deployment
- [Deployment Guide](docs/DEPLOYMENT.md) - All deployment options
- [Installation Matrix](docs/INSTALLATION_MATRIX.md) - Choose your deployment
- [Monitoring Guide](docs/MONITORING.md) - Observability setup
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues

### Security & Compliance
- [Security Guide](docs/SECURITY_GUIDE.md) - Security best practices
- [Compliance Guide](docs/COMPLIANCE_GUIDE.md) - GDPR, HIPAA, SOC 2

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (SvelteKit)                     │
│     Organizations • Teams • Budgets • Cost Analytics        │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                  API Gateway (Port 8080)                    │
│      Routing • Auth • Rate Limiting • CORS • Logging        │
└────────────────────┬────────────────────────────────────────┘
                     │
          ┌──────────┼──────────────┐
          │          │              │
┌─────────▼─────┐ ┌─▼──────────┐ ┌─▼─────────┐ ┌─────────────┐
│  Auth Service │ │   User     │ │  Policy   │ │    Audit    │
│     :8081     │ │  Service   │ │  Service  │ │   Service   │
│               │ │   :8082    │ │   :8083   │ │    :8084    │
│ • JWT Auth    │ │ • Orgs     │ │ • Rules   │ │ • Immutable │
│ • OAuth2      │ │ • Teams    │ │ • Enforce │ │ • Logs      │
│ • MFA/2FA     │ │ • Members  │ │ • Alerts  │ │ • Compliance│
└───────────────┘ └────────────┘ └───────────┘ └─────────────┘

┌─────────────┐ ┌──────────────┐ ┌─────────────────┐ ┌────────┐
│   Metrics   │ │     Cost     │ │  Integration    │ │ Redis  │
│   Service   │ │   Service    │ │    Service      │ │ Cache  │
│    :8085    │ │    :8086     │ │     :8087       │ │ :6379  │
│             │ │              │ │                 │ │        │
│ • Usage     │ │ • Budgets    │ │ • LLM Providers│ │ • Sess │
│ • Analytics │ │ • Forecasts  │ │ • Models       │ │ • Rate │
│ • TimeSeries│ │ • Chargeback │ │ • API Keys     │ │ • Queue│
└──────┬──────┘ └──────┬───────┘ └────────┬────────┘ └────────┘
       │               │                  │
       └───────────────┼──────────────────┘
                       │
┌──────────────────────▼─────────────────────────────────────┐
│          PostgreSQL 16 + TimescaleDB Extension             │
│                                                             │
│  Multi-Tenant Tables:                                      │
│  • organizations (workspaces)                              │
│  • organization_members (RBAC)                             │
│  • teams (sub-organizations)                               │
│  • team_members                                            │
│                                                             │
│  LLM Management:                                           │
│  • llm_providers (OpenAI, Anthropic, etc.)                │
│  • llm_models (pricing, limits)                            │
│  • llm_requests (TimescaleDB hypertable) ⚡               │
│                                                             │
│  Cost & Governance:                                        │
│  • budgets (alerts, hard limits)                           │
│  • quotas (rate limiting)                                  │
│  • cost_tags (chargeback)                                  │
│  • daily_cost_summary (materialized view)                  │
│                                                             │
│  Total: 14 tables • 1 hypertable • 1 materialized view    │
└────────────────────────────────────────────────────────────┘
```

### Data Flow: LLM Request

```
1. User Request → API Gateway
2. Auth Verification (JWT)
3. Organization/Team Verification
4. Budget Check (hard limit enforcement)
5. Quota Check (rate limiting)
6. Integration Service → LLM Provider API
7. Response + Cost Calculation
8. Write to llm_requests (TimescaleDB)
9. Update budget current_spend
10. Update quota current_value
11. Check alert thresholds
12. Return response to user
```

---

## 🛠️ Technology Stack

| Category | Technologies |
|----------|-------------|
| **Backend** | Rust, Actix-web, Tokio, sqlx, Redis |
| **Frontend** | SvelteKit, Svelte 5, TypeScript, Tailwind CSS |
| **SDK/CLI** | TypeScript, Commander.js, Inquirer.js, Chalk |
| **Database** | PostgreSQL, TimescaleDB, Redis |
| **Auth** | JWT, OAuth2, TOTP (MFA) |
| **Deployment** | Docker, Kubernetes, Helm, Terraform |
| **Monitoring** | Prometheus, Grafana, OpenTelemetry |
| **CI/CD** | GitHub Actions |
| **Packages** | npm (SDK, CLI), crates.io (coming soon) |

---

## 📊 Implementation Statistics

### Production Code
- **1,433+** lines of new multi-tenant & cost tracking code
- **8** Rust microservices (Actix-web)
- **1** SvelteKit frontend
- **3** npm packages (SDK, Types, CLI)
- **60+** REST API endpoints
- **14** database tables for multi-tenancy
- **1** TimescaleDB hypertable for time-series data
- **1** materialized view for cost analytics

### Published Packages
- **@llm-dev-ops/llm-governance-types** v1.0.0 - TypeScript type definitions
- **@llm-dev-ops/llm-governance-sdk** v1.0.1 - JavaScript/TypeScript SDK
- **@llm-dev-ops/llm-governance-cli** v1.0.0 - Command-line interface

### Features Implemented

#### ✅ Multi-Tenancy (100% Complete)
- **Organizations**: Full CRUD with workspace isolation
- **Organization Members**: Role-based access (owner/admin/member/viewer)
- **Teams**: Sub-organizations for team-level governance
- **Team Members**: Team membership management
- **Permissions**: Hierarchical access control across all resources

#### ✅ Cost Analytics (100% Complete)
- **Real-Time Tracking**: Token-level granularity for every LLM request
- **TimescaleDB Integration**: Efficient time-series queries
- **Budget Management**: Org/team/user level budgets
- **Budget Alerts**: Configurable thresholds (e.g., 80%)
- **Hard Limits**: Automatic blocking when budget exceeded
- **Cost Forecasting**: Predict spend based on historical usage
- **Chargeback Reports**: Cost allocation with custom tags
- **Materialized Views**: Fast aggregations for dashboards

#### ✅ LLM Provider Integration (100% Complete)
- **Multi-Provider Support**: OpenAI, Anthropic, Azure OpenAI, Cohere, Hugging Face, Custom
- **Per-Organization Config**: Each org manages its own providers
- **Secure Key Storage**: Encrypted API keys in database
- **Model Management**: Configure pricing per model
- **Cost Calculation**: Automatic per-request cost tracking
- **Provider Isolation**: Multi-tenant provider management

#### ✅ Backend Services (100% Complete)

**User Service** (`services/user-service/`)
- Organizations CRUD (`src/handlers/organizations.rs` - 497 lines)
- Member management with RBAC
- Team creation and management
- Permission verification

**Integration Service** (`services/integration-service/`)
- LLM Provider CRUD (`src/handlers/providers.rs` - 453 lines)
- Model configuration
- API key encryption
- Multi-provider support

**Cost Service** (`services/cost-service/`)
- Budget CRUD (`src/handlers/costs.rs` - updated)
- Cost tracking with new schema
- Forecasting algorithms
- Chargeback report generation
- Organization/team/user level queries

#### ✅ Frontend (100% Complete)
- **Organization API Client** (`frontend/src/lib/api/organizations.ts` - 182 lines)
  - Organizations, teams, members
  - LLM providers and models
  - Complete TypeScript types
- **Removed Stripe Billing**: Replaced with internal cost tracking

#### ✅ SDK & CLI (100% Complete)
- **TypeScript SDK** (`packages/sdk/`)
  - Browser-agnostic API client
  - Full authentication support (login, MFA, OAuth)
  - Organizations, teams, members management
  - LLM providers & models API
  - Published to npm as @llm-dev-ops/llm-governance-sdk
- **TypeScript Types** (`packages/types/`)
  - Complete type definitions for all API entities
  - Published to npm as @llm-dev-ops/llm-governance-types
- **Command-Line Interface** (`packages/cli/`)
  - Interactive CLI with colored output and tables
  - All CRUD operations for orgs, teams, providers, models
  - JSON output mode for scripting
  - Secure credential storage
  - Published to npm as @llm-dev-ops/llm-governance-cli

#### ✅ Database (100% Complete)
- **Migration** (`database/migrations/0011_organizations_and_cost_tracking.sql` - 301 lines)
  - 14 tables for multi-tenancy & cost tracking
  - TimescaleDB hypertable setup
  - Materialized views
  - Indexes optimized for queries
- **Init Script** (`database/init/01-init.sql`)
  - Automatic migration runner
  - TimescaleDB extension setup

#### ✅ Deployment (100% Complete)
- **Docker Compose**: All services configured
- **Environment Config**: `.env.example` with multi-tenant notes
- **Database Init**: Automatic schema setup
- **Documentation**: README.md + QUICKSTART.md

### Scope Built Out So Far

> These areas have implementation in the tree. Built out is not the same as
> ready to ship — see the Status section below and
> [`docs/COMPLETION_ROADMAP.md`](docs/COMPLETION_ROADMAP.md) for gate state.

✅ Multi-tenant organization system
✅ Real-time cost tracking with TimescaleDB
✅ Budget enforcement (alerts + hard limits)
✅ LLM provider management (OpenAI, Anthropic, etc.)
✅ Model pricing configuration
✅ Organization/team/user level permissions
✅ RESTful APIs for all operations
✅ TypeScript SDK and CLI (published to npm)
✅ Docker Compose deployment
✅ Comprehensive documentation

### What's Next (Optional Enhancements)

📋 Kubernetes manifests & Helm charts
📋 Terraform infrastructure as code
📋 Prometheus/Grafana monitoring setup
📋 Frontend UI components for new features
📋 Webhook integrations
📋 Advanced analytics dashboards

---

## 🎯 Use Cases

### For Platform Teams
- **Self-Hosted LLM Gateway** - Centralize all LLM API calls through your own infrastructure
- **Cost Optimization** - Track spending across teams and prevent budget overruns
- **Multi-Organization SaaS** - Offer LLM services to multiple tenants with isolated workspaces
- **Compliance** - Maintain audit logs and enforce governance policies for regulated industries
- **Chargeback** - Allocate LLM costs back to departments or projects based on actual usage

### For Engineering Teams
- **Budget Control** - Set team-level budgets with automatic alerts and hard limits
- **Usage Analytics** - Understand which models and features consume the most tokens
- **Rate Limiting** - Prevent runaway costs with configurable quotas
- **Provider Flexibility** - Switch between OpenAI, Anthropic, and other providers seamlessly
- **Development Tracking** - Monitor LLM usage in development vs. production environments

### For Open Source Projects
- **Fork & Customize** - Apache 2.0 license allows full customization for your needs
- **API-First Design** - RESTful APIs for all operations, integrate with any tool
- **Extensible** - Add custom providers, policies, or analytics
- **Community Driven** - Contribute features, fixes, and integrations back to the project
- **Self-Hosted** - No external dependencies or vendor lock-in
- **Patent Protection** - Explicit patent grant protects you from patent litigation

---

## 🗺️ Roadmap

- ✅ **v1.0** (November 2025) - Initial release with core features
- 🔜 **v1.1** (December 2025) - Enhanced analytics, more integrations
- 📅 **v1.2** (March 2026) - Multi-tenancy, advanced optimization
- 📅 **v2.0** (June 2026) - AI-powered recommendations, mobile apps

See [ROADMAP.md](docs/ROADMAP.md) for details.

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

```bash
# Fork the repository
git clone https://github.com/LLM-Dev-Ops/governance-dashboard.git

# Create a feature branch
git checkout -b feature/amazing-feature

# Make your changes and commit
git commit -m "Add amazing feature"

# Push and create a Pull Request
git push origin feature/amazing-feature
```

---

## 📄 License

Apache License 2.0 - see [LICENSE](LICENSE) for details.

**Permissions:**
- ✅ Commercial use
- ✅ Modification
- ✅ Distribution
- ✅ Patent use
- ✅ Private use

**Conditions:**
- Include original copyright notice
- State significant changes
- Include Apache 2.0 license
- Provide attribution

**Limitations:**
- ❌ Trademark use (project name/logo require permission)
- ❌ Liability (no warranty provided)

**Why Apache 2.0?**
- Explicit patent grant protection
- Corporate-friendly for enterprise adoption
- Clear contribution terms
- Compatible with most other licenses

This is a truly open source project. Use it, modify it, sell it - with clear legal protection for both users and contributors.

---

## 💬 Support & Community

### Community Support (Free)
- [GitHub Issues](https://github.com/LLM-Dev-Ops/governance-dashboard/issues) - Bug reports and feature requests
- [GitHub Discussions](https://github.com/LLM-Dev-Ops/governance-dashboard/discussions) - Questions and community support
- [Discord](https://discord.gg/llm-governance) - Real-time chat with the community
- [Stack Overflow](https://stackoverflow.com/questions/tagged/llm-governance-dashboard) - Tagged questions

### Contributing
We welcome contributions! See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for:
- Code contributions (features, bug fixes)
- Documentation improvements
- Bug reports and feature requests
- Community support

### Commercial Support
If you need professional support for your deployment:
- Deployment assistance
- Custom feature development
- Training and onboarding
- SLA-backed support contracts

Contact: support@llmgovernance.com

---

## 🏆 Status

**Pre-1.0, in development — not production-ready.** ⚠️

Audited 2026-07-27 against the working tree (ADR-0001). Known blockers:

- ⚠️ **Build is broken** — `cargo check --workspace` exits 101; the `llm-infra-core`
  dependency does not exist in `LLM-Dev-Ops/infra` ([#7](https://github.com/LLM-Dev-Ops/governance-dashboard/issues/7))
- ⚠️ **Authentication is largely stubbed** — login/register/refresh/logout return
  `501` ([#1](https://github.com/LLM-Dev-Ops/governance-dashboard/issues/1)); `AuthMiddleware` performs no JWT validation and fails open
  ([#2](https://github.com/LLM-Dev-Ops/governance-dashboard/issues/2)); rate limiting is a no-op ([#3](https://github.com/LLM-Dev-Ops/governance-dashboard/issues/3)); MFA ([#4](https://github.com/LLM-Dev-Ops/governance-dashboard/issues/4)) and
  OAuth2 ([#5](https://github.com/LLM-Dev-Ops/governance-dashboard/issues/5)) are `todo!()` panics
- ⚠️ **Test coverage is unverified** — all 29 `auth-service` tests are empty bodies
  that pass vacuously ([#6](https://github.com/LLM-Dev-Ops/governance-dashboard/issues/6))
- ✅ Multiple deployment options (Docker Compose, `k8s/`, `helm/`, `terraform/`)
- ✅ CI/CD workflows defined in `.github/workflows/`

Every phase gate in [`docs/COMPLETION_ROADMAP.md`](docs/COMPLETION_ROADMAP.md) — MVP, Beta, and Production — is
currently unchecked. Readiness language returns to this README when the Production
Gate is genuinely passed, not before.

**Do not deploy this against untrusted users or real tenant data.**

---

## 📸 Screenshots

### Dashboard
![Dashboard](docs/images/dashboard-placeholder.png)
*Real-time metrics, cost trends, and policy violations*

### Policy Management
![Policies](docs/images/policies-placeholder.png)
*Create and manage governance policies with real-time enforcement*

### Cost Analytics
![Costs](docs/images/costs-placeholder.png)
*Track LLM costs, budgets, and forecasts*

---

## 🙏 Acknowledgments

Built with ❤️ using:
- [Rust](https://www.rust-lang.org/) - Systems programming language
- [Actix-web](https://actix.rs/) - Powerful web framework
- [SvelteKit](https://kit.svelte.dev/) - Modern web framework
- [PostgreSQL](https://www.postgresql.org/) - Reliable database
- [TimescaleDB](https://www.timescale.com/) - Time-series data
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS

---

## 📞 Get Started

```bash
cp .env.example .env
# Edit .env with your configuration
docker-compose up -d && open http://localhost:3000
```

**Default Login:** admin@example.com / Admin123! (change immediately!)

**Welcome to Open Source LLM Governance!** 🚀

---

## 🌟 Why Open Source?

We believe LLM governance and cost management should be accessible to everyone:

- **Data Privacy** - Your LLM usage data stays on your infrastructure
- **No Vendor Lock-In** - Use any LLM provider, switch anytime
- **Full Control** - Customize everything to fit your needs
- **Cost Savings** - No SaaS fees, only your infrastructure costs
- **Community Innovation** - Benefit from community contributions

---

**Made with ❤️ by the Open Source Community**

[GitHub](https://github.com/LLM-Dev-Ops/governance-dashboard) • [Documentation](docs/) • [Discussions](https://github.com/LLM-Dev-Ops/governance-dashboard/discussions) • [Issues](https://github.com/LLM-Dev-Ops/governance-dashboard/issues)
