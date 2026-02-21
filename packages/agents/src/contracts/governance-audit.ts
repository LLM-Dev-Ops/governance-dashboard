/**
 * Governance Audit Agent Contract
 *
 * Classification: GOVERNANCE_AUDIT
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

import { z } from 'zod';
import type { AgentMetadata } from './base-agent.js';

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

/**
 * Audit category types
 */
export const AuditCategorySchema = z.enum([
  'policy_compliance',
  'access_control',
  'cost_governance',
  'model_usage',
  'data_governance',
  'change_management',
  'approval_trails',
]);

export type AuditCategory = z.infer<typeof AuditCategorySchema>;

/**
 * Decision trail record from upstream systems
 */
export const DecisionTrailRecordSchema = z.object({
  /** Decision event reference */
  decision_event_id: z.string(),
  /** Agent that produced the decision */
  agent_id: z.string(),
  /** Decision type */
  decision_type: z.string(),
  /** Organization context */
  organization_id: z.string(),
  /** Timestamp of the decision */
  timestamp: z.string().datetime(),
  /** Whether the decision had required approvals */
  approval_status: z.enum(['approved', 'pending', 'rejected', 'not_required']),
  /** Compliance status at time of decision */
  compliance_status: z.enum(['compliant', 'non_compliant', 'unknown']),
  /** Optional metadata */
  metadata: z.record(z.unknown()).optional(),
});

export type DecisionTrailRecord = z.infer<typeof DecisionTrailRecordSchema>;

/**
 * Policy snapshot for audit evaluation
 */
export const PolicySnapshotSchema = z.object({
  /** Policy identifier */
  policy_id: z.string(),
  /** Policy name */
  policy_name: z.string(),
  /** Whether the policy is currently active */
  is_active: z.boolean(),
  /** Number of rules in this policy */
  rule_count: z.number().int().min(0),
  /** Scope of the policy */
  scope: z.enum(['organization', 'team', 'user', 'global']),
  /** Last modified timestamp */
  last_modified: z.string().datetime(),
  /** Categories this policy covers */
  categories: z.array(AuditCategorySchema),
});

export type PolicySnapshot = z.infer<typeof PolicySnapshotSchema>;

/**
 * Input schema for Governance Audit Agent
 */
export const GovernanceAuditInputSchema = z.object({
  /** Request identifier for tracing */
  request_id: z.string(),
  /** Organization to audit */
  organization_id: z.string(),
  /** Time range for audit */
  time_range: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  /** Audit scope configuration */
  audit_scope: z.object({
    /** Categories to audit */
    categories: z.array(AuditCategorySchema),
    /** Include compliance evaluation */
    include_compliance: z.boolean(),
    /** Include policy coverage analysis */
    include_policy_coverage: z.boolean(),
  }),
  /** Decision trail records to audit */
  decision_trails: z.array(DecisionTrailRecordSchema),
  /** Current policy snapshots */
  policy_snapshots: z.array(PolicySnapshotSchema),
  /** Optional filters */
  filters: z.object({
    team_ids: z.array(z.string()).optional(),
    agent_ids: z.array(z.string()).optional(),
    decision_types: z.array(z.string()).optional(),
  }).optional(),
});

export type GovernanceAuditInput = z.infer<typeof GovernanceAuditInputSchema>;

// ============================================================================
// OUTPUT SCHEMAS
// ============================================================================

/**
 * Audit finding severity
 */
export const AuditFindingSeveritySchema = z.enum([
  'info',
  'low',
  'medium',
  'high',
  'critical',
]);

export type AuditFindingSeverity = z.infer<typeof AuditFindingSeveritySchema>;

/**
 * Individual audit finding
 */
