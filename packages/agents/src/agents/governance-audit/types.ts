/**
 * Governance Audit Agent Internal Types
 *
 * Internal types used by the Governance Audit Agent implementation.
 */

import type {
  AuditFinding,
  ComplianceStatus,
  PolicyCoverage,
} from '../../contracts/governance-audit.js';

// Re-export contract types
export type {
  GovernanceAuditInput,
  GovernanceAuditOutput,
  AuditFinding,
  AuditFindingSeverity,
  ComplianceStatus,
  PolicyCoverage,
  AuditCategory,
  DecisionTrailRecord,
  PolicySnapshot,
} from '../../contracts/governance-audit.js';

export {
  GOVERNANCE_AUDIT_AGENT_METADATA,
  validateGovernanceAuditInput,
  validateGovernanceAuditOutput,
  GovernanceAuditInputSchema,
  GovernanceAuditOutputSchema,
} from '../../contracts/governance-audit.js';

/**
 * Internal audit analysis state
 */
export interface AuditAnalysisState {
  totalDecisions: number;
  compliantDecisions: number;
  nonCompliantDecisions: number;
  pendingApprovals: number;
  categoryCounts: Map<string, { total: number; compliant: number }>;
}

/**
 * Compliance evaluation result
 */
export interface ComplianceEvaluationResult {
  statuses: ComplianceStatus[];
  overallCompliance: number;
}

/**
 * Coverage analysis result
 */
export interface CoverageAnalysisResult {
  coverages: PolicyCoverage[];
  overallCoverage: number;
}

/**
 * Finding detection result
 */
export interface FindingDetectionResult {
  findings: AuditFinding[];
  criticalCount: number;
  highCount: number;
}
