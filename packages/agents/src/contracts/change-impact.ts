/**
 * Change Impact Agent Contract
 *
 * Defines the input/output contracts and validation for the Change Impact Agent.
 *
 * # Classification: GOVERNANCE ANALYSIS
 *
 * # Decision Type: change_impact_assessment
 *
 * # Scope:
 * - Analyze historical changes
 * - Evaluate affected systems and policies
 * - Surface governance risk indicators
 *
 * # Critical Constraints (from Prompt 0):
 * - This agent does NOT enforce policies
 * - This agent does NOT modify execution behavior
 * - This agent does NOT block or approve changes
 * - This agent does NOT execute changes
 */

import { z } from 'zod';
import type { AgentMetadata } from './base-agent.js';

// ============================================================================
// Agent Metadata
// ============================================================================

export const CHANGE_IMPACT_AGENT_METADATA: AgentMetadata = {
  agent_id: 'change-impact-agent',
  agent_version: '1.0.0',
  decision_type: 'change_impact_assessment',
  classification: 'GOVERNANCE_ANALYSIS',
  description:
    'Assesses downstream governance and compliance impact of configuration or policy changes',
  capabilities: [
    'historical_change_analysis',
    'affected_system_evaluation',
    'policy_impact_assessment',
    'risk_indicator_surfacing',
    'compliance_impact_projection',
    'cost_impact_estimation',
  ],
  restrictions: [
    'does_not_enforce_policies',
    'does_not_modify_execution',
    'does_not_block_changes',
    'does_not_execute_changes',
    'read_only_analysis',
  ],
  consumers: [
    'Governance dashboards',
    'Change management systems',
    'Risk assessment tools',
    'Audit systems',
  ],
};

// ============================================================================
// Change Type Enums
// ============================================================================

export const ChangeTypeSchema = z.enum([
  'create',
  'update',
  'delete',
  'toggle',
  'configure',
  'policy_modify',
  'access_change',
  'model_version',
  'budget_adjust',
  'quota_modify',
]);

export type ChangeType = z.infer<typeof ChangeTypeSchema>;

export const ChangeSubjectTypeSchema = z.enum([
  'policy',
  'policy_rule',
  'configuration',
  'llm_model',
  'llm_provider',
  'budget',
  'quota',
  'access_control',
  'team',
  'user',
  'organization',
  'integration',
  'webhook',
]);

export type ChangeSubjectType = z.infer<typeof ChangeSubjectTypeSchema>;

// ============================================================================
// Input Schemas
// ============================================================================

export const ChangeRequestSchema = z.object({
  change_id: z.string().min(1),
  change_type: ChangeTypeSchema,
  subject_type: ChangeSubjectTypeSchema,
  subject_id: z.string().min(1),
  description: z.string(),
  timestamp: z.string().datetime(),
  initiator: z.string(),
  previous_state: z.unknown().optional(),
  new_state: z.unknown().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ChangeRequest = z.infer<typeof ChangeRequestSchema>;

export const ChangeImpactScopeSchema = z.object({
  teams: z.array(z.string()).optional(),
  users: z.array(z.string()).optional(),
  policy_types: z.array(z.string()).optional(),
  resource_types: z.array(ChangeSubjectTypeSchema).optional(),
  analysis_depth: z.number().min(1).max(5).optional(),
  include_cost_impact: z.boolean().optional(),
  include_compliance_impact: z.boolean().optional(),
});

export type ChangeImpactScope = z.infer<typeof ChangeImpactScopeSchema>;

export const DateRangeSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
});

export type DateRange = z.infer<typeof DateRangeSchema>;

export const ChangeImpactInputSchema = z.object({
  organization_id: z.string().min(1),
  change_request: ChangeRequestSchema,
  scope: ChangeImpactScopeSchema.optional(),
  historical_range: DateRangeSchema.optional(),
  include_downstream: z.boolean().optional(),
  include_risk_projection: z.boolean().optional(),
  baseline_ref: z.string().optional(),
});

export type ChangeImpactInput = z.infer<typeof ChangeImpactInputSchema>;

// ============================================================================
// Output Schemas
// ============================================================================

