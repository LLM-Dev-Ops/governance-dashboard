/**
 * Governance Audit Agent Implementation
 *
 * Core agent logic for governance audit and compliance visibility.
 */

import type {
  GovernanceAgent,
  AgentMetadata,
  AgentContext,
  AgentResult,
} from '../../contracts/base-agent.js';
import type {
  GovernanceAuditInput,
  GovernanceAuditOutput,
  AuditFinding,
  ComplianceStatus,
  PolicyCoverage,
  DecisionTrailRecord,
  AuditCategory,
} from '../../contracts/governance-audit.js';
import {
  GOVERNANCE_AUDIT_AGENT_METADATA,
  validateGovernanceAuditInput,
  validateGovernanceAuditOutput,
} from '../../contracts/governance-audit.js';
import { DecisionEventEmitter } from '../../infrastructure/decision-event-emitter.js';
import { TelemetryEmitter } from '../../infrastructure/telemetry.js';
import type { RuvectorClient } from '../../infrastructure/ruvector-client.js';
import { generateUUID } from '../../contracts/validation.js';
import type {
  AuditAnalysisState,
  ComplianceEvaluationResult,
  CoverageAnalysisResult,
  FindingDetectionResult,
} from './types.js';

/**
 * Governance Audit Agent Configuration
 */
export interface GovernanceAuditAgentConfig {
  /** RuVector client for persistence */
  ruvectorClient: RuvectorClient;
  /** Optional telemetry emitter */
  telemetryEmitter?: TelemetryEmitter;
  /** Dry-run mode (no persistence) */
  dryRun?: boolean;
}

/**
 * Governance Audit Agent
 *
 * Analyzes governance decision trails and policy state to produce
 * audit summaries and compliance visibility.
 */
