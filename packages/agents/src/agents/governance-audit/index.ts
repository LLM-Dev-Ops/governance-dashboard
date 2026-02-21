/**
 * Governance Audit Agent
 *
 * Classification: GOVERNANCE_AUDIT
 * Decision Type: audit_summary
 *
 * Purpose:
 * Provide audit and compliance visibility across governance policies,
 * decision trails, and organizational adherence.
 *
 * This agent:
 * - Aggregates governance audit signals
 * - Evaluates compliance status across policies
 * - Measures policy coverage and gaps
 * - Produces audit summary scores
 * - Generates compliance recommendations
 *
 * This agent MUST NOT:
 * - Enforce policies
 * - Modify configurations
 * - Approve or reject changes
 * - Connect directly to Google SQL
 * - Execute SQL queries
 */

export { GovernanceAuditAgent } from './agent.js';
export {
  createGovernanceAuditAgent,
  createGovernanceAuditAgentFromEnv,
  createGovernanceAuditAgentForTesting,
} from './factory.js';
export * from './types.js';
