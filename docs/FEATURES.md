# LLM Governance Dashboard - Feature Catalog

**Version:** 1.0
**Last Updated:** November 16, 2025

---

## Table of Contents

1. [Authentication & Security](#authentication--security)
2. [Dashboard & Analytics](#dashboard--analytics)
3. [Policy Management](#policy-management)
4. [Cost Tracking](#cost-tracking)
5. [Audit & Compliance](#audit--compliance)
6. [User Management](#user-management)
7. [Integrations](#integrations)

---

## Authentication & Security

### Multi-Factor Authentication (MFA)

**Description:**
Add an extra layer of security to user accounts with time-based one-time passwords (TOTP) and hardware security keys.

**Benefits:**
- Prevents unauthorized access even if passwords are compromised
- Meets compliance requirements for security controls
- Supports multiple authentication methods
- Optional backup codes for account recovery

**Use Cases:**
- Protecting administrative accounts
- Meeting SOC 2 and ISO 27001 requirements
- Securing access to sensitive data
- Preventing credential-based attacks

**Screenshot Placeholder:**
```
[MFA Setup Screen]
- QR code for authenticator app setup
- Backup codes display
- Hardware key registration option
- Recovery options configuration
```

**Configuration:**

```yaml
# Admin settings
mfa:
  enabled: true
  required_for_roles:
    - super_admin
    - org_admin
  methods:
    - totp          # Authenticator apps
    - webauthn      # Hardware keys (YubiKey, etc.)
    - sms           # SMS codes (optional)
  grace_period_days: 7
  backup_codes: 10
```

---

### Single Sign-On (SSO)

**Description:**
Integrate with your existing identity provider using SAML 2.0, OAuth 2.0, or OpenID Connect.

**Benefits:**
- Centralized user management
- Streamlined login experience
- Automatic user provisioning
- Simplified offboarding

**Use Cases:**
- Enterprise deployments
- Integration with Active Directory
- Google Workspace integration
- Okta, Auth0, or Azure AD integration

**Screenshot Placeholder:**
```
[SSO Configuration Screen]
- Provider selection (SAML, OAuth, OIDC)
- Metadata upload
- Attribute mapping
- Test connection button
```

**Configuration:**

```yaml
# SAML 2.0 Configuration
sso:
  enabled: true
  provider: saml
  saml:
    entity_id: "llm-gov.yourdomain.com"
    sso_url: "https://idp.example.com/sso"
    x509_cert: |
      -----BEGIN CERTIFICATE-----
      MIIDXTCCAkWgAwIBAgIJAKL...
      -----END CERTIFICATE-----
    attribute_mapping:
      email: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
      name: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
      groups: "http://schemas.xmlsoap.org/claims/Group"

# OAuth 2.0 Configuration
sso:
  enabled: true
  provider: oauth
  oauth:
    provider_name: "Google"
    client_id: "your-client-id"
    client_secret: "your-client-secret"
    authorization_url: "https://accounts.google.com/o/oauth2/v2/auth"
    token_url: "https://oauth2.googleapis.com/token"
    user_info_url: "https://www.googleapis.com/oauth2/v1/userinfo"
    scopes:
      - openid
      - email
      - profile
```

---

### Role-Based Access Control (RBAC)

**Description:**
Granular permission system allowing precise control over user capabilities based on assigned roles.

**Benefits:**
- Principle of least privilege
- Simplified permission management
- Audit-friendly access control
- Flexible role hierarchy

**Use Cases:**
- Separating admin and user privileges
- Creating department-specific roles
- Compliance with access control requirements
- Delegating specific responsibilities

**Screenshot Placeholder:**
```
[Role Management Screen]
- List of predefined roles
- Custom role creation
- Permission matrix
- User assignment interface
```

**Available Roles:**

| Role | Permissions | Use Case |
|------|-------------|----------|
| **Super Admin** | Full system access | System administrators |
| **Org Admin** | Organization-wide management | IT managers |
| **Team Admin** | Team management | Department heads |
| **Power User** | Advanced features | Technical leads |
| **Standard User** | Basic LLM access | General users |
| **Auditor** | Read-only audit access | Compliance officers |
| **Finance** | Cost and billing access | Finance team |

**Configuration:**

```yaml
# Custom role creation
roles:
  - name: "data_scientist"
    description: "Data Science Team Member"
    permissions:
      - llm.use.gpt4
      - llm.use.claude
      - analytics.view
      - reports.generate
      - costs.view.own
      - policies.view
    inherit_from: "power_user"
```

---

### API Key Management

**Description:**
Generate and manage API keys for programmatic access with fine-grained scopes and expiration.

**Benefits:**
- Secure programmatic access
- Per-key rate limiting
- Automatic expiration
- Detailed usage tracking

**Use Cases:**
- Integrating LLM calls into applications
- Automated workflows
- Third-party integrations
- Service accounts

**Screenshot Placeholder:**
```
[API Key Management Screen]
- Active API keys list
- Create new key button
- Key scopes selection
- Expiration settings
- Usage statistics per key
```

**Configuration:**

```bash
# Create API key via CLI
curl -X POST http://localhost:8080/api/v1/api-keys \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production App Key",
    "scopes": [
      "llm.use",
      "analytics.read"
    ],
    "expires_in_days": 90,
    "rate_limit": {
      "requests_per_minute": 100
    }
  }'
```

---

## Dashboard & Analytics

### Real-Time Usage Dashboard

**Description:**
Comprehensive overview of LLM usage with real-time metrics and visualizations.

**Benefits:**
- Immediate visibility into system usage
- Identify trends and anomalies
- Quick access to key metrics
- Customizable widgets

**Use Cases:**
- Daily operations monitoring
- Executive reporting
- Capacity planning
- Trend analysis

**Screenshot Placeholder:**
```
[Main Dashboard]
- Request volume chart (last 24 hours)
- Cost meter with budget progress
- Active users widget
- Recent activity feed
- Policy compliance gauge
- Top models by usage
```

**Key Metrics:**
- Total requests (hourly, daily, monthly)
- Active users
- Cost trends
- Average response time
- Error rates
- Policy violations
- Top users and teams
- Model distribution

**Configuration:**

```yaml
# Dashboard customization
dashboard:
  refresh_interval_seconds: 30
  default_time_range: "24h"
  widgets:
    - type: "usage_chart"
      position: { row: 1, col: 1 }
      size: { width: 2, height: 1 }
    - type: "cost_meter"
      position: { row: 1, col: 3 }
      size: { width: 1, height: 1 }
    - type: "recent_activity"
      position: { row: 2, col: 1 }
      size: { width: 3, height: 2 }
```

---

### Cost Analytics

**Description:**
Detailed cost breakdown and analysis across multiple dimensions with forecasting capabilities.

**Benefits:**
- Complete cost visibility
- Identify cost optimization opportunities
- Budget tracking
- Accurate forecasting

**Use Cases:**
- Monthly cost reporting
- Budget management
- Chargeback to departments
- Cost optimization initiatives

**Screenshot Placeholder:**
```
[Cost Analytics Dashboard]
- Cost trend line chart
- Provider breakdown pie chart
- Team spending comparison
- Model cost efficiency table
- Forecast projection
- Budget vs. actual meter
```

**Analysis Dimensions:**
- Time period (hourly, daily, weekly, monthly)
- Provider (OpenAI, Anthropic, Google, etc.)
- Model (GPT-4, Claude, etc.)
- Team/Department
- User
- Project/Tag
- Request type

**Configuration:**

```yaml
# Cost tracking settings
cost_analytics:
  currency: "USD"
  tracking_granularity: "request"  # request, hourly, daily
  dimensions:
    - provider
    - model
    - team
    - user
    - tags
  forecasting:
    enabled: true
    method: "linear_regression"  # or "moving_average"
    horizon_days: 30
  alerts:
    enabled: true
    thresholds:
      - percentage: 75
        action: "notify_users"
      - percentage: 90
        action: "notify_admins"
      - percentage: 100
        action: "enforce_limit"
```

---

### Usage Analytics

**Description:**
Comprehensive analysis of LLM usage patterns, including request volumes, response times, and success rates.

**Benefits:**
- Understand usage patterns
- Optimize resource allocation
- Identify power users
- Measure adoption

**Use Cases:**
- Capacity planning
- Performance monitoring
- User behavior analysis
- ROI calculation

**Screenshot Placeholder:**
```
[Usage Analytics]
- Request volume over time
- Success rate trends
- Average response time
- Token usage statistics
- Model popularity
- Peak usage hours heatmap
```

**Available Reports:**
- Request volume by time
- Success/failure rates
- Average tokens per request
- Response time percentiles
- Model utilization
- User activity patterns
- Geographic distribution

---

### Custom Reports

**Description:**
Build custom reports with drag-and-drop interface and export to multiple formats.

**Benefits:**
- Tailored to your specific needs
- Multiple export formats
- Scheduled delivery
- Shareable links

**Use Cases:**
- Executive summaries
- Department reports
- Compliance documentation
- Board presentations

**Screenshot Placeholder:**
```
[Report Builder]
- Metric selection panel
- Visualization type chooser
- Filter configuration
- Preview pane
- Schedule settings
- Export format options
```

**Supported Formats:**
- PDF (formatted reports)
- CSV (data export)
- Excel (with charts)
- JSON (API integration)
- HTML (web embedding)

**Configuration:**

```yaml
# Custom report example
reports:
  - name: "Monthly Executive Summary"
    schedule: "0 0 1 * *"  # First day of month
    sections:
      - type: "summary"
        metrics:
          - total_requests
          - total_cost
          - active_users
          - cost_per_request
      - type: "chart"
        chart_type: "line"
        metric: "daily_cost"
        period: "last_month"
      - type: "table"
        data: "top_users_by_cost"
        limit: 10
    recipients:
      - exec@yourdomain.com
    format: "pdf"
```

---

## Policy Management

### Policy Engine

**Description:**
Flexible, rule-based policy engine for enforcing governance rules across all LLM usage.

**Benefits:**
- Centralized governance
- Automated enforcement
- Real-time policy evaluation
- Comprehensive policy types

**Use Cases:**
- Enforce compliance requirements
- Control costs
- Prevent misuse
- Ensure data privacy

**Screenshot Placeholder:**
```
[Policy Management]
- Policy list with status
- Policy creation wizard
- Rule configuration interface
- Priority settings
- Test policy feature
- Deployment controls
```

**Policy Types:**

1. **Access Policies**
   - Control who can use which models
   - Restrict by user, team, or role
   - Time-based access

2. **Cost Policies**
   - Budget limits
   - Cost thresholds
   - Approval workflows for expensive requests

3. **Rate Limiting Policies**
   - Requests per time period
   - Token limits
   - Concurrent request limits

4. **Content Policies**
   - PII detection and blocking
   - Prohibited content filtering
   - Sensitive data protection

5. **Compliance Policies**
   - Mandatory audit logging
   - Approval requirements
   - Data residency rules

**Configuration:**

```yaml
# Example policy configuration
policies:
  - name: "High-Cost Request Approval"
    type: "cost"
    priority: 100
    conditions:
      estimated_cost_usd:
        greater_than: 10
    actions:
      - type: "require_approval"
        approvers:
          - role: "org_admin"
        timeout_hours: 24
      - type: "notify"
        recipients:
          - user
          - team_admin
    exceptions:
      - role: "super_admin"
```

---

### Policy Templates

**Description:**
Pre-built policy templates for common governance scenarios.

**Benefits:**
- Quick deployment
- Best practices built-in
- Customizable
- Industry-specific templates

**Use Cases:**
- Quick start
- Compliance frameworks
- Industry standards
- Common scenarios

**Available Templates:**

| Template | Description | Use Case |
|----------|-------------|----------|
| **GDPR Compliance** | EU data protection | European operations |
| **HIPAA Compliance** | Healthcare data protection | Healthcare industry |
| **Financial Services** | Financial industry controls | Banking, fintech |
| **Cost Control** | Budget management | Cost optimization |
| **Development/Production** | Environment separation | Software development |
| **Research** | Academic usage controls | Universities, research |

---

### Policy Testing

**Description:**
Test policies before deployment with simulation and dry-run modes.

**Benefits:**
- Prevent unintended consequences
- Validate policy logic
- Safe experimentation
- Impact analysis

**Use Cases:**
- Policy development
- Policy updates
- Impact assessment
- Training

**Screenshot Placeholder:**
```
[Policy Testing]
- Test scenario builder
- Sample request input
- Expected vs. actual results
- Impact analysis
- Simulation mode toggle
```

**Configuration:**

```yaml
# Policy testing
policy_testing:
  enabled: true
  simulation_mode:
    enabled: true
    log_actions: true
    notify_users: false
  test_scenarios:
    - name: "High cost request"
      request:
        model: "gpt-4"
        tokens: 8000
      expected_action: "require_approval"
```

---

## Cost Tracking

### Real-Time Cost Monitoring

**Description:**
Track costs in real-time with per-request granularity and instant budget alerts.

**Benefits:**
- Immediate cost visibility
- Prevent overspending
- Accurate chargeback
- Detailed attribution

**Use Cases:**
- Budget management
- Cost allocation
- Chargeback
- Fraud prevention

**Screenshot Placeholder:**
```
[Cost Monitoring]
- Live cost meter
- Budget progress bar
- Cost by provider chart
- Recent expensive requests
- Budget alert panel
```

**Tracked Metrics:**
- Per-request cost
- Cumulative costs (hourly, daily, monthly)
- Provider costs
- Model costs
- Team/user costs
- Token costs

---

### Budget Management

**Description:**
Set and enforce budgets at organization, team, and user levels with automatic enforcement.

**Benefits:**
- Prevent cost overruns
- Predictable spending
- Fair resource allocation
- Automated enforcement

**Use Cases:**
- Monthly budget caps
- Team allocations
- Project budgets
- User quotas

**Screenshot Placeholder:**
```
[Budget Management]
- Budget hierarchy tree
- Budget creation form
- Alert configuration
- Usage vs. budget charts
- Enforcement rules
```

**Configuration:**

```yaml
# Budget configuration
budgets:
  - name: "Organization Monthly"
    scope: "organization"
    amount: 50000
    currency: "USD"
    period: "monthly"
    alerts:
      - threshold: 50
        action: "notify_finance"
      - threshold: 75
        action: "notify_admins"
      - threshold: 90
        action: "require_approval"
      - threshold: 100
        action: "block_requests"

  - name: "Engineering Team"
    scope: "team"
    team_id: "eng-team-uuid"
    amount: 10000
    currency: "USD"
    period: "monthly"
    inherit_from: "Organization Monthly"
```

---

### Cost Optimization Recommendations

**Description:**
AI-powered recommendations for reducing costs while maintaining performance.

**Benefits:**
- Identify optimization opportunities
- Quantified savings potential
- Actionable recommendations
- Continuous optimization

**Use Cases:**
- Monthly cost reviews
- Budget optimization
- Model selection
- Token optimization

**Screenshot Placeholder:**
```
[Optimization Recommendations]
- Recommendation cards with savings potential
- Model alternative suggestions
- Token usage optimization tips
- Caching opportunities
- Implementation guidance
```

**Recommendation Types:**
- Model alternatives (e.g., GPT-3.5 instead of GPT-4 for simple tasks)
- Prompt optimization
- Response caching
- Batch processing
- Off-peak usage
- Token limit adjustments

---

## Audit & Compliance

### Tamper-Proof Audit Logs

**Description:**
Cryptographically secured audit logs with chain-of-custody for all system activities.

**Benefits:**
- Compliance with audit requirements
- Forensic investigation capability
- Non-repudiation
- Complete activity trail

**Use Cases:**
- Compliance audits
- Security investigations
- Dispute resolution
- Regulatory reporting

**Screenshot Placeholder:**
```
[Audit Logs]
- Chronological log entries
- Advanced filtering options
- Log entry details panel
- Export functionality
- Integrity verification status
```

**Logged Events:**
- Authentication (login, logout, MFA)
- Authorization (access grants, denials)
- LLM requests (full details)
- Policy changes
- Configuration updates
- User management
- Cost events
- System events

**Configuration:**

```yaml
# Audit logging configuration
audit:
  enabled: true
  tamper_proof: true
  hash_algorithm: "SHA256"
  log_retention_days: 2555  # 7 years
  log_levels:
    authentication: "all"
    authorization: "all"
    llm_requests: "all"
    policy_changes: "all"
    configuration: "all"
    user_management: "all"
  export:
    formats: ["json", "csv", "pdf"]
    encryption: true
  integrity_checks:
    enabled: true
    interval_hours: 24
```

---

### Compliance Frameworks

**Description:**
Built-in support for major compliance frameworks with pre-configured controls and reports.

**Benefits:**
- Simplified compliance
- Pre-mapped controls
- Automated evidence collection
- Ready for audit

**Use Cases:**
- SOC 2 certification
- GDPR compliance
- HIPAA compliance
- ISO 27001 certification

**Supported Frameworks:**

| Framework | Description | Key Features |
|-----------|-------------|--------------|
| **SOC 2 Type II** | Service organization controls | Access controls, audit logs, encryption |
| **GDPR** | EU data protection | Data minimization, right to erasure, consent |
| **HIPAA** | Healthcare data protection | PHI protection, audit trails, encryption |
| **ISO 27001** | Information security | Security controls, risk management |
| **PCI DSS** | Payment card data | Data protection, access control |

**Screenshot Placeholder:**
```
[Compliance Dashboard]
- Framework selection
- Control coverage matrix
- Compliance score gauge
- Evidence collection status
- Gap analysis
- Remediation tasks
```

---

### Compliance Reports

**Description:**
Generate compliance reports for auditors with evidence packages and attestations.

**Benefits:**
- Audit-ready documentation
- Time savings during audits
- Consistent reporting
- Evidence tracking

**Use Cases:**
- Annual audits
- Regulatory submissions
- Customer attestations
- Risk assessments

**Report Types:**
- Access control reports
- Audit trail summaries
- Data processing reports
- Security incident reports
- Policy compliance reports
- User activity reports

---

## User Management

### User Lifecycle Management

**Description:**
Complete user lifecycle from onboarding to offboarding with automated workflows.

**Benefits:**
- Streamlined processes
- Consistent onboarding
- Secure offboarding
- Audit trail

**Use Cases:**
- New employee onboarding
- Role changes
- Employee departures
- Contractor management

**Screenshot Placeholder:**
```
[User Management]
- User directory
- Bulk import/export
- User detail panel
- Activity timeline
- Access review
```

**Capabilities:**
- User creation (manual or bulk)
- Role assignment
- Team assignment
- Access provisioning
- Account suspension
- Access revocation
- Data export
- Account deletion

---

### Team Organization

**Description:**
Hierarchical team structure with inherited policies and aggregated analytics.

**Benefits:**
- Organizational alignment
- Simplified management
- Inherited permissions
- Consolidated reporting

**Use Cases:**
- Department organization
- Project teams
- Cost allocation
- Policy inheritance

**Screenshot Placeholder:**
```
[Team Hierarchy]
- Organization tree view
- Team creation form
- Member management
- Team policies
- Team analytics
```

**Configuration:**

```yaml
# Team structure example
teams:
  - name: "Engineering"
    parent: null
    teams:
      - name: "Backend"
        parent: "Engineering"
        budget: 5000
        policies:
          - "Engineering Base Policy"
      - name: "Frontend"
        parent: "Engineering"
        budget: 3000
      - name: "ML/AI"
        parent: "Engineering"
        budget: 7000
        allowed_models:
          - "gpt-4"
          - "claude-3"
```

---

### Activity Monitoring

**Description:**
Monitor user activities with detailed logs and behavioral analytics.

**Benefits:**
- Security monitoring
- Usage insights
- Anomaly detection
- Compliance verification

**Use Cases:**
- Security audits
- Unusual activity detection
- User behavior analysis
- Compliance monitoring

**Screenshot Placeholder:**
```
[Activity Monitoring]
- Activity timeline
- User session history
- Request patterns
- Anomaly alerts
- Geographic access map
```

**Monitored Activities:**
- Login/logout events
- API usage
- Policy violations
- Configuration changes
- Data access
- Failed authentication attempts

---

## Integrations

### LLM Provider Integrations

**Description:**
Native integrations with major LLM providers with unified API interface.

**Benefits:**
- Multi-provider support
- Consistent interface
- Easy switching
- Vendor independence

**Use Cases:**
- Multi-model strategies
- Vendor diversification
- Cost optimization
- Capability mixing

**Supported Providers:**

| Provider | Models | Features |
|----------|--------|----------|
| **OpenAI** | GPT-4, GPT-3.5, GPT-4-turbo | Chat, completions, embeddings |
| **Anthropic** | Claude 3 (Opus, Sonnet, Haiku) | Chat, vision, long context |
| **Google** | PaLM 2, Gemini Pro | Chat, multimodal |
| **Azure OpenAI** | All OpenAI models | Enterprise deployment |
| **Cohere** | Command, Generate | Chat, generation |
| **Hugging Face** | Various open-source | Custom models |

**Screenshot Placeholder:**
```
[Provider Integrations]
- Provider grid with status
- Add provider wizard
- Connection testing
- Model availability
- Pricing display
```

**Configuration:**

```yaml
# Provider configuration
providers:
  - name: "openai"
    enabled: true
    api_key: "${OPENAI_API_KEY}"
    models:
      - "gpt-4"
      - "gpt-3.5-turbo"
    rate_limits:
      requests_per_minute: 3500

  - name: "anthropic"
    enabled: true
    api_key: "${ANTHROPIC_API_KEY}"
    models:
      - "claude-3-opus"
      - "claude-3-sonnet"
    rate_limits:
      requests_per_minute: 1000
```

---

### Slack Integration

**Description:**
Receive alerts and notifications in Slack channels with interactive commands.

**Benefits:**
- Real-time notifications
- Team collaboration
- Quick actions
- Mobile access

**Use Cases:**
- Cost alerts
- Policy violations
- Approval workflows
- Status updates

**Screenshot Placeholder:**
```
[Slack Integration]
- Webhook configuration
- Channel mapping
- Alert type selection
- Message formatting
- Command configuration
```

**Configuration:**

```yaml
# Slack integration
integrations:
  slack:
    enabled: true
    webhook_url: "https://hooks.slack.com/services/..."
    channels:
      cost_alerts: "#finance"
      policy_violations: "#security"
      approvals: "#governance"
    notifications:
      - event: "budget_threshold"
        channel: "#finance"
        threshold: 75
      - event: "policy_violation"
        channel: "#security"
        severity: "high"
```

---

### Webhook Integration

**Description:**
Send events to custom webhooks for integration with external systems.

**Benefits:**
- Custom integrations
- Event-driven automation
- Third-party tool integration
- Real-time data sync

**Use Cases:**
- SIEM integration
- Ticketing systems
- Custom dashboards
- Automation workflows

**Screenshot Placeholder:**
```
[Webhook Configuration]
- Webhook URL input
- Event selection
- Payload template editor
- Authentication settings
- Test webhook button
```

**Configuration:**

```yaml
# Webhook configuration
webhooks:
  - name: "Cost Alert Webhook"
    url: "https://api.yourdomain.com/webhooks/cost-alert"
    events:
      - "budget_threshold_reached"
      - "cost_anomaly_detected"
    headers:
      Authorization: "Bearer ${WEBHOOK_SECRET}"
      Content-Type: "application/json"
    payload_template: |
      {
        "event": "{{event_type}}",
        "timestamp": "{{timestamp}}",
        "data": {{event_data}}
      }
    retry:
      max_attempts: 3
      backoff: "exponential"
```

---

### API Access

**Description:**
RESTful API for programmatic access to all platform features.

**Benefits:**
- Automation capability
- Custom integrations
- Programmatic control
- Extensibility

**Use Cases:**
- Application integration
- Automated workflows
- Custom tools
- Data export

**Screenshot Placeholder:**
```
[API Documentation]
- Interactive API explorer
- Authentication guide
- Endpoint reference
- Code examples
- Rate limits display
```

**Available Endpoints:**
- `/api/v1/llm/*` - LLM requests
- `/api/v1/users/*` - User management
- `/api/v1/teams/*` - Team management
- `/api/v1/policies/*` - Policy management
- `/api/v1/analytics/*` - Analytics data
- `/api/v1/audit/*` - Audit logs
- `/api/v1/costs/*` - Cost data

---

## Additional Features

### Advanced Search

**Description:**
Powerful search across all entities with filters and saved searches.

**Benefits:**
- Quick discovery
- Advanced filtering
- Saved searches
- Export results

**Use Cases:**
- Finding specific logs
- Locating policies
- User searches
- Report data

---

### Notifications Center

**Description:**
Centralized notification management with customizable preferences.

**Benefits:**
- Stay informed
- Prioritized alerts
- Multiple channels
- Do not disturb mode

**Use Cases:**
- Critical alerts
- Daily summaries
- Policy updates
- System announcements

---

### Dark Mode

**Description:**
Eye-friendly dark theme for reduced eye strain.

**Benefits:**
- Reduced eye strain
- Better for low-light environments
- Battery saving (OLED screens)
- User preference

---

**Version:** 1.0
**Last Updated:** November 16, 2025

For more information, see:
- [USER_GUIDE.md](USER_GUIDE.md)
- [ADMIN_GUIDE.md](ADMIN_GUIDE.md)
- [TUTORIALS.md](TUTORIALS.md)