export class GovernanceAuditAgent
  implements GovernanceAgent<GovernanceAuditInput, GovernanceAuditOutput>
{
  readonly metadata: AgentMetadata;
  private readonly decisionEventEmitter: DecisionEventEmitter;
  private readonly telemetry?: TelemetryEmitter;

  constructor(config: GovernanceAuditAgentConfig) {
    this.metadata = {
      ...GOVERNANCE_AUDIT_AGENT_METADATA,
    };

    this.decisionEventEmitter = new DecisionEventEmitter({
      ruvectorClient: config.ruvectorClient,
      agentId: this.metadata.agent_id,
      agentVersion: this.metadata.agent_version,
      dryRun: config.dryRun,
    });

    this.telemetry = config.telemetryEmitter;
  }

  /**
   * Execute the Governance Audit Agent
   */
  async execute(
    input: GovernanceAuditInput,
    context: AgentContext
  ): Promise<AgentResult<GovernanceAuditOutput>> {
    const startTime = Date.now();

    this.telemetry?.emitInvocationStart(this.metadata, context);

    try {
      const validatedInput = this.validateInput(input);

      const output = await this.analyze(validatedInput);

      const validatedOutput = this.validateOutput(output);

      const confidence = this.calculateConfidence(validatedInput, validatedOutput);

      const decisionEvent = await this.decisionEventEmitter.emit({
        decisionType: 'audit_summary',
        input: validatedInput,
        outputs: validatedOutput as unknown as Record<string, unknown>,
        confidence,
        constraintsApplied: {
          policy_scope: validatedInput.policy_snapshots.map((p) => p.policy_id),
          org_boundaries: {
            organization_id: validatedInput.organization_id,
            team_ids: validatedInput.filters?.team_ids,
          },
          time_window: validatedInput.time_range,
        },
        executionRef: context.execution_ref,
        telemetry: {
          latency_ms: Date.now() - startTime,
          source_system: context.caller.service,
        },
      });

      this.telemetry?.emitInvocationSuccess(
        this.metadata,
        context,
        Date.now() - startTime,
        {
          findings_count: validatedOutput.audit_findings.length,
          audit_score: validatedOutput.audit_score,
        }
      );

      return {
        success: true,
        decision_event: decisionEvent,
        output: validatedOutput,
      };
    } catch (error: any) {
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

      const errorDecisionEvent = await this.decisionEventEmitter.emit({
        decisionType: 'audit_summary',
        input,
        outputs: { error: { code: error.code, message: error.message } },
        confidence: { coverage: 0, completeness: 0, overall: 0 },
        constraintsApplied: {
          policy_scope: [],
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
        output: {} as GovernanceAuditOutput,
        error: {
          code: error.code || 'AGENT_ERROR',
          message: error.message,
          details: error.details,
        },
      };
    }
  }

  validateInput(input: unknown): GovernanceAuditInput {
    return validateGovernanceAuditInput(input);
  }

  validateOutput(output: unknown): GovernanceAuditOutput {
    return validateGovernanceAuditOutput(output);
  }

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
  private async analyze(input: GovernanceAuditInput): Promise<GovernanceAuditOutput> {
    // Step 1: Build analysis state from decision trails
    const state = this.buildAnalysisState(input.decision_trails, input.audit_scope.categories);

    // Step 2: Detect audit findings
    const findingResult = this.detectFindings(input, state);

    // Step 3: Evaluate compliance
    const complianceResult = input.audit_scope.include_compliance
      ? this.evaluateCompliance(input, state)
      : { statuses: [], overallCompliance: 100 };

    // Step 4: Analyze policy coverage
    const coverageResult = input.audit_scope.include_policy_coverage
      ? this.analyzePolicyCoverage(input)
      : { coverages: [], overallCoverage: 100 };

    // Step 5: Calculate audit score
    const auditScore = this.calculateAuditScore(
      findingResult,
      complianceResult,
      coverageResult
    );

    // Step 6: Generate recommendations
    const recommendations = this.generateRecommendations(
      findingResult,
      complianceResult,
      coverageResult,
      auditScore
    );

    return {
      audit_findings: findingResult.findings,
      compliance_status: complianceResult.statuses,
      policy_coverage: coverageResult.coverages,
      audit_score: auditScore,
      total_decisions_audited: state.totalDecisions,
      total_policies_evaluated: input.policy_snapshots.length,
      recommendations,
    };
  }

  private buildAnalysisState(
    trails: DecisionTrailRecord[],
    categories: AuditCategory[]
  ): AuditAnalysisState {
    const state: AuditAnalysisState = {
      totalDecisions: trails.length,
      compliantDecisions: 0,
      nonCompliantDecisions: 0,
      pendingApprovals: 0,
      categoryCounts: new Map(),
    };

    for (const category of categories) {
      state.categoryCounts.set(category, { total: 0, compliant: 0 });
    }

    for (const trail of trails) {
      if (trail.compliance_status === 'compliant') {
        state.compliantDecisions++;
      } else if (trail.compliance_status === 'non_compliant') {
        state.nonCompliantDecisions++;
      }

      if (trail.approval_status === 'pending') {
        state.pendingApprovals++;
      }
    }

    return state;
  }

  private detectFindings(
    input: GovernanceAuditInput,
    state: AuditAnalysisState
  ): FindingDetectionResult {
    const findings: AuditFinding[] = [];

    // Check for non-compliant decisions
    if (state.nonCompliantDecisions > 0) {
      const ratio = state.nonCompliantDecisions / Math.max(state.totalDecisions, 1);
      findings.push({
        finding_id: generateUUID(),
        category: 'policy_compliance',
        severity: ratio > 0.2 ? 'high' : ratio > 0.1 ? 'medium' : 'low',
        title: 'Non-compliant decisions detected',
        description: `${state.nonCompliantDecisions} of ${state.totalDecisions} decisions were non-compliant (${(ratio * 100).toFixed(1)}%)`,
        affected_entities: input.decision_trails
          .filter((t) => t.compliance_status === 'non_compliant')
          .slice(0, 10)
          .map((t) => t.decision_event_id),
        evidence: [`Non-compliance ratio: ${(ratio * 100).toFixed(1)}%`],
        remediation: [
          'Review non-compliant decisions for root cause',
          'Update policies to address recurring violations',
        ],
      });
    }

    // Check for pending approvals
    if (state.pendingApprovals > 0) {
      findings.push({
        finding_id: generateUUID(),
        category: 'approval_trails',
        severity: state.pendingApprovals > 10 ? 'high' : 'medium',
        title: 'Pending approvals detected',
        description: `${state.pendingApprovals} decisions have pending approval status`,
        affected_entities: input.decision_trails
          .filter((t) => t.approval_status === 'pending')
          .slice(0, 10)
          .map((t) => t.decision_event_id),
        evidence: [`Pending approvals: ${state.pendingApprovals}`],
        remediation: [
          'Review pending approvals for stale items',
          'Escalate overdue approvals',
        ],
      });
    }

    // Check for inactive policies
    const inactivePolicies = input.policy_snapshots.filter((p) => !p.is_active);
    if (inactivePolicies.length > 0) {
      findings.push({
        finding_id: generateUUID(),
        category: 'policy_compliance',
        severity: 'low',
        title: 'Inactive policies found',
        description: `${inactivePolicies.length} policies are currently inactive`,
        affected_entities: inactivePolicies.map((p) => p.policy_id),
        evidence: inactivePolicies.map((p) => `Policy "${p.policy_name}" is inactive`),
        remediation: [
          'Review inactive policies for relevance',
          'Archive or re-activate as appropriate',
        ],
      });
    }

    const criticalCount = findings.filter((f) => f.severity === 'critical').length;
    const highCount = findings.filter((f) => f.severity === 'high').length;

    return { findings, criticalCount, highCount };
  }

  private evaluateCompliance(
    input: GovernanceAuditInput,
    state: AuditAnalysisState
  ): ComplianceEvaluationResult {
    const statuses: ComplianceStatus[] = [];

    for (const category of input.audit_scope.categories) {
      const categoryData = state.categoryCounts.get(category);
      const total = categoryData?.total || state.totalDecisions;
      const compliant = categoryData?.compliant || state.compliantDecisions;
      const nonCompliant = state.nonCompliantDecisions;
      const percentage = total > 0 ? (compliant / total) * 100 : 100;

      let status: ComplianceStatus['status'];
      if (percentage >= 95) status = 'compliant';
      else if (percentage >= 70) status = 'partially_compliant';
      else status = 'non_compliant';

      statuses.push({
        category,
        status,
        compliance_percentage: Math.round(percentage * 10) / 10,
        total_evaluated: total,
        compliant_count: compliant,
        non_compliant_count: nonCompliant,
      });
    }

    const overallCompliance = statuses.length > 0
      ? statuses.reduce((sum, s) => sum + s.compliance_percentage, 0) / statuses.length
      : 100;

    return { statuses, overallCompliance };
  }

  private analyzePolicyCoverage(
    input: GovernanceAuditInput
  ): CoverageAnalysisResult {
    const coverages: PolicyCoverage[] = [];

    for (const category of input.audit_scope.categories) {
      const coveringPolicies = input.policy_snapshots.filter(
        (p) => p.is_active && p.categories.includes(category)
      );
      const totalRules = coveringPolicies.reduce((sum, p) => sum + p.rule_count, 0);

      let coverageLevel: PolicyCoverage['coverage_level'];
      if (coveringPolicies.length === 0) coverageLevel = 'none';
      else if (coveringPolicies.length === 1 || totalRules < 3) coverageLevel = 'partial';
      else if (totalRules < 10) coverageLevel = 'adequate';
      else coverageLevel = 'comprehensive';

      const gaps: string[] = [];
      if (coveringPolicies.length === 0) {
        gaps.push(`No active policies cover ${category}`);
      } else if (totalRules < 3) {
        gaps.push(`Only ${totalRules} rules cover ${category}`);
      }

      coverages.push({
        category,
        policies_count: coveringPolicies.length,
        rules_count: totalRules,
        coverage_level: coverageLevel,
        gaps,
      });
    }

    const coverageLevelValues: Record<string, number> = {
      none: 0, partial: 33, adequate: 66, comprehensive: 100,
    };
    const overallCoverage = coverages.length > 0
      ? coverages.reduce((sum, c) => sum + (coverageLevelValues[c.coverage_level] ?? 0), 0) / coverages.length
      : 100;

    return { coverages, overallCoverage };
  }

  private calculateAuditScore(
    findings: FindingDetectionResult,
    compliance: ComplianceEvaluationResult,
    coverage: CoverageAnalysisResult
  ): number {
    let score = 100;

    // Deduct for findings
    score -= findings.criticalCount * 20;
    score -= findings.highCount * 10;
    score -= (findings.findings.length - findings.criticalCount - findings.highCount) * 3;

    // Factor in compliance (30% weight)
    const complianceFactor = compliance.overallCompliance / 100;
    score = score * 0.7 + complianceFactor * 100 * 0.3;

    // Factor in coverage (modest impact)
    if (coverage.overallCoverage < 50) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
  }

  private generateRecommendations(
    findings: FindingDetectionResult,
    compliance: ComplianceEvaluationResult,
    coverage: CoverageAnalysisResult,
    auditScore: number
  ): GovernanceAuditOutput['recommendations'] {
    const recommendations: GovernanceAuditOutput['recommendations'] = [];

    if (findings.criticalCount > 0) {
      recommendations.push({
        recommendation_id: generateUUID(),
        priority: 'critical',
        category: 'policy_compliance',
        description: `${findings.criticalCount} critical audit finding(s) require immediate attention`,
        action_items: [
          'Investigate critical findings immediately',
          'Implement corrective actions',
          'Schedule follow-up audit',
        ],
      });
    }

    if (compliance.overallCompliance < 80) {
      recommendations.push({
        recommendation_id: generateUUID(),
        priority: 'high',
        category: 'policy_compliance',
        description: `Overall compliance at ${compliance.overallCompliance.toFixed(1)}% — below acceptable threshold`,
        action_items: [
          'Review non-compliant categories for root causes',
          'Update governance policies to address gaps',
          'Implement monitoring for compliance metrics',
        ],
      });
    }

    const gaps = coverage.coverages.filter((c) => c.coverage_level === 'none');
    if (gaps.length > 0) {
      recommendations.push({
        recommendation_id: generateUUID(),
        priority: 'medium',
        category: 'policy_compliance',
        description: `${gaps.length} audit category(ies) have no policy coverage`,
        action_items: gaps.map((g) => `Create policies for ${g.category}`),
      });
    }

    if (auditScore < 50) {
      recommendations.push({
        recommendation_id: generateUUID(),
        priority: 'high',
        category: 'data_governance',
        description: 'Audit score is critically low — governance posture needs urgent improvement',
        action_items: [
          'Conduct comprehensive governance review',
          'Establish governance improvement plan',
          'Schedule weekly audit check-ins',
        ],
      });
    }

    return recommendations;
  }

  private calculateConfidence(
    input: GovernanceAuditInput,
    output: GovernanceAuditOutput
  ): { coverage: number; completeness: number; overall: number } {
    let coverage = 0.5;
    if (input.audit_scope.include_compliance) coverage += 0.2;
    if (input.audit_scope.include_policy_coverage) coverage += 0.2;
    if (input.decision_trails.length > 10) coverage += 0.1;

    let completeness = 0.5;
    if (output.audit_findings.length >= 0) completeness += 0.15;
    if (output.compliance_status.length > 0) completeness += 0.15;
    if (output.policy_coverage.length > 0) completeness += 0.1;
    if (output.recommendations.length > 0) completeness += 0.1;

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
