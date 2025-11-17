# LLM Governance Dashboard - Tutorials

**Version:** 1.0
**Last Updated:** November 16, 2025

---

## Table of Contents

1. [Tutorial 1: Setting Up Your First Policy](#tutorial-1-setting-up-your-first-policy)
2. [Tutorial 2: Configuring Cost Budgets](#tutorial-2-configuring-cost-budgets)
3. [Tutorial 3: Creating Compliance Reports](#tutorial-3-creating-compliance-reports)
4. [Tutorial 4: Setting Up Team Hierarchies](#tutorial-4-setting-up-team-hierarchies)
5. [Tutorial 5: Integrating with LLM Providers](#tutorial-5-integrating-with-llm-providers)
6. [Tutorial 6: Configuring Alerts](#tutorial-6-configuring-alerts)
7. [Tutorial 7: Generating Audit Reports](#tutorial-7-generating-audit-reports)

---

## Tutorial 1: Setting Up Your First Policy

**Difficulty:** Beginner
**Time:** 15 minutes
**Goal:** Create a comprehensive policy to control LLM usage in your organization

### What You'll Learn

- Understanding policy types
- Creating access policies
- Configuring policy rules
- Testing policies before deployment
- Monitoring policy effectiveness

### Prerequisites

- Admin or Org Admin role
- At least one LLM provider configured
- Basic understanding of your organization's governance needs

### Step 1: Navigate to Policy Creation

1. Log in to the LLM Governance Dashboard
2. Click **Policies** in the left sidebar
3. Click the **Create Policy** button in the top-right corner

### Step 2: Choose Policy Type

For this tutorial, we'll create a **Rate Limiting Policy** to prevent API abuse.

1. On the policy creation page, select **Rate Limit** as the policy type
2. Click **Next**

### Step 3: Configure Basic Settings

Fill in the basic information:

```yaml
Name: "Standard User Rate Limit"
Description: "Prevents excessive API usage by standard users"
Priority: 100
Status: Draft (we'll activate after testing)
```

**Why priority matters:** Higher priority policies override lower priority ones. Use priority to manage conflicting policies.

### Step 4: Define Policy Scope

Choose who this policy applies to:

1. Select **Scope**: "Role-based"
2. Select **Roles**: Check "Standard User"
3. **Exclude**: Leave empty (or add exceptions for specific users)

### Step 5: Configure Policy Rules

Set the rate limits:

```yaml
Requests per minute: 60
Requests per hour: 1000
Requests per day: 10000
Token limit per request: 4000
```

### Step 6: Define Actions

Configure what happens when limits are exceeded:

**Primary Action:**
- **When limit exceeded**: Throttle (delay request)
- **Throttle delay**: 30 seconds

**Secondary Actions:**
- ✓ Notify user via email
- ✓ Log violation to audit log
- ✗ Block request entirely (we're being lenient)

### Step 7: Set Exception Conditions

Add exceptions for special cases:

```yaml
Exceptions:
  - Condition: "Time is between 2 AM and 4 AM UTC"
    Action: "Allow (for batch processing)"

  - Condition: "User has tag: priority_project"
    Multiplier: 2 (double the limits)
```

### Step 8: Test the Policy

Before activating, test the policy:

1. Click **Test Policy** button
2. Enter test parameters:
   ```yaml
   Test User: john.doe@company.com
   Requests in last minute: 65
   Expected Result: Throttle
   ```
3. Click **Run Test**
4. Verify the result matches expectations

Try multiple scenarios:
- Normal usage (40 requests/min) → Should allow
- Slightly over limit (65 requests/min) → Should throttle
- Exception case (user with priority_project tag) → Should allow up to 120/min

### Step 9: Review and Activate

1. Review all settings
2. Click **Save as Draft** to save without activating
3. Get team feedback on the policy
4. Once approved, click **Activate Policy**

### Step 10: Monitor Policy Effectiveness

After activation, monitor the policy:

1. Navigate to **Policies** > **Policy Name** > **Analytics**
2. Review metrics:
   - Times policy was triggered
   - Users affected
   - Violation trends
   - Effectiveness score

### Best Practices

1. **Start Restrictive**: Begin with stricter limits and relax as needed
2. **Test Thoroughly**: Use test mode extensively before activation
3. **Communicate**: Inform users before activating new policies
4. **Monitor**: Regularly review policy effectiveness
5. **Iterate**: Adjust based on real-world usage patterns

### Troubleshooting

**Policy not taking effect?**
- Check policy status is "Active"
- Verify priority doesn't conflict with higher-priority policies
- Allow 5 minutes for policy propagation

**Too many violations?**
- Review if limits are too strict
- Check for legitimate use cases
- Add exceptions for valid scenarios

---

## Tutorial 2: Configuring Cost Budgets

**Difficulty:** Beginner
**Time:** 20 minutes
**Goal:** Set up comprehensive cost budgets with alerts to control spending

### What You'll Learn

- Creating organizational budgets
- Setting team-specific budgets
- Configuring budget alerts
- Enforcing budget limits
- Analyzing budget utilization

### Prerequisites

- Admin or Finance role
- Cost tracking enabled
- At least one month of usage data (helpful but not required)

### Step 1: Analyze Current Spending

Before setting budgets, understand current costs:

1. Navigate to **Analytics** > **Costs**
2. Review spending for the last 30 days
3. Note the breakdown by:
   - Total monthly cost
   - Cost per team
   - Cost per user
   - Cost by provider
   - Cost by model

**Example insights:**
```
Total last month: $12,450
Engineering team: $8,200 (66%)
Marketing team: $3,100 (25%)
Operations team: $1,150 (9%)

GPT-4 costs: $7,800 (63%)
Claude costs: $4,650 (37%)
```

### Step 2: Create Organization-Wide Budget

1. Navigate to **Analytics** > **Budgets** > **Create Budget**
2. Fill in the form:

```yaml
Budget Name: "Monthly Organization Budget FY2025"
Scope: Organization-wide
Amount: $15,000
Currency: USD
Period: Monthly
Starts: December 1, 2025
```

### Step 3: Configure Budget Alerts

Set up progressive alerts:

```yaml
Alert Thresholds:
  - At 50% ($7,500):
    - Action: Send email to finance team
    - Recipients: finance@company.com
    - Message: "Informational: Budget 50% utilized"

  - At 75% ($11,250):
    - Action: Send email to admins and finance
    - Recipients: admins@company.com, finance@company.com
    - Message: "Warning: Budget 75% utilized"

  - At 90% ($13,500):
    - Action: Send email and Slack alert
    - Recipients: All admins
    - Channels: #governance-alerts
    - Message: "Critical: Budget 90% utilized"

  - At 100% ($15,000):
    - Action: Enforce limit
    - Behavior: Require approval for new requests
    - Approvers: CFO, CTO
```

### Step 4: Set Team Budgets

Create budgets for each team:

**Engineering Team:**
```yaml
Budget Name: "Engineering Monthly Budget"
Scope: Team
Team: Engineering
Amount: $10,000
Period: Monthly
Inherits from: "Monthly Organization Budget"

Sub-allocation:
  - Backend team: $4,000
  - Frontend team: $2,500
  - ML/AI team: $3,500
```

**Marketing Team:**
```yaml
Budget Name: "Marketing Monthly Budget"
Scope: Team
Team: Marketing
Amount: $3,500
Period: Monthly
```

### Step 5: Configure Budget Enforcement

Define what happens when budgets are exceeded:

```yaml
Enforcement Rules:
  - At organization budget limit:
    Action: Require approval
    Approvers: [CFO, CTO]
    Auto-approve if: Cost < $50 per request

  - At team budget limit:
    Action: Notify team admin
    Allow overage: 10%
    Hard stop at: 110% of budget

  - Grace period:
    Duration: First 3 days of month
    Reason: Reconciliation period
```

### Step 6: Set Up Budget Forecasting

Enable predictive alerts:

1. Navigate to **Budgets** > **Forecasting Settings**
2. Enable forecasting:

```yaml
Forecasting:
  Enabled: true
  Method: Linear regression with seasonal adjustment
  Alert when: Projected to exceed budget by 5%
  Lookback period: 90 days
  Forecast horizon: 30 days
```

### Step 7: Create Budget Dashboard

Customize your budget monitoring dashboard:

1. Navigate to **Home** > **Customize Dashboard**
2. Add budget widgets:
   - Budget utilization gauge
   - Spending trend line
   - Budget alerts panel
   - Top spenders table
   - Forecast projection

### Step 8: Set Up Automated Reports

Schedule budget reports:

```yaml
Report Schedule:
  Name: "Weekly Budget Summary"
  Frequency: Every Monday at 9 AM
  Recipients:
    - finance@company.com
    - management@company.com
  Content:
    - Current budget utilization
    - Week-over-week changes
    - Top 10 cost drivers
    - Projected end-of-month costs
  Format: PDF with Excel attachment
```

### Step 9: Monitor and Adjust

After deployment:

1. **Daily**: Check budget utilization dashboard
2. **Weekly**: Review budget alerts and trends
3. **Monthly**: Analyze actuals vs. budget
4. **Quarterly**: Adjust budgets based on needs

### Best Practices

1. **Baseline First**: Use historical data to set realistic budgets
2. **Leave Buffer**: Set budgets 10-20% above expected usage
3. **Progressive Alerts**: Multiple warning levels before hard stops
4. **Team Involvement**: Get team buy-in on budget amounts
5. **Regular Reviews**: Adjust budgets quarterly or as needed
6. **Document Exceptions**: Keep records of budget overages and reasons

### Advanced: Chargeback Implementation

Set up cost allocation for chargeback:

```yaml
Chargeback Configuration:
  Enabled: true
  Billing cycle: Monthly
  Cost centers:
    - Engineering: CC-1001
    - Marketing: CC-1002
    - Operations: CC-1003

  Allocation method: Direct
  Include in invoice:
    - LLM provider costs
    - Platform fee (10% of usage)
    - Support allocation

  Export format: SAP format CSV
  Delivery: Email to finance@company.com
```

---

## Tutorial 3: Creating Compliance Reports

**Difficulty:** Intermediate
**Time:** 30 minutes
**Goal:** Generate comprehensive compliance reports for auditors

### What You'll Learn

- Understanding compliance requirements
- Configuring report parameters
- Generating compliance reports
- Scheduling automated reports
- Preparing for audits

### Prerequisites

- Auditor role or higher
- Audit logging enabled
- At least 30 days of audit data
- Understanding of your compliance framework (SOC 2, GDPR, etc.)

### Step 1: Identify Compliance Requirements

Determine what you need to prove:

**For SOC 2:**
- Access controls
- Audit trails
- Data encryption
- Incident response
- Change management

**For GDPR:**
- Data processing activities
- User consent
- Data subject rights
- Data breach procedures
- International transfers

**For HIPAA:**
- PHI access logs
- Encryption status
- User authentication
- Audit trail completeness

### Step 2: Navigate to Compliance Reports

1. Go to **Reports** > **Compliance Reports**
2. Click **Generate New Compliance Report**

### Step 3: Select Compliance Framework

Choose your framework:

```yaml
Framework: SOC 2 Type II
Version: 2024
Scope: Full organization
Audit period: Last 12 months
Start date: November 1, 2024
End date: October 31, 2025
```

### Step 4: Configure Report Sections

Select which controls to include:

```yaml
Included Controls:
  CC1: Control Environment
    ✓ CC1.1 - COSO principles
    ✓ CC1.2 - Board oversight
    ✓ CC1.3 - Management structure

  CC2: Communication and Information
    ✓ CC2.1 - Internal communication
    ✓ CC2.2 - External communication

  CC3: Risk Assessment
    ✓ CC3.1 - Risk identification
    ✓ CC3.2 - Risk analysis

  CC6: Logical and Physical Access Controls
    ✓ CC6.1 - Logical access
    ✓ CC6.2 - Authentication
    ✓ CC6.3 - Authorization
    ✓ CC6.6 - Audit logging

  CC7: System Operations
    ✓ CC7.1 - Change management
    ✓ CC7.2 - Job monitoring
```

### Step 5: Include Evidence

Attach supporting evidence automatically:

```yaml
Evidence Collection:
  ✓ Access control policies
  ✓ Audit log samples (statistically significant)
  ✓ User access reviews (quarterly)
  ✓ Encryption certificates
  ✓ Incident response logs
  ✓ Change management tickets
  ✓ Training records
  ✓ Vendor assessments
```

### Step 6: Configure Sampling

For large datasets, configure sampling:

```yaml
Sampling Method: Statistical sampling
Confidence level: 95%
Sample size: Auto-calculate
Maximum samples: 10,000

Sampled Data:
  - Audit logs: 2,500 entries
  - Access reviews: All (152 reviews)
  - User logins: 5,000 events
  - Policy changes: All (47 changes)
```

### Step 7: Generate the Report

1. Review all selections
2. Click **Generate Report**
3. Report generation may take 5-15 minutes for large datasets
4. You'll receive an email when complete

### Step 8: Review the Generated Report

The report includes:

```
Executive Summary
  - Scope and objectives
  - Assessment period
  - Overall compliance status
  - Key findings

Control Objectives
  CC1: Control Environment
    - Description
    - Design effectiveness: Suitably designed
    - Operating effectiveness: Operating effectively
    - Evidence: [Links to evidence]
    - Testing results: 0 exceptions

  CC6.1: Logical Access
    - Description
    - Design effectiveness: Suitably designed
    - Operating effectiveness: Operating effectively
    - Evidence:
      * User access matrix (95 users reviewed)
      * RBAC configuration
      * Access review logs (quarterly)
    - Testing results: 0 exceptions

  CC6.6: Audit Logging
    - Description
    - Design effectiveness: Suitably designed
    - Operating effectiveness: Operating effectively
    - Evidence:
      * Audit log samples (2,500 entries)
      * Log integrity verification
      * Retention policy documentation
    - Testing results: 0 exceptions

Appendices
  A: System Description
  B: Principal Service Commitments
  C: Criteria and Tests
  D: Evidence Samples
  E: Exception Details (if any)
```

### Step 9: Export for Auditors

Export in auditor-friendly format:

```yaml
Export Options:
  Primary format: PDF (signed and watermarked)
  Supporting data: Excel workbook
  Evidence package: ZIP file

Export includes:
  - Main report (PDF)
  - Control matrix (Excel)
  - Evidence samples (individual files)
  - Testing workpapers (Excel)
  - Exception tracking (if applicable)
```

### Step 10: Schedule Recurring Reports

Automate future compliance reports:

```yaml
Report Schedule:
  Name: "Quarterly SOC 2 Compliance Report"
  Frequency: Every 3 months
  Next run: February 1, 2026

  Auto-include:
    - Previous quarter audit logs
    - Access reviews from quarter
    - Policy changes
    - Incidents (if any)

  Distribution:
    - Internal auditor
    - CISO
    - Compliance team
    - External auditor (secure link)

  Retention: 7 years
```

### Best Practices

1. **Start Early**: Generate reports monthly even if audits are annual
2. **Review Samples**: Spot-check sampled data for accuracy
3. **Document Exceptions**: Clearly document any exceptions found
4. **Maintain Evidence**: Keep evidence organized and accessible
5. **Test Annually**: Validate report accuracy with test audits
6. **Version Control**: Track report versions and changes

### Preparing for Audit

**1 Month Before:**
- Generate preliminary report
- Identify any gaps
- Remediate exceptions
- Update documentation

**2 Weeks Before:**
- Generate final report
- Package all evidence
- Brief stakeholders
- Prepare presentation

**During Audit:**
- Provide secure access to reports
- Make subject matter experts available
- Track auditor questions
- Document findings

---

## Tutorial 4: Setting Up Team Hierarchies

**Difficulty:** Intermediate
**Time:** 25 minutes
**Goal:** Create an organizational team structure with inherited policies and budgets

### What You'll Learn

- Designing team hierarchies
- Creating nested teams
- Configuring policy inheritance
- Setting up budget allocation
- Managing team memberships

### Prerequisites

- Org Admin or Team Admin role
- Understanding of your organizational structure
- List of teams and their relationships

### Step 1: Design Your Team Structure

Plan your hierarchy before creating it. Example:

```
Company
├── Engineering
│   ├── Backend
│   │   ├── API Team
│   │   └── Database Team
│   ├── Frontend
│   │   ├── Web Team
│   │   └── Mobile Team
│   └── ML/AI
│       ├── Research
│       └── Production ML
├── Product
│   ├── Product Management
│   └── Design
├── Marketing
│   ├── Content
│   └── Growth
└── Operations
    ├── Customer Support
    └── IT
```

### Step 2: Create Top-Level Teams

Start with top-level departments:

1. Navigate to **Teams** > **Create Team**
2. Create the Engineering team:

```yaml
Name: Engineering
Description: Engineering Department
Parent Team: None (top-level)
Owner: engineering-director@company.com
Budget: $10,000/month
```

3. Repeat for other top-level teams (Product, Marketing, Operations)

### Step 3: Create Sub-Teams

Create the Backend team under Engineering:

```yaml
Name: Backend
Description: Backend Engineering Team
Parent Team: Engineering
Owner: backend-lead@company.com
Budget: $4,000/month (inherits from Engineering's $10,000)
```

Create nested teams:

```yaml
Name: API Team
Description: API Development Team
Parent Team: Backend
Owner: api-lead@company.com
Budget: $2,000/month
Members: 8 engineers
```

### Step 4: Configure Team Policies

Set up policies that cascade down the hierarchy:

**Engineering Department Policy:**
```yaml
Policy Name: "Engineering Access Policy"
Scope: Team (Engineering) and sub-teams
Type: Access Control

Rules:
  - Allow all LLM providers
  - Models: All models
  - Max tokens per request: 8,000

Applies to:
  ✓ Engineering (parent team)
  ✓ All sub-teams (Backend, Frontend, ML/AI)
  ✓ All nested teams (API Team, Database Team, etc.)
```

**Backend Team-Specific Policy:**
```yaml
Policy Name: "Backend Rate Limit"
Scope: Team (Backend) and sub-teams
Type: Rate Limiting
Priority: 150 (higher than parent)

Rules:
  - Requests per hour: 2,000
  - Applies to: Backend and sub-teams

Inherits:
  - Engineering Access Policy (lower priority)
```

### Step 5: Set Up Budget Allocation

Configure budget hierarchy:

```yaml
Engineering Budget: $10,000/month
  ├── Backend: $4,000 (40%)
  │   ├── API Team: $2,000 (50% of Backend)
  │   └── Database Team: $2,000 (50% of Backend)
  ├── Frontend: $3,000 (30%)
  │   ├── Web Team: $1,800 (60% of Frontend)
  │   └── Mobile Team: $1,200 (40% of Frontend)
  └── ML/AI: $3,000 (30%)
      ├── Research: $1,500 (50% of ML/AI)
      └── Production ML: $1,500 (50% of ML/AI)
```

Budgets roll up automatically:
- API Team spending counts toward Backend budget
- Backend spending counts toward Engineering budget
- Engineering spending counts toward Organization budget

### Step 6: Add Team Members

Add users to teams:

**Individual Assignment:**
1. Navigate to team details
2. Click **Members** tab
3. Click **Add Member**
4. Select user and assign role:

```yaml
User: john.doe@company.com
Team: API Team
Role within team: Member
Permissions: Inherited from team policies
```

**Bulk Assignment:**
```csv
email,team,role
alice@company.com,API Team,Member
bob@company.com,API Team,Lead
carol@company.com,Database Team,Member
dave@company.com,Database Team,Lead
```

### Step 7: Configure Team Inheritance

Set inheritance rules:

```yaml
Inheritance Settings:
  Policies:
    Mode: Additive (child teams get parent + own policies)
    Allow overrides: Yes
    Override requires: Team Admin approval

  Budgets:
    Mode: Allocated (child budgets part of parent)
    Rollup: Automatic
    Overage: Warn at parent level

  Permissions:
    Mode: Additive (child teams inherit parent permissions)
    Additional permissions: Allowed
    Revoke inheritance: Requires Org Admin
```

### Step 8: Create Team Dashboards

Set up team-specific views:

**API Team Dashboard:**
```yaml
Widgets:
  - Team usage (last 30 days)
  - Budget utilization
  - Top API users
  - Recent requests
  - Policy violations
  - Cost trend
```

### Step 9: Set Up Team Notifications

Configure team alerts:

```yaml
API Team Notifications:
  Budget alerts:
    - 75%: Email to team lead
    - 90%: Email to team + Backend lead
    - 100%: Email to all + Engineering Director

  Policy violations:
    - Immediate: Slack #api-team channel
    - Daily digest: Email to team lead

  Usage anomalies:
    - 50% increase: Investigate
    - 100% increase: Alert immediately
```

### Step 10: Test the Hierarchy

Verify the structure works:

1. **Test policy inheritance:**
   - Make request as API Team member
   - Verify Engineering policy applies
   - Verify Backend policy applies
   - Verify most specific policy wins

2. **Test budget rollup:**
   - Check API Team budget
   - Verify it counts toward Backend
   - Verify Backend counts toward Engineering

3. **Test permissions:**
   - Team member should see team data only
   - Team lead should see team + sub-team data
   - Parent team lead should see all child teams

### Best Practices

1. **Mirror Organization**: Align team structure with actual org chart
2. **Clear Ownership**: Every team should have a clear owner
3. **Budget Discipline**: Ensure child budgets don't exceed parent
4. **Regular Reviews**: Quarterly review of team structure
5. **Document Changes**: Keep changelog of structural changes
6. **Communication**: Notify affected users of team changes

### Advanced: Matrix Organizations

For matrix structures:

```yaml
User: jane.doe@company.com
Primary Team: API Team
Secondary Teams:
  - ML/AI (for LLM expertise)
  - Security (for security reviews)

Budget allocation:
  - API Team: 60% of usage
  - ML/AI: 30% of usage
  - Security: 10% of usage

Policy application:
  - All three teams' policies apply
  - Most restrictive rule wins
```

---

## Tutorial 5: Integrating with LLM Providers

**Difficulty:** Beginner
**Time:** 20 minutes
**Goal:** Connect multiple LLM providers to your dashboard

### What You'll Learn

- Adding LLM provider integrations
- Configuring provider settings
- Testing provider connections
- Managing API keys securely
- Setting up fallback providers

### Prerequisites

- Admin role
- API keys for LLM providers
- Understanding of which models you need

### Step 1: Obtain API Keys

Get API keys from providers:

**OpenAI:**
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-`)
4. Store securely

**Anthropic:**
1. Go to https://console.anthropic.com/
2. Navigate to API Keys
3. Create new key (starts with `sk-ant-`)
4. Copy and store securely

**Google (Vertex AI):**
1. Create GCP project
2. Enable Vertex AI API
3. Create service account
4. Download JSON key file

### Step 2: Add First Provider (OpenAI)

1. Navigate to **Integrations** > **LLM Providers**
2. Click **Add Provider**
3. Select **OpenAI**
4. Fill in the form:

```yaml
Provider: OpenAI
Display Name: OpenAI Production
API Key: sk-your-actual-key-here
Organization ID: (optional)

Models to Enable:
  ✓ GPT-4
  ✓ GPT-4 Turbo
  ✓ GPT-3.5 Turbo
  ✗ GPT-3.5 (legacy)

Settings:
  Default temperature: 0.7
  Max tokens: 2000
  Timeout: 30 seconds
  Retry attempts: 3
```

### Step 3: Configure Rate Limits

Set provider-specific limits:

```yaml
Rate Limits:
  Requests per minute: 3500 (OpenAI's tier limit)
  Tokens per minute: 90,000

  Throttling:
    When limit reached: Queue requests
    Max queue size: 100
    Queue timeout: 60 seconds
```

### Step 4: Test the Connection

1. Click **Test Connection**
2. The system sends a test request
3. Verify successful response:

```json
{
  "status": "success",
  "model": "gpt-3.5-turbo",
  "response": "Test successful",
  "latency_ms": 245,
  "cost_usd": 0.0001
}
```

### Step 5: Add Additional Providers

**Add Anthropic:**
```yaml
Provider: Anthropic
Display Name: Anthropic Claude
API Key: sk-ant-your-key-here

Models:
  ✓ Claude 3 Opus
  ✓ Claude 3 Sonnet
  ✓ Claude 3 Haiku

Settings:
  Default max_tokens: 4096
  Temperature: 1.0
  Top_p: 0.9
```

**Add Google Vertex AI:**
```yaml
Provider: Google Vertex AI
Display Name: Google Gemini
Authentication: Service Account JSON

Service Account: (upload JSON file)

Project ID: your-gcp-project
Region: us-central1

Models:
  ✓ Gemini Pro
  ✓ Gemini Pro Vision
```

### Step 6: Configure Provider Priority

Set fallback order:

```yaml
Provider Priority (for auto-routing):
  1. OpenAI (primary)
  2. Anthropic (fallback)
  3. Google (fallback)

Fallback Rules:
  - If primary fails: Try next provider
  - If primary rate limited: Queue or fallback
  - If all providers fail: Return error
```

### Step 7: Set Up Cost Tracking

Configure cost calculation:

```yaml
Cost Tracking:
  OpenAI:
    GPT-4: $0.03/1K input tokens, $0.06/1K output tokens
    GPT-3.5: $0.0015/1K input tokens, $0.002/1K output tokens

  Anthropic:
    Claude 3 Opus: $0.015/1K input, $0.075/1K output
    Claude 3 Sonnet: $0.003/1K input, $0.015/1K output

  Update frequency: Daily (from provider pricing pages)
```

### Step 8: Create Provider Policies

Set provider-specific policies:

**GPT-4 Approval Policy:**
```yaml
Policy Name: "GPT-4 Approval Required"
Provider: OpenAI
Model: GPT-4

Conditions:
  - If estimated cost > $5
  - Then require approval from Team Admin

Exceptions:
  - Power Users: Auto-approved
  - Emergency tag: Auto-approved
```

**Model Routing Policy:**
```yaml
Policy Name: "Cost-Optimized Routing"

Rules:
  - If prompt length < 1000 chars: Use GPT-3.5
  - If prompt requires reasoning: Use GPT-4
  - If prompt includes code: Use Claude
  - Default: GPT-3.5
```

### Step 9: Test Integration

Make a test request:

```python
from llm_governance import Client

client = Client(
    api_url="http://localhost:8080",
    api_key="your-api-key"
)

# Request will automatically route to configured provider
response = client.chat.create(
    model="gpt-4",  # or let system choose
    messages=[
        {"role": "user", "content": "Hello, test integration"}
    ]
)

print(f"Response: {response.content}")
print(f"Provider: {response.provider}")
print(f"Cost: ${response.cost}")
```

### Step 10: Monitor Provider Health

Set up provider monitoring:

1. Navigate to **Integrations** > **Provider Health**
2. View metrics:
   - Uptime
   - Average latency
   - Error rate
   - Cost per request
   - Request volume

### Best Practices

1. **Rotate Keys**: Rotate API keys every 90 days
2. **Monitor Costs**: Set up alerts for unexpected provider costs
3. **Test Regularly**: Automated health checks
4. **Fallback Strategy**: Always have backup providers
5. **Rate Limits**: Respect provider rate limits
6. **Regional Routing**: Use regional endpoints for latency

### Troubleshooting

**Connection fails:**
- Verify API key is correct
- Check API key has necessary permissions
- Verify network can reach provider
- Check firewall rules

**High latency:**
- Use regional endpoints
- Check network path
- Consider caching
- Optimize prompts

---

## Tutorial 6: Configuring Alerts

**Difficulty:** Beginner
**Time:** 15 minutes
**Goal:** Set up comprehensive alerting for proactive monitoring

### What You'll Learn

- Creating different types of alerts
- Configuring alert channels
- Setting up alert conditions
- Managing alert fatigue
- Testing alerts

### Prerequisites

- Admin role for system-wide alerts, or Team Admin for team alerts
- Email and/or Slack configured

### Step 1: Understand Alert Types

Available alert types:

**Cost Alerts:**
- Budget threshold reached
- Unusual spending detected
- Projected budget overrun
- High-cost request

**Usage Alerts:**
- High request volume
- Rate limit approaching
- Quota exhaustion
- Unusual usage pattern

**Policy Alerts:**
- Policy violation
- Repeated violations
- Critical policy failure

**Security Alerts:**
- Multiple failed logins
- Unusual access pattern
- Unauthorized access attempt
- MFA failure

**System Alerts:**
- Service degradation
- Provider outage
- High error rate
- Integration failure

### Step 2: Create Cost Alert

1. Navigate to **Settings** > **Alerts** > **Create Alert**
2. Select **Cost Alert**
3. Configure:

```yaml
Alert Name: "Budget 75% Warning"
Type: Cost
Severity: Warning

Trigger Condition:
  Metric: Monthly budget utilization
  Threshold: 75%
  Team: Organization-wide

Notification:
  Recipients:
    - finance@company.com
    - admin@company.com
  Channels:
    - Email
    - Slack (#finance)

Message Template:
  Subject: "Budget Alert: 75% Utilized"
  Body: |
    Monthly budget is 75% utilized.
    Current: ${{current_spend}}
    Budget: ${{budget}}
    Remaining: ${{remaining}}
    Days left: {{days_remaining}}
```

### Step 3: Create Anomaly Detection Alert

Set up ML-based anomaly detection:

```yaml
Alert Name: "Cost Anomaly Detection"
Type: Cost
Severity: High

Trigger Condition:
  Detection: ML-based anomaly
  Metric: Daily spending
  Sensitivity: Medium
  Comparison: Last 30 days baseline

  Trigger if:
    - Spending exceeds 2x standard deviation
    - Pattern doesn't match typical day-of-week
    - Unusual time of day activity

Notification:
  Immediate: Yes
  Recipients: Admin team
  Channels: Slack, Email, SMS (critical only)
```

### Step 4: Create Policy Violation Alert

```yaml
Alert Name: "Critical Policy Violations"
Type: Policy
Severity: Critical

Trigger Condition:
  Event: Policy violation
  Policy types:
    ✓ Security policies
    ✓ Compliance policies
    ✗ Rate limiting (too noisy)

  Threshold:
    Single violation: Alert immediately
    Multiple violations: 3 in 1 hour

Notification:
  Immediate: Yes
  Recipients:
    - security@company.com
    - user (who violated)
    - user's manager
  Include:
    - Violation details
    - Policy name
    - User information
    - Request context
```

### Step 5: Create Security Alert

```yaml
Alert Name: "Failed Login Attempts"
Type: Security
Severity: High

Trigger Condition:
  Event: Failed login
  Threshold: 5 failed attempts in 15 minutes
  Scope: Per user

  Additional conditions:
    - Different IP addresses: Alert immediately
    - Known VPN: Reduce severity
    - Business hours: Lower priority

Notification:
  User: Yes (warn them)
  Security team: Yes
  Auto-action:
    - Lock account after 10 attempts
    - Require password reset
    - MFA verification on next login
```

### Step 6: Configure Alert Channels

**Email Configuration:**
```yaml
Email:
  From: alerts@llm-governance.company.com
  Template: HTML
  Include:
    - Alert summary
    - Detailed information
    - Quick action links
    - Dismiss/acknowledge button
```

**Slack Configuration:**
```yaml
Slack:
  Webhook: https://hooks.slack.com/services/...

  Channels by severity:
    Critical: #incidents
    High: #alerts
    Medium: #monitoring
    Low: #notifications

  Format:
    - Rich formatting with colors
    - Include charts/graphs
    - Action buttons
    - Thread follow-ups
```

**SMS Configuration (Critical only):**
```yaml
SMS:
  Provider: Twilio
  Numbers:
    - +1-555-0100 (On-call engineer)
    - +1-555-0101 (Backup)

  Trigger:
    - Critical alerts only
    - After-hours only
    - If Slack/Email not acknowledged in 15 min
```

### Step 7: Set Up Alert Aggregation

Prevent alert fatigue:

```yaml
Aggregation Rules:
  Similar alerts:
    Window: 5 minutes
    Action: Combine into single alert
    Max occurrences: Show count

  Repeated alerts:
    Window: 1 hour
    Action: Suppress after first
    Re-alert: Every 4 hours if still active

  Daily digest:
    Time: 9 AM
    Include: Low-priority alerts
    Format: Summary email
```

### Step 8: Create Alert Escalation

```yaml
Escalation Policy:
  Name: "Critical Alert Escalation"

  Level 1: (Immediate)
    - Notify on-call engineer
    - Channels: Slack, Email
    - Acknowledge required: 15 minutes

  Level 2: (If not acknowledged)
    - Notify engineering manager
    - Channels: Slack, Email, SMS
    - Acknowledge required: 15 minutes

  Level 3: (If still not acknowledged)
    - Notify CTO
    - Channels: Phone call, SMS
    - Escalate to incident
```

### Step 9: Test Alerts

Always test before going live:

```yaml
Alert Test:
  Name: Budget 75% Warning (Test)
  Action: Send test alert
  Recipients: your-email@company.com

Expected result:
  - Email received within 1 minute
  - Slack message appears
  - Content is correct
  - Links work
  - Formatting is good
```

### Step 10: Create Alert Dashboard

Monitor all alerts in one place:

1. Navigate to **Alerts** > **Dashboard**
2. View:
   - Active alerts
   - Alert history
   - Response times
   - Most common alerts
   - Alert trends

### Best Practices

1. **Start Conservative**: Begin with fewer alerts, add as needed
2. **Tune Thresholds**: Adjust based on false positive rate
3. **Clear Actions**: Every alert should have a clear action
4. **Regular Review**: Monthly review of alert effectiveness
5. **Alert Ownership**: Assign owners to alert types
6. **Documentation**: Document expected response to each alert

### Alert Fatigue Prevention

1. **Appropriate Severity**: Don't mark everything critical
2. **Aggregate**: Combine similar alerts
3. **Suppress**: Suppress known issues during maintenance
4. **Digest**: Low-priority alerts in daily digest
5. **Auto-Resolve**: Resolve alerts when conditions clear

---

## Tutorial 7: Generating Audit Reports

**Difficulty:** Intermediate
**Time:** 20 minutes
**Goal:** Create comprehensive audit reports for compliance and investigation

### What You'll Learn

- Understanding audit log structure
- Filtering and searching logs
- Generating audit reports
- Scheduling automated reports
- Exporting for compliance

### Prerequisites

- Auditor role or higher
- At least 7 days of audit data
- Understanding of what you're auditing for

### Step 1: Understand Audit Log Types

The system logs these event types:

**Authentication Events:**
- User login/logout
- MFA verification
- Password changes
- Failed login attempts
- Session expiration

**Authorization Events:**
- Permission grants/revocations
- Role assignments
- Access denied events
- Policy evaluations

**LLM Request Events:**
- Every LLM API call
- Request parameters
- Response metadata
- Cost information
- Policy decisions

**Configuration Events:**
- Policy changes
- User management
- Team changes
- Integration updates
- System settings

**Data Events:**
- Data access
- Data export
- Data deletion
- Report generation

### Step 2: Navigate to Audit Logs

1. Go to **Audit** > **Audit Logs**
2. You'll see the most recent events
3. Each entry shows:
   - Timestamp (UTC)
   - User
   - Action
   - Resource
   - Result (success/failure)
   - IP address
   - Details

### Step 3: Filter Audit Logs

Create a specific filter for your investigation:

**Example: Review all LLM requests by a specific user**

```yaml
Filters:
  Date range: Last 30 days
  Event type: LLM_REQUEST
  User: john.doe@company.com
  Result: All

Additional filters:
  Provider: OpenAI
  Model: GPT-4
  Min cost: $0.10
```

**Example: Find failed login attempts**

```yaml
Filters:
  Date range: Last 7 days
  Event type: AUTH_LOGIN
  Result: FAILURE
  Sort by: IP address (to find patterns)
```

### Step 4: Analyze Audit Data

Use the built-in analytics:

```yaml
Analytics View:
  Group by: User
  Metric: Count of events
  Time range: Last 30 days

Results:
  john.doe@company.com: 1,247 requests
  jane.smith@company.com: 892 requests
  bob.jones@company.com: 634 requests
  ...

Further analysis:
  - Cost per user
  - Requests by model
  - Peak usage times
  - Error rates
```

### Step 5: Generate User Activity Report

Create a comprehensive user activity report:

1. Navigate to **Reports** > **Audit Reports** > **Create Report**
2. Select **User Activity Report**
3. Configure:

```yaml
Report Name: "John Doe Activity - November 2025"
Report Type: User Activity
Time Period: November 1-30, 2025
User: john.doe@company.com

Include:
  ✓ Login history
  ✓ LLM requests
  ✓ Policy violations (if any)
  ✓ Configuration changes made
  ✓ Data accessed
  ✓ Cost summary

Output Format: PDF + CSV
Sections:
  1. Executive Summary
  2. Login Activity
  3. LLM Usage
  4. Cost Summary
  5. Policy Compliance
  6. Detailed Logs (appendix)
```

### Step 6: Generate Access Review Report

For compliance with access control reviews:

```yaml
Report Name: "Quarterly Access Review - Q4 2025"
Report Type: Access Control Review
Time Period: October 1 - December 31, 2025

Review Items:
  ✓ All user accounts
  ✓ Role assignments
  ✓ Team memberships
  ✓ Special permissions
  ✓ API keys
  ✓ Inactive accounts

For each user, include:
  - Last login date
  - Current role(s)
  - Team(s)
  - Permissions
  - Recent activity summary
  - Manager approval status

Format:
  Primary: Excel workbook (for review)
  Backup: PDF (for records)
```

### Step 7: Generate Security Incident Report

For security investigations:

```yaml
Report Name: "Security Incident - December 15, 2025"
Report Type: Security Incident
Incident ID: INC-2025-1215-001
Time Period: December 15, 2025 14:00-16:00 UTC

Incident Details:
  Summary: Multiple failed login attempts followed by successful login
  Severity: Medium
  User affected: jane.smith@company.com

Logs to Include:
  ✓ Failed login attempts (20 attempts from IP 203.0.113.45)
  ✓ Successful login (from IP 203.0.113.45)
  ✓ All actions during session
  ✓ Geographic location data
  ✓ Device information
  ✓ Subsequent password change

Timeline:
  14:32 UTC: First failed login attempt
  14:35 UTC: 10 failed attempts
  14:38 UTC: Successful login
  14:40 UTC: LLM requests made
  15:15 UTC: Security team notified
  15:20 UTC: Account locked
  15:45 UTC: User contacted, confirmed unauthorized
  16:00 UTC: Password reset, MFA enforced

Actions Taken:
  - Account locked
  - Session terminated
  - Password reset forced
  - MFA enabled
  - IP blocked
  - User notified
```

### Step 8: Schedule Recurring Reports

Automate compliance reports:

```yaml
Scheduled Report: "Monthly Compliance Audit"
Frequency: Monthly (1st day of month)
Time: 2:00 AM UTC
Report Type: Compliance

Content:
  - All user activity (previous month)
  - Policy violations
  - Access changes
  - Configuration changes
  - Security events
  - Cost summary

Distribution:
  - Internal auditor: email@company.com
  - Compliance officer: compliance@company.com
  - CISO: ciso@company.com

Retention: 7 years (compliance requirement)
Encryption: Yes (AES-256)
Storage: Secure archive location
```

### Step 9: Export for External Auditors

Prepare audit package for external auditors:

```yaml
Audit Package: "SOC 2 Type II - 2025"
Period: January 1 - December 31, 2025

Contents:
  1. Executive Summary (PDF)
  2. Control Environment (PDF)
  3. Audit Log Samples (CSV)
  4. Access Control Matrix (Excel)
  5. User Access Reviews (PDF)
  6. Policy Documentation (PDF)
  7. Incident Reports (PDF)
  8. Change Management Logs (CSV)
  9. Evidence Files (ZIP)

Package Details:
  Total size: 450 MB
  Format: Encrypted ZIP
  Password: Provided separately
  Integrity: SHA-256 checksum provided

Transfer Method:
  - Secure file transfer link
  - Expiration: 30 days
  - Download limit: 5 times
  - Access log: Enabled
```

### Step 10: Verify Report Accuracy

Always verify before distribution:

```yaml
Verification Checklist:
  ✓ Date range is correct
  ✓ All requested data included
  ✓ Sensitive data redacted (if required)
  ✓ Calculations are correct
  ✓ No data gaps or missing entries
  ✓ Formatting is professional
  ✓ Links work (for PDF reports)
  ✓ File size is reasonable
  ✓ Encryption applied (if required)
  ✓ Recipient list is correct

Spot Check:
  - Sample 10 random log entries
  - Verify against raw logs
  - Check totals and summaries
  - Validate filter accuracy
```

### Best Practices

1. **Regular Cadence**: Generate reports regularly, not just when needed
2. **Retention**: Follow regulatory retention requirements (often 7 years)
3. **Version Control**: Keep track of report versions
4. **Access Control**: Limit who can access audit reports
5. **Encryption**: Always encrypt reports containing sensitive data
6. **Documentation**: Document report purpose and methodology

### Advanced: Automated Anomaly Reports

Set up ML-based anomaly detection reports:

```yaml
Anomaly Report: "Weekly Anomaly Detection"
Frequency: Weekly
ML Model: Isolation Forest

Detect:
  - Unusual login times
  - Abnormal request volumes
  - Cost anomalies
  - Access pattern changes
  - Failed authentication spikes

Threshold:
  Confidence: 95%
  Minimum severity: Medium

Output:
  - List of anomalies
  - Risk score
  - Recommended actions
  - Auto-create tickets: Yes (for high-risk)
```

---

## Conclusion

Congratulations! You've completed all seven tutorials. You now know how to:

1. ✓ Create and manage policies
2. ✓ Set up cost budgets and controls
3. ✓ Generate compliance reports
4. ✓ Organize teams hierarchically
5. ✓ Integrate LLM providers
6. ✓ Configure comprehensive alerts
7. ✓ Generate audit reports

### Next Steps

- **Practice**: Try these tutorials in a test environment
- **Customize**: Adapt examples to your organization's needs
- **Automate**: Schedule recurring tasks
- **Monitor**: Regularly review dashboards and reports
- **Optimize**: Continuously improve based on usage patterns

### Additional Resources

- [User Guide](USER_GUIDE.md) - Complete user documentation
- [Admin Guide](ADMIN_GUIDE.md) - Administrative procedures
- [Features](FEATURES.md) - Full feature catalog
- [FAQ](FAQ.md) - Common questions
- [Security Guide](SECURITY_GUIDE.md) - Security best practices
- [Compliance Guide](COMPLIANCE_GUIDE.md) - Compliance frameworks

### Get Help

- **Community**: https://community.llm-governance.example
- **Support**: support@llm-governance.example
- **Documentation**: https://docs.llm-governance.example

---

**Version:** 1.0
**Last Updated:** November 16, 2025

*These tutorials are regularly updated. Check back for new tutorials and updated content.*