export const ImpactLevelSchema = z.enum([
  'none',
  'minimal',
  'low',
  'moderate',
  'high',
  'critical',
]);

export type ImpactLevel = z.infer<typeof ImpactLevelSchema>;

export const RiskClassificationSchema = z.enum([
  'acceptable',
  'low_risk',
  'medium_risk',
  'high_risk',
  'critical_risk',
  'unacceptable',
]);

export type RiskClassification = z.infer<typeof RiskClassificationSchema>;

export const ImpactAreaSchema = z.enum([
  'policy_enforcement',
  'compliance',
  'cost',
  'performance',
  'security',
  'availability',
  'user_experience',
  'data_governance',
  'audit_trail',
  'access_control',
  'rate_limiting',
  'model_behavior',
]);

export type ImpactArea = z.infer<typeof ImpactAreaSchema>;

export const GovernanceSeveritySchema = z.enum([
  'info',
  'low',
  'medium',
  'high',
  'critical',
]);

export type GovernanceSeverity = z.infer<typeof GovernanceSeveritySchema>;

export const ImpactDetailSchema = z.object({
  area: ImpactAreaSchema,
  level: ImpactLevelSchema,
  description: z.string(),
  affected_entities: z.array(z.string()),
  metrics: z.record(z.string(), z.number()).optional(),
});

export type ImpactDetail = z.infer<typeof ImpactDetailSchema>;

export const AffectedSystemSchema = z.object({
  system_id: z.string(),
  system_name: z.string(),
  system_type: z.string(),
  impact_description: z.string(),
  severity: GovernanceSeveritySchema,
  dependencies: z.array(z.string()),
});

export type AffectedSystem = z.infer<typeof AffectedSystemSchema>;

export const PolicyImplicationTypeSchema = z.enum([
  'effectiveness_reduced',
  'rules_violated',
  'scope_changed',
  'redundancy_created',
  'conflict_introduced',
  'coverage_gap',
  'no_impact',
]);

export type PolicyImplicationType = z.infer<typeof PolicyImplicationTypeSchema>;

export const PolicyImplicationSchema = z.object({
  policy_id: z.string(),
  policy_name: z.string(),
  implication_type: PolicyImplicationTypeSchema,
  description: z.string(),
  affected_rules: z.array(z.string()),
  policy_remains_valid: z.boolean(),
});

export type PolicyImplication = z.infer<typeof PolicyImplicationSchema>;

export const ComplianceImpactStatusSchema = z.enum([
  'compliant',
  'partially_compliant',
  'non_compliant',
  'not_applicable',
  'requires_review',
]);

export type ComplianceImpactStatus = z.infer<typeof ComplianceImpactStatusSchema>;

export const ComplianceImplicationSchema = z.object({
  framework: z.string(),
  requirement_id: z.string(),
  requirement_description: z.string(),
  current_status: ComplianceImpactStatusSchema,
  projected_status: ComplianceImpactStatusSchema,
  gap_description: z.string().optional(),
});

export type ComplianceImplication = z.infer<typeof ComplianceImplicationSchema>;

export const CostBreakdownItemSchema = z.object({
  category: z.string(),
  current_cost: z.number(),
  projected_cost: z.number(),
  delta: z.number(),
});

export type CostBreakdownItem = z.infer<typeof CostBreakdownItemSchema>;

export const CostImplicationSchema = z.object({
  estimated_delta: z.number(),
  currency: z.string(),
  period: z.string(),
  confidence: z.number().min(0).max(1),
  breakdown: z.array(CostBreakdownItemSchema),
  budget_alerts_triggered: z.array(z.string()),
});

export type CostImplication = z.infer<typeof CostImplicationSchema>;

export const RiskIndicatorCategorySchema = z.enum([
  'security_risk',
  'compliance_risk',
  'operational_risk',
  'financial_risk',
  'reputational_risk',
  'dependency_risk',
  'configuration_risk',
  'access_risk',
]);

export type RiskIndicatorCategory = z.infer<typeof RiskIndicatorCategorySchema>;

