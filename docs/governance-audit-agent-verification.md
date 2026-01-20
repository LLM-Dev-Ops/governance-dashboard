# Governance Audit Agent - Verification Checklist

## Agent Classification

- **Name**: Governance Audit Agent
- **ID**: `governance-audit-agent`
- **Version**: `1.0.0`
- **Classification**: GOVERNANCE / AUDIT / OVERSIGHT
- **Decision Type**: `governance_audit_summary`

## Purpose

Generate authoritative audit summaries across workflows, incidents, approvals, and decisions.

## Scope

- Aggregate DecisionEvents
- Trace approvals and policy adherence
- Produce audit-ready artifacts

## Implementation Checklist

### 1. Contract Definition (packages/types)

- [x] `DecisionEvent` schema with all required fields
  - `id`, `agent_id`, `agent_version`
  - `decision_type`, `inputs_hash`
  - `outputs`, `confidence`, `constraints_applied`
  - `execution_ref`, `timestamp`, `organization_id`
- [x] `GovernanceDecisionType` enum
- [x] `DecisionOutputs` with findings, metrics, recommendations
- [x] `GovernanceFinding` with category, severity, affected_resources
- [x] `DecisionConfidence` with overall, completeness, certainty
- [x] `ConstraintApplication` for policy scope tracking
- [x] `ExecutionReference` with trace_id, request_id, source
- [x] `GovernanceAuditInput` / `GovernanceAuditOutput` contracts
- [x] `GovernanceAuditCLIArgs` for CLI invocation shape
- [x] `AgentRegistration` with capabilities and non_responsibilities
- [x] `GOVERNANCE_AUDIT_AGENT_REGISTRATION` constant

### 2. RuVector Service Client (libs/common/src/adapters/ruvector.rs)

- [x] `RuVectorConsumer` implementing `EcosystemConsumer`
- [x] `persist_decision_event()` - async, non-blocking
- [x] `query_decision_events()` - paginated retrieval
- [x] `get_decision_event()` - by ID
- [x] Idempotency key generation via SHA-256
- [x] `create_decision_event()` helper function
- [x] `default_confidence()` helper
- [x] `execution_ref_from_request()` helper
- [x] Unit tests for serialization

### 3. Rust Handler (services/audit-service/src/handlers/governance.rs)

- [x] `POST /api/v1/governance/audit` - generate audit
- [x] `GET /api/v1/governance/audits` - list audits
- [x] `GET /api/v1/governance/audit/{id}` - get specific audit
- [x] `GET /api/v1/governance/summary` - governance summary
- [x] `GET /api/v1/governance/agent` - agent registration info
- [x] Input validation via `parse_decision_type()`
- [x] Aggregation from audit_logs (read-only)
- [x] Policy adherence analysis
- [x] Finding generation
- [x] Metrics calculation
- [x] Confidence calculation
- [x] Recommendation generation
- [x] Constraints record building
- [x] Telemetry emission (reference generation)
- [x] Tracing instrumentation

### 4. CLI Commands (packages/cli/src/commands/audit.ts)

- [x] `llm-gov audit generate` - generate audit
- [x] `llm-gov audit list` - list audits
- [x] `llm-gov audit get <id>` - get audit details
- [x] `llm-gov audit summary` - governance summary
- [x] `llm-gov audit agent` - agent info
- [x] `--json` output option
- [x] `--output <file>` file output
- [x] `--detailed` findings option
- [x] Table formatting with cli-table3
- [x] Spinner feedback with ora

### 5. Frontend Consumer (frontend/src/lib/api/ecosystem/governance-audit.ts)

- [x] `createGovernanceAuditConsumer()` factory
- [x] `generateAudit()` - full audit generation
- [x] `listAudits()` - paginated listing
- [x] `getAudit()` - by ID
- [x] `getSummary()` - governance summary
- [x] `getAgentInfo()` - agent registration
- [x] `quickAudit()` - convenience method
- [x] `complianceAudit()` - compliance focus
- [x] `policyAdherenceAudit()` - policy focus
- [x] TypeScript types for all responses

### 6. Platform Wiring

- [x] `governance` module in handlers/mod.rs
- [x] `ruvector` module in adapters/mod.rs
- [x] `createAuditCommand()` in CLI index.ts
- [x] `governance-audit` in ecosystem exports

