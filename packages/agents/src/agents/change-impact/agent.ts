/**
 * Change Impact Agent Implementation
 *
 * Governance analysis agent that assesses downstream governance and compliance impact
 * of configuration or policy changes.
 *
 * # Classification: GOVERNANCE ANALYSIS
 * # Decision Type: change_impact_assessment
 *
 * # Scope:
 * - Analyze historical changes
 * - Evaluate affected systems and policies
 * - Surface governance risk indicators
 *
 * # Critical Constraints:
 * - Does NOT enforce policies
 * - Does NOT modify execution behavior
 * - Does NOT block or approve changes
 * - Does NOT execute changes
 */

import type {
  GovernanceAgent,
  AgentMetadata,
  AgentContext,
  AgentResult,
} from '../../contracts/base-agent.js';
import type {
  ChangeImpactInput,
  ChangeImpactOutput,
  ChangeImpactAssessment,
  ImpactDetail,
  AffectedSystem,
  PolicyImplication,
  ComplianceImplication,
  RiskIndicator,
  ImpactRecommendation,
  HistoricalContext,
  ImpactLevel,
  RiskClassification,
  CostImplication,
} from '../../contracts/change-impact.js';
import {
  CHANGE_IMPACT_AGENT_METADATA,
  validateChangeImpactInput,
  validateChangeImpactOutput,
  impactLevelFromScore,
  riskClassificationFromScore,
} from '../../contracts/change-impact.js';
import { DecisionEventEmitter } from '../../infrastructure/decision-event-emitter.js';
import { TelemetryEmitter } from '../../infrastructure/telemetry.js';
import type { RuvectorClient } from '../../infrastructure/ruvector-client.js';
import { generateUUID } from '../../contracts/validation.js';
import type { PolicyImpactResult, DownstreamAnalysisResult } from './types.js';

/**
 * Change Impact Agent Configuration
 */
export interface ChangeImpactAgentConfig {
  /** RuVector client for persistence */
  ruvectorClient: RuvectorClient;
  /** Optional telemetry emitter */
  telemetryEmitter?: TelemetryEmitter;
  /** Dry-run mode (no persistence) */
  dryRun?: boolean;
  /** Default analysis depth (1-5) */
  defaultAnalysisDepth?: number;
}

/**
 * Change Impact Agent
 *
 * Assesses downstream governance and compliance impact of configuration
 * or policy changes. This agent ONLY performs read-only analysis.
 */