export const AuditFindingSchema = z.object({
  /** Finding identifier */
  finding_id: z.string(),
  /** Audit category */
  category: AuditCategorySchema,
  /** Severity of the finding */
  severity: AuditFindingSeveritySchema,
  /** Human-readable title */
  title: z.string(),
  /** Detailed description */
  description: z.string(),
  /** Affected entities */
  affected_entities: z.array(z.string()),
  /** Evidence supporting the finding */
  evidence: z.array(z.string()),
  /** Remediation suggestions */
  remediation: z.array(z.string()),
});

export type AuditFinding = z.infer<typeof AuditFindingSchema>;

/**
 * Compliance status for a category
 */
export const ComplianceStatusSchema = z.object({
  /** Audit category */
  category: AuditCategorySchema,
  /** Overall status */
  status: z.enum(['compliant', 'partially_compliant', 'non_compliant', 'not_evaluated']),
  /** Compliance percentage (0-100) */
  compliance_percentage: z.number().min(0).max(100),
  /** Total items evaluated */
  total_evaluated: z.number().int().min(0),
  /** Items found compliant */
  compliant_count: z.number().int().min(0),
  /** Items found non-compliant */
  non_compliant_count: z.number().int().min(0),
});

export type ComplianceStatus = z.infer<typeof ComplianceStatusSchema>;

/**
 * Policy coverage analysis
 */
export const PolicyCoverageSchema = z.object({
  /** Audit category */
  category: AuditCategorySchema,
  /** Number of policies covering this category */
  policies_count: z.number().int().min(0),
  /** Total rules across policies */
  rules_count: z.number().int().min(0),
  /** Coverage level */
  coverage_level: z.enum(['none', 'partial', 'adequate', 'comprehensive']),
  /** Identified gaps */
  gaps: z.array(z.string()),
});

export type PolicyCoverage = z.infer<typeof PolicyCoverageSchema>;

/**
 * Output schema for Governance Audit Agent
 *
 * decision_type: "audit_summary"
 */
export const GovernanceAuditOutputSchema = z.object({
  /** Audit findings */
  audit_findings: z.array(AuditFindingSchema),
  /** Compliance status by category */
  compliance_status: z.array(ComplianceStatusSchema),
  /** Policy coverage by category */
  policy_coverage: z.array(PolicyCoverageSchema),
  /** Overall audit score (0-100) */
  audit_score: z.number().min(0).max(100),
  /** Total decisions audited */
  total_decisions_audited: z.number().int().min(0),
  /** Total policies evaluated */
  total_policies_evaluated: z.number().int().min(0),
  /** Recommendations for governance improvement */
  recommendations: z.array(z.object({
    recommendation_id: z.string(),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    category: AuditCategorySchema,
    description: z.string(),
    action_items: z.array(z.string()),
  })),
});

export type GovernanceAuditOutput = z.infer<typeof GovernanceAuditOutputSchema>;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export function validateGovernanceAuditInput(input: unknown): GovernanceAuditInput {
  return GovernanceAuditInputSchema.parse(input);
}

export function validateGovernanceAuditOutput(output: unknown): GovernanceAuditOutput {
  return GovernanceAuditOutputSchema.parse(output);
}

// ============================================================================
// AGENT METADATA
// ============================================================================

export const GOVERNANCE_AUDIT_AGENT_METADATA: AgentMetadata = {
  agent_id: 'governance-audit-agent',
  agent_version: '1.0.0',
  classification: 'GOVERNANCE_AUDIT',
  decision_type: 'audit_summary',
  description: 'Provides audit and compliance visibility across governance policies, decision trails, and organizational adherence',
  capabilities: [
    'aggregate_audit_signals',
    'evaluate_compliance_status',
    'measure_policy_coverage',
    'produce_audit_scores',
    'generate_compliance_recommendations',
  ],
  restrictions: [
    'does_not_enforce_policies',
    'does_not_modify_configurations',
    'does_not_approve_or_reject',
    'does_not_connect_to_sql',
    'read_only_analysis',
  ],
  consumers: [
    'Governance & compliance dashboards',
    'Audit reporting systems',
    'Management reporting',
    'Regulatory compliance tools',
  ],
};
