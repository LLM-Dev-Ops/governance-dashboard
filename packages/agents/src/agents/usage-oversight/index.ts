/**
 * Usage Oversight Agent
 *
 * Classification: OVERSIGHT / VISIBILITY
 * Decision Type: usage_oversight_signal
 *
 * Purpose:
 * Provide visibility into LLM usage patterns for governance and compliance monitoring.
 *
 * This agent:
 * - Aggregates usage signals across systems
 * - Identifies out-of-policy usage patterns
 * - Produces oversight dashboards and signals
 * - Calculates governance health scores
 * - Generates adherence reports
 *
 * This agent MUST NOT:
 * - Intercept execution
 * - Trigger retries or workflows
 * - Enforce policies
 * - Modify configurations
 * - Emit anomaly detections
 * - Apply optimizations
 * - Connect directly to Google SQL
 * - Execute SQL queries
 */

export { UsageOversightAgent } from './agent.js';
export {
  createUsageOversightAgent,
  createUsageOversightAgentFromEnv,
  createUsageOversightAgentForTesting,
} from './factory.js';
export * from './types.js';