export class ChangeImpactAgent
  implements GovernanceAgent<ChangeImpactInput, ChangeImpactOutput>
{
  readonly metadata: AgentMetadata;
  private readonly decisionEventEmitter: DecisionEventEmitter;
  private readonly telemetry?: TelemetryEmitter;

  constructor(config: ChangeImpactAgentConfig) {
    this.metadata = {
      ...CHANGE_IMPACT_AGENT_METADATA,
      classification: 'GOVERNANCE_ANALYSIS',
    };

    this.decisionEventEmitter = new DecisionEventEmitter({
      ruvectorClient: config.ruvectorClient,
      agentId: this.metadata.agent_id,
      agentVersion: this.metadata.agent_version,
      dryRun: config.dryRun,
    });

    this.telemetry = config.telemetryEmitter;
    // Note: defaultAnalysisDepth can be used for future depth-based analysis
    // Currently stored in config for extensibility
  }

  /**
   * Execute the Change Impact Agent
   */
  async execute(
    input: ChangeImpactInput,
    context: AgentContext
  ): Promise<AgentResult<ChangeImpactOutput>> {
    const startTime = Date.now();

    // Emit telemetry start event
    this.telemetry?.emitInvocationStart(this.metadata, context);

    try {
      // Validate input
      const validatedInput = this.validateInput(input);

      // Perform impact analysis
      const assessment = await this.analyze(validatedInput);

      // Build output
      const output: ChangeImpactOutput = {
        assessment,
        telemetry_ref: `observatory://telemetry/${this.metadata.agent_id}/${assessment.id}`,
      };

      // Validate output
      const validatedOutput = this.validateOutput(output);

      // Calculate confidence
      const confidence = this.calculateConfidence(validatedInput, assessment);

      // Emit decision event
      const decisionEvent = await this.decisionEventEmitter.emit({
        decisionType: 'change_impact_assessment',
        input: validatedInput,
        outputs: {
          assessment_id: assessment.id,
          impact_level: assessment.impact_level,
          risk_score: assessment.risk_score,
          risk_classification: assessment.risk_classification,
          summary: assessment.summary,
          impacts_count: assessment.impacts.length,
          affected_systems_count: assessment.affected_systems.length,
          risk_indicators_count: assessment.risk_indicators.length,
          recommendations_count: assessment.recommendations.length,
        },
        confidence,
        constraintsApplied: {
          org_boundaries: {
            organization_id: validatedInput.organization_id,
            teams: validatedInput.scope?.teams,
          },
          analysis_scope: validatedInput.scope,
          time_window: validatedInput.historical_range ? {
            start: validatedInput.historical_range.start,
            end: validatedInput.historical_range.end,
          } : undefined,
        },
        executionRef: context.execution_ref,
        telemetry: {
          latency_ms: Date.now() - startTime,
          source_system: context.caller.service,
        },
      });

      // Emit telemetry success event
      this.telemetry?.emitInvocationSuccess(
        this.metadata,
        context,
        Date.now() - startTime,
        {
          impact_level: assessment.impact_level,
          risk_score: assessment.risk_score,
          risks_detected: assessment.risk_indicators.length,
        }
      );

      return {
        success: true,
        decision_event: decisionEvent,
        output: validatedOutput,
      };
    } catch (error: any) {
      // Emit telemetry failure event
      this.telemetry?.emitInvocationFailure(
        this.metadata,
        context,
        Date.now() - startTime,
        {
          code: error.code || 'AGENT_ERROR',
          message: error.message,
          details: error.details,
        }
      );

      // Still emit a decision event for audit trail
      const errorDecisionEvent = await this.decisionEventEmitter.emit({
        decisionType: 'change_impact_assessment',
        input,
        outputs: { error: { code: error.code, message: error.message } },
        confidence: { coverage: 0, completeness: 0, overall: 0 },
        constraintsApplied: {
          org_boundaries: {
            organization_id: (input as any)?.organization_id || 'unknown',
          },
        },
        executionRef: context.execution_ref,
        telemetry: {
          latency_ms: Date.now() - startTime,
        },
      });

      return {
        success: false,
        decision_event: errorDecisionEvent,
        output: {} as ChangeImpactOutput,
        error: {
          code: error.code || 'AGENT_ERROR',
          message: error.message,
          details: error.details,
        },
      };
    }
  }

  /**
   * Validate input against schema
   */
  validateInput(input: unknown): ChangeImpactInput {
    return validateChangeImpactInput(input);
  }

  /**
   * Validate output against schema
   */
  validateOutput(output: unknown): ChangeImpactOutput {
    return validateChangeImpactOutput(output);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    details?: Record<string, unknown>;
  }> {
    this.telemetry?.emitHealthCheck(this.metadata, true);
    return {
      healthy: true,
      details: {
        agent_id: this.metadata.agent_id,
        version: this.metadata.agent_version,
      },
    };
  }

  /**
   * Core analysis logic
   */
  private async analyze(input: ChangeImpactInput): Promise<ChangeImpactAssessment> {
    const assessmentId = generateUUID();
    const change = input.change_request;

    // Step 1: Analyze policy impacts
    const policyResult = this.analyzePolicyImpact(input);

    // Step 2: Analyze downstream systems
    const downstreamResult = this.analyzeDownstreamSystems(input);

    // Step 3: Analyze compliance implications
    const complianceImplications = this.analyzeComplianceImpact(input);

    // Step 4: Analyze cost implications (if requested)
    const costImplications = input.scope?.include_cost_impact
      ? this.analyzeCostImpact(input)
      : undefined;

    // Step 5: Calculate risk score
    const riskScore = this.calculateRiskScore(
      policyResult.impacts,
      policyResult.risks,
      policyResult.implications
    );

    // Step 6: Determine impact level and risk classification
    const impactLevel = impactLevelFromScore(riskScore);
    const riskClassification = riskClassificationFromScore(riskScore);

    // Step 7: Generate recommendations
    const recommendations = this.generateRecommendations(
      riskClassification,
      policyResult.risks,
      policyResult.implications
    );

    // Step 8: Build summary
    const summary = this.buildSummary(
      change,
      impactLevel,
      riskClassification,
      policyResult.impacts.length,
      downstreamResult.systems.length
    );

    // Step 9: Get historical context (if requested)
    const historicalContext = input.include_risk_projection
      ? this.getHistoricalContext(input)
      : undefined;

    return {
      id: assessmentId,
      change_request_id: change.change_id,
      impact_level: impactLevel,
      risk_score: riskScore,
      risk_classification: riskClassification,
      summary,
      impacts: policyResult.impacts,
      affected_systems: downstreamResult.systems,
      policy_implications: policyResult.implications,
      compliance_implications: complianceImplications,
      cost_implications: costImplications,
      risk_indicators: policyResult.risks,
      recommendations,
      historical_context: historicalContext,
      assessed_at: new Date().toISOString(),
    };
  }

  /**
   * Analyze policy-related impacts
   */
  private analyzePolicyImpact(input: ChangeImpactInput): PolicyImpactResult {
    const impacts: ImpactDetail[] = [];
    const implications: PolicyImplication[] = [];
    const risks: RiskIndicator[] = [];

    const { change_request } = input;

    // Analyze based on subject type
    switch (change_request.subject_type) {
      case 'policy':
      case 'policy_rule':
        impacts.push({
          area: 'policy_enforcement',
          level: 'moderate',
          description: `Direct modification to ${change_request.subject_type} may affect enforcement behavior`,
          affected_entities: [change_request.subject_id],
          metrics: undefined,
        });

        implications.push({
          policy_id: change_request.subject_id,
          policy_name: change_request.description,
          implication_type: 'scope_changed',
          description: 'Policy scope or rules may be affected by this change',
          affected_rules: [],
          policy_remains_valid: true,
        });

        risks.push({
          id: generateUUID(),
          category: 'compliance_risk',
          severity: 'medium',
          description: 'Policy modification may introduce compliance gaps',
          evidence: [
            `Change type: ${change_request.change_type}, Subject: ${change_request.subject_id}`,
          ],
          mitigation_suggestions: [
            'Review policy coverage after change',
            'Validate compliance requirements are still met',
          ],
        });
        break;

      case 'llm_model':
      case 'llm_provider':
        impacts.push({
          area: 'model_behavior',
          level: 'high',
          description: 'Model/provider change may affect output quality and cost',
          affected_entities: [change_request.subject_id],
          metrics: undefined,
        });

        risks.push({
          id: generateUUID(),
          category: 'operational_risk',
          severity: 'high',
          description: 'Model change may affect system behavior and output quality',
          evidence: [],
          mitigation_suggestions: [
            'Conduct A/B testing before full rollout',
            'Monitor output quality metrics post-change',
          ],
        });
        break;

      case 'budget':
      case 'quota':
        impacts.push({
          area: 'cost',
          level: 'moderate',
          description: 'Budget/quota change affects cost controls',
          affected_entities: [change_request.subject_id],
          metrics: undefined,
        });

        risks.push({
          id: generateUUID(),
          category: 'financial_risk',
          severity: 'medium',
          description: 'Financial controls may be weakened or strengthened',
          evidence: [],
          mitigation_suggestions: [
            'Review budget allocation impact',
            'Set up alerts for cost anomalies',
          ],
        });
        break;

      case 'access_control':
      case 'user':
      case 'team':
        impacts.push({
          area: 'access_control',
          level: 'high',
          description: 'Access control change affects security posture',
          affected_entities: [change_request.subject_id],
          metrics: undefined,
        });

        risks.push({
          id: generateUUID(),
          category: 'security_risk',
          severity: 'high',
          description: 'Access changes may create security vulnerabilities',
          evidence: [],
          mitigation_suggestions: [
            'Audit access changes with security team',
            'Apply principle of least privilege',
          ],
        });
        break;

      default:
        impacts.push({
          area: 'data_governance',
          level: 'low',
          description: 'Configuration change with limited governance impact',
          affected_entities: [change_request.subject_id],
          metrics: undefined,
        });
    }

    return { impacts, implications, risks };
  }

  /**
   * Analyze affected downstream systems
   */
  private analyzeDownstreamSystems(input: ChangeImpactInput): DownstreamAnalysisResult {
    const systems: AffectedSystem[] = [];
    const { change_request } = input;

    switch (change_request.subject_type) {
      case 'policy':
        systems.push({
          system_id: 'policy-engine',
          system_name: 'LLM-Policy-Engine',
          system_type: 'enforcement',
          impact_description: 'Policy evaluations may change',
          severity: 'medium',
          dependencies: [change_request.subject_id],
        });
        break;

      case 'llm_model':
      case 'llm_provider':
        systems.push({
          system_id: 'registry',
          system_name: 'LLM-Registry',
          system_type: 'model-management',
          impact_description: 'Model routing may be affected',
          severity: 'high',
          dependencies: [change_request.subject_id],
        });
        systems.push({
          system_id: 'cost-ops',
          system_name: 'LLM-CostOps',
          system_type: 'cost-management',
          impact_description: 'Cost tracking affected by model change',
          severity: 'medium',
          dependencies: [],
        });
        break;

      case 'budget':
      case 'quota':
        systems.push({
          system_id: 'cost-ops',
          system_name: 'LLM-CostOps',
          system_type: 'cost-management',
          impact_description: 'Budget/quota controls affected',
          severity: 'medium',
          dependencies: [change_request.subject_id],
        });
        break;
    }

    return {
      systems,
      dependencyChain: systems.map((s) => s.system_id),
      cascadeRisk: systems.length > 2 ? 0.7 : 0.3,
    };
  }

  /**
   * Analyze compliance implications
   */
  private analyzeComplianceImpact(input: ChangeImpactInput): ComplianceImplication[] {
    const implications: ComplianceImplication[] = [];
    const { change_request } = input;

    switch (change_request.subject_type) {
      case 'policy':
      case 'policy_rule':
        implications.push({
          framework: 'Internal Governance',
          requirement_id: 'GOV-001',
          requirement_description: 'All policy changes must be audited',
          current_status: 'compliant',
          projected_status: 'requires_review',
          gap_description: 'Policy modification requires compliance review',
        });
        break;

      case 'access_control':
        implications.push({
          framework: 'Access Control',
          requirement_id: 'AC-002',
          requirement_description: 'Access changes must follow approval workflow',
          current_status: 'compliant',
          projected_status: 'requires_review',
          gap_description: 'Access modification requires security review',
        });
        break;
    }

    return implications;
  }

  /**
   * Analyze cost implications
   */
  private analyzeCostImpact(input: ChangeImpactInput): CostImplication {
    const { change_request } = input;

    // Base estimation
    let estimatedDelta = 0;
    let confidence = 0.6;

    switch (change_request.change_type) {
      case 'create':
        estimatedDelta = 100; // Rough estimate
        break;
      case 'delete':
        estimatedDelta = -50;
        break;
      case 'budget_adjust':
        estimatedDelta = 0;
        confidence = 0.3; // Lower confidence for budget changes
        break;
    }

    return {
      estimated_delta: estimatedDelta,
      currency: 'USD',
      period: 'monthly',
      confidence,
      breakdown: [],
      budget_alerts_triggered: [],
    };
  }

  /**
   * Calculate overall risk score
   */
  private calculateRiskScore(
    impacts: ImpactDetail[],
    risks: RiskIndicator[],
    implications: PolicyImplication[]
  ): number {
    let score = 0;
    let weightSum = 0;

    // Impact contribution
    for (const impact of impacts) {
      const impactWeight: Record<ImpactLevel, number> = {
        none: 0,
        minimal: 0.1,
        low: 0.2,
        moderate: 0.4,
        high: 0.7,
        critical: 1.0,
      };
      score += (impactWeight[impact.level] ?? 0) * 0.4;
      weightSum += 0.4;
    }

    // Risk indicator contribution
    for (const risk of risks) {
      const severityWeight: Record<string, number> = {
        info: 0.1,
        low: 0.2,
        medium: 0.4,
        high: 0.7,
        critical: 1.0,
      };
      score += (severityWeight[risk.severity] ?? 0) * 0.4;
      weightSum += 0.4;
    }

    // Policy implication contribution
    for (const impl of implications) {
      const implWeight: Record<string, number> = {
        no_impact: 0,
        scope_changed: 0.3,
        effectiveness_reduced: 0.5,
        coverage_gap: 0.6,
        rules_violated: 0.8,
        conflict_introduced: 0.9,
        redundancy_created: 0.2,
      };
      score += (implWeight[impl.implication_type] ?? 0) * 0.2;
      weightSum += 0.2;
    }

    return weightSum > 0 ? Math.min(score / weightSum, 1.0) : 0;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    riskClassification: RiskClassification,
    risks: RiskIndicator[],
    _implications: PolicyImplication[]
  ): ImpactRecommendation[] {
    const recommendations: ImpactRecommendation[] = [];

    switch (riskClassification) {
      case 'critical_risk':
      case 'unacceptable':
        recommendations.push({
          id: generateUUID(),
          priority: 'critical',
          recommendation_type: 'approval_required',
          recommendation: 'Executive approval required before proceeding',
          rationale: 'Critical risk level detected',
          related_risks: risks.map((r) => r.id),
        });
        recommendations.push({
          id: generateUUID(),
          priority: 'critical',
          recommendation_type: 'rollback_plan',
          recommendation: 'Detailed rollback plan required',
          rationale: 'High impact change requires recovery strategy',
          related_risks: [],
        });
        break;

      case 'high_risk':
        recommendations.push({
          id: generateUUID(),
          priority: 'high',
          recommendation_type: 'review_required',
          recommendation: 'Security and compliance review required',
          rationale: 'High risk level requires enhanced review',
          related_risks: risks.map((r) => r.id),
        });
        recommendations.push({
          id: generateUUID(),
          priority: 'high',
          recommendation_type: 'staged_rollout',
          recommendation: 'Implement staged rollout',
          rationale: 'Gradual deployment reduces risk',
          related_risks: [],
        });
        break;

      case 'medium_risk':
        recommendations.push({
          id: generateUUID(),
          priority: 'medium',
          recommendation_type: 'testing_recommended',
          recommendation: 'Comprehensive testing recommended',
          rationale: 'Medium risk warrants additional validation',
          related_risks: [],
        });
        recommendations.push({
          id: generateUUID(),
          priority: 'medium',
          recommendation_type: 'monitoring_enhancement',
          recommendation: 'Enhanced monitoring post-deployment',
          rationale: 'Track impact metrics after change',
          related_risks: [],
        });
        break;

      default:
        recommendations.push({
          id: generateUUID(),
          priority: 'low',
          recommendation_type: 'documentation_update',
          recommendation: 'Update documentation to reflect change',
          rationale: 'Standard change management practice',
          related_risks: [],
        });
    }

    return recommendations;
  }

  /**
   * Build human-readable summary
   */
  private buildSummary(
    change: ChangeImpactInput['change_request'],
    impactLevel: ImpactLevel,
    riskClassification: RiskClassification,
    impactCount: number,
    affectedSystemsCount: number
  ): string {
    return (
      `Change Impact Assessment for ${change.change_type} on ${change.subject_type} ` +
      `'${change.subject_id}': Impact Level: ${impactLevel}, Risk Classification: ${riskClassification}. ` +
      `Identified ${impactCount} impact areas affecting ${affectedSystemsCount} downstream systems.`
    );
  }

  /**
   * Get historical context for similar changes
   */
  private getHistoricalContext(_input: ChangeImpactInput): HistoricalContext {
    // Placeholder - in production, this would query ruvector-service
    return {
      similar_changes_count: 0,
      average_outcome: 'insufficient_data',
      common_issues: [],
      success_patterns: ['Staged rollout', 'Pre-change testing'],
      change_refs: [],
    };
  }

  /**
   * Calculate confidence metrics for the analysis
   */
  private calculateConfidence(
    input: ChangeImpactInput,
    assessment: ChangeImpactAssessment
  ): { coverage: number; completeness: number; overall: number } {
    // Coverage based on scope analysis
    let coverage = 0.5;
    if (input.include_downstream) coverage += 0.15;
    if (input.scope?.include_cost_impact) coverage += 0.1;
    if (input.scope?.include_compliance_impact) coverage += 0.1;
    if (assessment.historical_context) coverage += 0.15;

    // Completeness based on output
    let completeness = 0.5;
    if (assessment.impacts.length > 0) completeness += 0.15;
    if (assessment.affected_systems.length > 0) completeness += 0.15;
    if (assessment.risk_indicators.length > 0) completeness += 0.1;
    if (assessment.recommendations.length > 0) completeness += 0.1;

    const overall = DecisionEventEmitter.calculateOverallConfidence(
      Math.min(coverage, 1.0),
      Math.min(completeness, 1.0)
    );

    return {
      coverage: Math.min(coverage, 1.0),
      completeness: Math.min(completeness, 1.0),
      overall,
    };
  }
}
