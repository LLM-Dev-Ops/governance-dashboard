/**
 * DecisionEvent Schema
 *
 * Core contract for all governance agent outputs.
 * Every agent MUST emit exactly ONE DecisionEvent per invocation.
 *
 * This schema is persisted to ruvector-service (backed by Google SQL/Postgres).
 */

import { z } from 'zod';

/**
 * Decision types for governance agents
 */
export const DecisionTypeSchema = z.enum([
  // Usage Oversight Agent
  'usage_oversight_signal',
  // Audit agents
  'audit_summary',
  'compliance_status',
  'governance_snapshot',
  // Policy agents
  'policy_adherence_report',
  'policy_change_record',
  // Approval agents
  'approval_trail_summary',
  'approval_decision',
  // Change Impact Agent
  'change_impact_assessment',
  // Phase 4 Layer 1 - Governance & FinOps Signals
  // NOTE: Agents MUST emit these signals but MUST NOT auto-enforce or auto-approve
  'cost_risk_signal',           // Emitted when cost thresholds are approached/exceeded
  'budget_threshold_signal',     // Emitted when budget thresholds are crossed
  'policy_violation_signal',     // Emitted when policy violations are detected
  'approval_required_signal',    // Emitted when human approval is required
]);

export type DecisionType = z.infer<typeof DecisionTypeSchema>;

/**
 * Confidence semantics for governance decisions
 *
 * - coverage: Percentage of relevant data analyzed (0-1)
 * - completeness: Percentage of required fields present (0-1)
 * - confidence_band: Uncertainty range for numerical outputs
 */
export const ConfidenceSchema = z.object({
  /** Percentage of relevant data analyzed (0-1) */
  coverage: z.number().min(0).max(1),
  /** Percentage of required fields present (0-1) */
  completeness: z.number().min(0).max(1),
  /** Uncertainty range for numerical assessments */
  confidence_band: z.object({
    lower: z.number(),
    upper: z.number(),
  }).optional(),
  /** Overall confidence score (computed) */
  overall: z.number().min(0).max(1),
});

export type Confidence = z.infer<typeof ConfidenceSchema>;

/**
 * Constraints applied during decision making
 *
 * - policy_scope: Which policies were considered
 * - org_boundaries: Organizational scope of analysis
 * - time_window: Temporal scope of analysis
 */
export const ConstraintsAppliedSchema = z.object({
  /** Policies considered during analysis */
  policy_scope: z.array(z.string()).optional(),
  /** Organizational boundaries for the analysis */
  org_boundaries: z.object({
    organization_id: z.string(),
    team_ids: z.array(z.string()).optional(),
    user_ids: z.array(z.string()).optional(),
    teams: z.array(z.string()).optional(),
  }),
  /** Time window for the analysis */
  time_window: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).optional(),
  /** Additional compliance rules applied */
  compliance_rules: z.array(z.string()).optional(),
  /** Analysis scope configuration */
  analysis_scope: z.record(z.unknown()).optional(),
});

export type ConstraintsApplied = z.infer<typeof ConstraintsAppliedSchema>;

/**
 * Core DecisionEvent schema
 *
 * This is the MANDATORY output for every governance agent invocation.
 */
export const DecisionEventSchema = z.object({
  /** Unique identifier for this decision event */
  id: z.string().uuid(),
  /** Agent that produced this decision */
  agent_id: z.string(),
  /** Semantic version of the agent */
  agent_version: z.string().regex(/^\d+\.\d+\.\d+$/),
  /** Type of decision made */
  decision_type: DecisionTypeSchema,
  /** SHA-256 hash of the inputs for audit trail */
  inputs_hash: z.string(),
  /** Decision outputs (agent-specific structure) */
  outputs: z.record(z.unknown()),
  /** Confidence metrics for this decision */
  confidence: ConfidenceSchema,
  /** Constraints applied during analysis */
  constraints_applied: ConstraintsAppliedSchema,
  /** Reference to the originating execution (request ID, trace ID) */
  execution_ref: z.string(),
  /** UTC timestamp of decision */
  timestamp: z.string().datetime(),
  /** Telemetry metadata */
  telemetry: z.object({
    latency_ms: z.number(),
    memory_mb: z.number().optional(),
    source_system: z.string().optional(),
  }).optional(),
});

export type DecisionEvent = z.infer<typeof DecisionEventSchema>;

/**
 * Validate a DecisionEvent against the schema
 */
export function validateDecisionEvent(event: unknown): DecisionEvent {
  return DecisionEventSchema.parse(event);
}

/**
 * Safe validation that returns a result object
 */
export function safeValidateDecisionEvent(event: unknown): {
  success: boolean;
  data?: DecisionEvent;
  error?: z.ZodError;
} {
  const result = DecisionEventSchema.safeParse(event);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