export const RiskIndicatorSchema = z.object({
  id: z.string(),
  category: RiskIndicatorCategorySchema,
  severity: GovernanceSeveritySchema,
  description: z.string(),
  evidence: z.array(z.string()),
  mitigation_suggestions: z.array(z.string()),
});

export type RiskIndicator = z.infer<typeof RiskIndicatorSchema>;

export const RecommendationPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export type RecommendationPriority = z.infer<typeof RecommendationPrioritySchema>;

export const RecommendationTypeSchema = z.enum([
  'review_required',
  'approval_required',
  'testing_recommended',
  'staged_rollout',
  'documentation_update',
  'monitoring_enhancement',
  'rollback_plan',
  'stakeholder_notification',
]);

export type RecommendationType = z.infer<typeof RecommendationTypeSchema>;

export const ImpactRecommendationSchema = z.object({
  id: z.string(),
  priority: RecommendationPrioritySchema,
  recommendation_type: RecommendationTypeSchema,
  recommendation: z.string(),
  rationale: z.string(),
  related_risks: z.array(z.string()),
});

export type ImpactRecommendation = z.infer<typeof ImpactRecommendationSchema>;

export const HistoricalOutcomeSchema = z.enum([
  'successful',
  'partially_successful',
  'required_rollback',
  'caused_incident',
  'insufficient_data',
]);

export type HistoricalOutcome = z.infer<typeof HistoricalOutcomeSchema>;

export const DataReferenceSchema = z.object({
  ref_type: z.string(),
  source_system: z.string(),
  ref_id: z.string(),
  ref_timestamp: z.string(),
});

export type DataReference = z.infer<typeof DataReferenceSchema>;

export const HistoricalContextSchema = z.object({
  similar_changes_count: z.number(),
  average_outcome: HistoricalOutcomeSchema,
  common_issues: z.array(z.string()),
  success_patterns: z.array(z.string()),
  change_refs: z.array(DataReferenceSchema),
});

export type HistoricalContext = z.infer<typeof HistoricalContextSchema>;

export const ChangeImpactAssessmentSchema = z.object({
  id: z.string(),
  change_request_id: z.string(),
  impact_level: ImpactLevelSchema,
  risk_score: z.number().min(0).max(1),
  risk_classification: RiskClassificationSchema,
  summary: z.string(),
  impacts: z.array(ImpactDetailSchema),
  affected_systems: z.array(AffectedSystemSchema),
  policy_implications: z.array(PolicyImplicationSchema),
  compliance_implications: z.array(ComplianceImplicationSchema),
  cost_implications: CostImplicationSchema.optional(),
  risk_indicators: z.array(RiskIndicatorSchema),
  recommendations: z.array(ImpactRecommendationSchema),
  historical_context: HistoricalContextSchema.optional(),
  assessed_at: z.string().datetime(),
});

export type ChangeImpactAssessment = z.infer<typeof ChangeImpactAssessmentSchema>;

export const ChangeImpactOutputSchema = z.object({
  assessment: ChangeImpactAssessmentSchema,
  telemetry_ref: z.string(),
});

export type ChangeImpactOutput = z.infer<typeof ChangeImpactOutputSchema>;

// ============================================================================
// Validation Functions
// ============================================================================

export function validateChangeImpactInput(input: unknown): ChangeImpactInput {
  return ChangeImpactInputSchema.parse(input);
}

export function validateChangeImpactOutput(output: unknown): ChangeImpactOutput {
  return ChangeImpactOutputSchema.parse(output);
}

// ============================================================================
// Helper Functions
// ============================================================================

export function impactLevelFromScore(score: number): ImpactLevel {
  if (score < 0.1) return 'none';
  if (score < 0.25) return 'minimal';
  if (score < 0.4) return 'low';
  if (score < 0.6) return 'moderate';
  if (score < 0.8) return 'high';
  return 'critical';
}

export function riskClassificationFromScore(score: number): RiskClassification {
  if (score < 0.15) return 'acceptable';
  if (score < 0.3) return 'low_risk';
  if (score < 0.5) return 'medium_risk';
  if (score < 0.7) return 'high_risk';
  if (score < 0.85) return 'critical_risk';
  return 'unacceptable';
}