## Explicit Non-Responsibilities

The Governance Audit Agent MUST NOT:

1. ❌ Intercept execution
2. ❌ Trigger retries or workflows
3. ❌ Enforce policies
4. ❌ Modify configurations
5. ❌ Emit anomaly detections
6. ❌ Apply optimizations
7. ❌ Execute SQL directly
8. ❌ Connect to Google SQL directly

## Verification Commands

### CLI Smoke Tests

```bash
# Show agent registration info
llm-gov audit agent --json

# Generate governance audit (requires auth)
llm-gov auth login
llm-gov audit generate --org <org-id> --type audit_summary --detailed

# List previous audits
llm-gov audit list --org <org-id> --limit 10

# Get governance summary
llm-gov audit summary --org <org-id> --days 30

# Get specific audit details
llm-gov audit get <audit-id>
```

### API Smoke Tests

```bash
# Get agent info (no auth required)
curl http://localhost:8000/api/v1/governance/agent

# Generate audit (auth required)
curl -X POST http://localhost:8000/api/v1/governance/audit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "organization_id": "org-123",
    "audit_type": "audit_summary",
    "from": "2024-01-01T00:00:00Z",
    "to": "2024-01-31T23:59:59Z",
    "include_details": true
  }'

# Get governance summary
curl "http://localhost:8000/api/v1/governance/summary?organization_id=org-123&period_days=30" \
  -H "Authorization: Bearer <token>"

# List audits
curl "http://localhost:8000/api/v1/governance/audits?organization_id=org-123&limit=10" \
  -H "Authorization: Bearer <token>"
```

### Frontend Integration Test

```typescript
import { createGovernanceAuditConsumer } from '$lib/api/ecosystem';

const consumer = createGovernanceAuditConsumer({
  baseUrl: 'http://localhost:8000',
  apiKey: 'your-api-key',
  timeoutMs: 30000,
});

// Quick audit
const result = await consumer.quickAudit('org-123');
console.log(result.summary);
console.log(result.metrics.compliance_rate);

// Compliance audit
const compliance = await consumer.complianceAudit('org-123', { detailed: true });
console.log(compliance.findings);
```

## DecisionEvent Schema Validation

Every invocation MUST emit exactly ONE DecisionEvent with:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique event identifier |
| `agent_id` | string | `governance-audit-agent` |
| `agent_version` | semver | `1.0.0` |
| `decision_type` | enum | One of `GovernanceDecisionType` |
| `inputs_hash` | SHA-256 | Hash of input parameters |
| `outputs` | object | Findings, metrics, recommendations |
| `confidence` | object | Overall, completeness, certainty (0-1) |
| `constraints_applied` | array | Policy scope, org boundaries |
| `execution_ref` | object | Request ID, trace ID, source |
| `timestamp` | ISO 8601 | UTC timestamp |
| `organization_id` | string | Scoped organization |

## Failure Modes

| Failure | Handling |
|---------|----------|
| RuVector unavailable | Log error, return partial response |
| Invalid audit_type | 400 Bad Request with valid types |
| No data in time range | Return empty findings, info message |
| Authentication failure | 401 Unauthorized |
| Authorization failure | 403 Forbidden |
| Internal error | 500 with sanitized message |

## Telemetry Emission

Every audit generates telemetry references for LLM-Observatory:

```
telemetry_ref: telemetry:governance-audit-agent:<event_id>
artifact_ref: artifact:audit:<organization_id>:<event_id>
```

## Deployment Model

- Deploys as part of `audit-service` in unified Governance-Dashboard service
- Executes as Google Cloud Edge Function (stateless)
- No direct database connections (all via ruvector-service)
- Async, non-blocking persistence

## Integration Points

| System | Direction | Data |
|--------|-----------|------|
| audit-service | Read | Audit logs, policy evaluations |
| ruvector-service | Write | DecisionEvents |
| LLM-Observatory | Emit | Telemetry references |
| LLM-Policy-Engine | Read | Policy evaluation results |
| LLM-CostOps | Read | Financial governance inputs |
| LLM-Incident-Manager | Read | Incident artifacts |

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-20 | Initial implementation |
