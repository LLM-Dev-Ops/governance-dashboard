/**
 * Usage Oversight Agent Implementation
 *
 * Core agent logic for usage pattern analysis and governance oversight.
 */

import type {
  GovernanceAgent,
  AgentMetadata,
  AgentContext,
  AgentResult,
} from '../../contracts/base-agent.js';
import type {
  UsageOversightInput,
  UsageOversightOutput,
  UsagePattern,
  PolicyContext,
  OutOfPolicyPattern,
  PolicyAdherence,
  UsageSummary,
} from '../../contracts/usage-oversight.js';
import {
  USAGE_OVERSIGHT_AGENT_METADATA,
  validateUsageOversightInput,
  validateUsageOversightOutput,
} from '../../contracts/usage-oversight.js';
// DecisionEvent type imported for reference (used by DecisionEventEmitter)
import { DecisionEventEmitter } from '../../infrastructure/decision-event-emitter.js';
import { TelemetryEmitter } from '../../infrastructure/telemetry.js';
import type { RuvectorClient } from '../../infrastructure/ruvector-client.js';
import { generateUUID } from '../../contracts/validation.js';
import type {
  AnalysisState,
  PatternDetectionResult,
  PolicyEvaluationResult,
} from './types.js';

/**
 * Usage Oversight Agent Configuration
 */
export interface UsageOversightAgentConfig {
  /** RuVector client for persistence */
  ruvectorClient: RuvectorClient;
  /** Optional telemetry emitter */
  telemetryEmitter?: TelemetryEmitter;
  /** Dry-run mode (no persistence) */
  dryRun?: boolean;
  /** Thresholds for pattern detection */
  thresholds?: {
    budgetWarningPercent?: number;
    budgetCriticalPercent?: number;
    quotaWarningPercent?: number;
    quotaCriticalPercent?: number;
    costAnomalyStdDev?: number;
    usageSpikeMultiplier?: number;
  };
}

/**
 * Default thresholds
 */
const DEFAULT_THRESHOLDS = {
  budgetWarningPercent: 80,
  budgetCriticalPercent: 95,
  quotaWarningPercent: 80,
  quotaCriticalPercent: 95,
  costAnomalyStdDev: 2,
  usageSpikeMultiplier: 3,
};

/**
 * Usage Oversight Agent
 *
 * Analyzes LLM usage patterns and produces governance oversight signals.
 */
export class UsageOversightAgent
  implements GovernanceAgent<UsageOversightInput, UsageOversightOutput>
{
  readonly metadata: AgentMetadata;
  private readonly decisionEventEmitter: DecisionEventEmitter;
  private readonly telemetry?: TelemetryEmitter;
  private readonly thresholds: Required<NonNullable<UsageOversightAgentConfig['thresholds']>>;

  constructor(config: UsageOversightAgentConfig) {
    this.metadata = {
      ...USAGE_OVERSIGHT_AGENT_METADATA,
      classification: 'OVERSIGHT',
      // Convert readonly arrays to mutable arrays
      capabilities: [...USAGE_OVERSIGHT_AGENT_METADATA.capabilities],
      restrictions: [...USAGE_OVERSIGHT_AGENT_METADATA.restrictions],
      consumers: [...USAGE_OVERSIGHT_AGENT_METADATA.consumers],
    };

    this.decisionEventEmitter = new DecisionEventEmitter({
      ruvectorClient: config.ruvectorClient,
      agentId: this.metadata.agent_id,
      agentVersion: this.metadata.agent_version,
      dryRun: config.dryRun,
    });

    this.telemetry = config.telemetryEmitter;
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...config.thresholds };
  }

  /**
   * Execute the Usage Oversight Agent
   */
  async execute(
    input: UsageOversightInput,
    context: AgentContext
  ): Promise<AgentResult<UsageOversightOutput>> {
    const startTime = Date.now();

    // Emit telemetry start event
    this.telemetry?.emitInvocationStart(this.metadata, context);

    try {
      // Validate input
      const validatedInput = this.validateInput(input);

      // Perform analysis
      const output = await this.analyze(validatedInput);

      // Validate output
      const validatedOutput = this.validateOutput(output);

      // Calculate confidence
      const confidence = this.calculateConfidence(validatedInput, validatedOutput);

      // Emit decision event
      const decisionEvent = await this.decisionEventEmitter.emit({
        decisionType: 'usage_oversight_signal',
        input: validatedInput,
        outputs: validatedOutput as unknown as Record<string, unknown>,
        confidence,
        constraintsApplied: {
          policy_scope: validatedInput.policy_context.active_policies.map(
            (p) => p.policy_id
          ),
          org_boundaries: {
            organization_id: validatedInput.organization_id,
            team_ids: validatedInput.filters?.team_ids,
            user_ids: validatedInput.filters?.user_ids,
          },
          time_window: validatedInput.time_range,
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
          patterns_detected: validatedOutput.out_of_policy_patterns.length,
          governance_health_score: validatedOutput.governance_health_score,
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
        decisionType: 'usage_oversight_signal',
        input,
        outputs: { error: { code: error.code, message: error.message } },
        confidence: { coverage: 0, completeness: 0, overall: 0 },
        constraintsApplied: {
          policy_scope: [],
          org_boundaries: {
            organization_id: (input as any)?.organization_id || 'unknown',
          },
          time_window: {
            start: new Date().toISOString(),
            end: new Date().toISOString(),
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
        output: {} as UsageOversightOutput,
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
  validateInput(input: unknown): UsageOversightInput {
    return validateUsageOversightInput(input);
  }

  /**
   * Validate output against schema
   */
  validateOutput(output: unknown): UsageOversightOutput {
    return validateUsageOversightOutput(output);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    details?: Record<string, unknown>;
  }> {
    this.telemetry?.emitHealthCheck(this.metadata, true);
    return { healthy: true };
  }

  /**
   * Core analysis logic
   */
  private async analyze(input: UsageOversightInput): Promise<UsageOversightOutput> {
    // Step 1: Aggregate usage data
    const usageSummary = this.aggregateUsage(input.usage_patterns, input.time_range);

    // Step 2: Detect out-of-policy patterns
    const patternResult = this.detectPatterns(
      input.usage_patterns,
      input.policy_context,
      usageSummary
    );

    // Step 3: Evaluate policy adherence
    const policyResult = this.evaluatePolicies(
      input.usage_patterns,
      input.policy_context
    );

    // Step 4: Calculate governance health score
    const healthScore = this.calculateHealthScore(
      patternResult.patterns,
      policyResult.adherence
    );

    // Step 5: Generate recommendations
    const recommendations = this.generateRecommendations(
      patternResult.patterns,
      policyResult,
      healthScore
    );

    return {
      usage_summary: usageSummary,
      out_of_policy_patterns: patternResult.patterns,
      policy_adherence: policyResult.adherence,
      budget_status: policyResult.budgetStatus,
      quota_status: policyResult.quotaStatus,
      governance_health_score: healthScore,
      recommendations,
    };
  }

  /**
   * Aggregate usage data into summary
   */
  private aggregateUsage(
    patterns: UsagePattern[],
    _timeRange: { start: string; end: string }
  ): UsageSummary {
    const state: AnalysisState = {
      totalRequests: 0,
      totalTokens: 0,
      totalCostUsd: 0,
      latencySum: 0,
      uniqueUsers: new Set(),
      uniqueModels: new Set(),
      byModel: new Map(),
      byUser: new Map(),
      temporalBuckets: new Map(),
    };

    // Single pass through patterns
    for (const pattern of patterns) {
      state.totalRequests++;
      state.totalTokens += pattern.total_tokens;
      state.totalCostUsd += pattern.cost_usd;
      state.latencySum += pattern.latency_ms;
      state.uniqueUsers.add(pattern.user_id);
      state.uniqueModels.add(pattern.model);

      // By model
      const modelKey = `${pattern.provider}:${pattern.model}`;
      if (!state.byModel.has(modelKey)) {
        state.byModel.set(modelKey, {
          model: pattern.model,
          provider: pattern.provider,
          requests: 0,
          tokens: 0,
          costUsd: 0,
        });
      }
      const modelAgg = state.byModel.get(modelKey)!;
      modelAgg.requests++;
      modelAgg.tokens += pattern.total_tokens;
      modelAgg.costUsd += pattern.cost_usd;

      // By user
      if (!state.byUser.has(pattern.user_id)) {
        state.byUser.set(pattern.user_id, {
          userId: pattern.user_id,
          requests: 0,
          tokens: 0,
          costUsd: 0,
        });
      }
      const userAgg = state.byUser.get(pattern.user_id)!;
      userAgg.requests++;
      userAgg.tokens += pattern.total_tokens;
      userAgg.costUsd += pattern.cost_usd;

      // Temporal (daily buckets)
      const day = pattern.timestamp.split('T')[0];
      if (!state.temporalBuckets.has(day)) {
        state.temporalBuckets.set(day, { period: day, requests: 0, costUsd: 0 });
      }
      const bucket = state.temporalBuckets.get(day)!;
      bucket.requests++;
      bucket.costUsd += pattern.cost_usd;
    }

    // Convert to output format
    const byModel = Array.from(state.byModel.values())
      .map((m) => ({
        model: m.model,
        provider: m.provider,
        requests: m.requests,
        tokens: m.tokens,
        cost_usd: m.costUsd,
        percentage_of_total:
          state.totalCostUsd > 0
            ? (m.costUsd / state.totalCostUsd) * 100
            : 0,
      }))
      .sort((a, b) => b.cost_usd - a.cost_usd);

    const byUser = Array.from(state.byUser.values())
      .map((u) => ({
        user_id: u.userId,
        requests: u.requests,
        tokens: u.tokens,
        cost_usd: u.costUsd,
        percentage_of_total:
          state.totalCostUsd > 0
            ? (u.costUsd / state.totalCostUsd) * 100
            : 0,
      }))
      .sort((a, b) => b.cost_usd - a.cost_usd)
      .slice(0, 10); // Top 10 users

    const temporalDistribution = Array.from(state.temporalBuckets.values()).sort(
      (a, b) => a.period.localeCompare(b.period)
    );

    return {
      total_requests: state.totalRequests,
      total_tokens: state.totalTokens,
      total_cost_usd: state.totalCostUsd,
      average_latency_ms:
        state.totalRequests > 0 ? state.latencySum / state.totalRequests : 0,
      unique_users: state.uniqueUsers.size,
      unique_models: state.uniqueModels.size,
      by_model: byModel,
      by_user: byUser,
      temporal_distribution: temporalDistribution.map(t => ({
        period: t.period,
        requests: t.requests,
        cost_usd: t.costUsd,
      })),
    };
  }

  /**
   * Detect out-of-policy patterns
   */
  private detectPatterns(
    _patterns: UsagePattern[],
    policyContext: PolicyContext,
    summary: UsageSummary
  ): PatternDetectionResult {
    const detectedPatterns: OutOfPolicyPattern[] = [];
    let coverageScore = 1.0;

    // Check budget warnings
    for (const budget of policyContext.budget_limits || []) {
      const percentUsed = (budget.current_spend_usd / budget.limit_usd) * 100;

      if (percentUsed >= this.thresholds.budgetCriticalPercent) {
        detectedPatterns.push({
          pattern_id: generateUUID(),
          category: 'budget_warning',
          severity: 'alert',
          description: `Budget "${budget.scope}:${budget.scope_id}" at ${percentUsed.toFixed(1)}% of limit`,
          affected_scope: {
            users: [],
            models: [],
          },
          metrics: {
            observed_value: budget.current_spend_usd,
            threshold_value: budget.limit_usd,
            deviation_percentage: percentUsed - 100,
          },
          timeframe: {
            start: new Date().toISOString(),
            end: new Date().toISOString(),
          },
        });
      } else if (percentUsed >= this.thresholds.budgetWarningPercent) {
        detectedPatterns.push({
          pattern_id: generateUUID(),
          category: 'budget_warning',
          severity: 'warning',
          description: `Budget "${budget.scope}:${budget.scope_id}" at ${percentUsed.toFixed(1)}% of limit`,
          affected_scope: {
            users: [],
            models: [],
          },
          metrics: {
            observed_value: budget.current_spend_usd,
            threshold_value: budget.limit_usd,
          },
          timeframe: {
            start: new Date().toISOString(),
            end: new Date().toISOString(),
          },
        });
      }
    }

    // Check quota warnings
    for (const quota of policyContext.quota_limits || []) {
      const percentUsed = (quota.current_value / quota.limit_value) * 100;

      if (percentUsed >= this.thresholds.quotaCriticalPercent) {
        detectedPatterns.push({
          pattern_id: generateUUID(),
          category: 'quota_warning',
          severity: 'alert',
          description: `Quota "${quota.quota_type}" at ${percentUsed.toFixed(1)}% of limit`,
          affected_scope: {
            users: [],
            models: [],
          },
          metrics: {
            observed_value: quota.current_value,
            threshold_value: quota.limit_value,
            deviation_percentage: percentUsed - 100,
          },
          timeframe: {
            start: new Date().toISOString(),
            end: new Date().toISOString(),
          },
        });
      } else if (percentUsed >= this.thresholds.quotaWarningPercent) {
        detectedPatterns.push({
          pattern_id: generateUUID(),
          category: 'quota_warning',
          severity: 'warning',
          description: `Quota "${quota.quota_type}" at ${percentUsed.toFixed(1)}% of limit`,
          affected_scope: {
            users: [],
            models: [],
          },
          metrics: {
            observed_value: quota.current_value,
            threshold_value: quota.limit_value,
          },
          timeframe: {
            start: new Date().toISOString(),
            end: new Date().toISOString(),
          },
        });
      }
    }

    // Check for cost anomalies (simple std dev check)
    if (summary.temporal_distribution.length > 2) {
      const costs = summary.temporal_distribution.map((d) => d.cost_usd);
      const mean = costs.reduce((a, b) => a + b, 0) / costs.length;
      const variance =
        costs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / costs.length;
      const stdDev = Math.sqrt(variance);

      const latestCost = costs[costs.length - 1];
      if (
        stdDev > 0 &&
        Math.abs(latestCost - mean) > this.thresholds.costAnomalyStdDev * stdDev
      ) {
        detectedPatterns.push({
          pattern_id: generateUUID(),
          category: 'cost_anomaly',
          severity: latestCost > mean ? 'warning' : 'info',
          description: `Cost ${latestCost > mean ? 'spike' : 'drop'} detected: ${latestCost.toFixed(2)} USD (mean: ${mean.toFixed(2)})`,
          affected_scope: {
            users: summary.by_user.slice(0, 3).map((u) => u.user_id),
            models: summary.by_model.slice(0, 3).map((m) => m.model),
          },
          metrics: {
            observed_value: latestCost,
            threshold_value: mean + this.thresholds.costAnomalyStdDev * stdDev,
            deviation_percentage: ((latestCost - mean) / mean) * 100,
          },
          timeframe: {
            start: summary.temporal_distribution[summary.temporal_distribution.length - 1].period + 'T00:00:00Z',
            end: summary.temporal_distribution[summary.temporal_distribution.length - 1].period + 'T23:59:59Z',
          },
        });
      }
    }

    return {
      patterns: detectedPatterns,
      coverageScore,
    };
  }

  /**
   * Evaluate policy adherence
   */
  private evaluatePolicies(
    _patterns: UsagePattern[],
    policyContext: PolicyContext
  ): PolicyEvaluationResult {
    const adherence: PolicyAdherence[] = [];

    for (const policy of policyContext.active_policies) {
      const ruleAdherence = policy.rules.map((rule) => {
        // Simple rule evaluation - in production this would be more sophisticated
        return {
          rule_id: rule.rule_id,
          rule_type: rule.rule_type,
          status: 'compliant' as const,
        };
      });

      const compliantCount = ruleAdherence.filter(
        (r) => r.status === 'compliant'
      ).length;

      adherence.push({
        policy_id: policy.policy_id,
        policy_name: policy.policy_name,
        status:
          compliantCount === ruleAdherence.length
            ? 'compliant'
            : compliantCount > ruleAdherence.length / 2
            ? 'warning'
            : 'violation',
        adherence_percentage: (compliantCount / ruleAdherence.length) * 100,
        rule_adherence: ruleAdherence,
      });
    }

    // Budget status
    const budgetStatus = (policyContext.budget_limits || []).map((b) => {
      const percentUsed = (b.current_spend_usd / b.limit_usd) * 100;
      return {
        budget_id: b.budget_id,
        scope: b.scope,
        scope_id: b.scope_id,
        limit_usd: b.limit_usd,
        current_spend_usd: b.current_spend_usd,
        percentage_used: percentUsed,
        status:
          percentUsed >= this.thresholds.budgetCriticalPercent
            ? ('critical' as const)
            : percentUsed >= this.thresholds.budgetWarningPercent
            ? ('warning' as const)
            : ('healthy' as const),
      };
    });

    // Quota status
    const quotaStatus = (policyContext.quota_limits || []).map((q) => {
      const percentUsed = (q.current_value / q.limit_value) * 100;
      return {
        quota_id: q.quota_id,
        quota_type: q.quota_type,
        scope: q.scope,
        scope_id: q.scope_id,
        limit_value: q.limit_value,
        current_value: q.current_value,
        percentage_used: percentUsed,
        status:
          percentUsed >= this.thresholds.quotaCriticalPercent
            ? ('critical' as const)
            : percentUsed >= this.thresholds.quotaWarningPercent
            ? ('warning' as const)
            : ('healthy' as const),
      };
    });

    return { adherence, budgetStatus, quotaStatus };
  }

  /**
   * Calculate governance health score
   */
  private calculateHealthScore(
    patterns: OutOfPolicyPattern[],
    adherence: PolicyAdherence[]
  ): number {
    let score = 100;

    // Deduct for patterns
    for (const pattern of patterns) {
      switch (pattern.severity) {
        case 'alert':
          score -= 15;
          break;
        case 'warning':
          score -= 8;
          break;
        case 'advisory':
          score -= 3;
          break;
        case 'info':
          score -= 1;
          break;
      }
    }

    // Deduct for non-compliant policies
    for (const policy of adherence) {
      if (policy.status === 'violation') {
        score -= 20;
      } else if (policy.status === 'warning') {
        score -= 10;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    _patterns: OutOfPolicyPattern[],
    policyResult: PolicyEvaluationResult,
    healthScore: number
  ): UsageOversightOutput['recommendations'] {
    const recommendations: UsageOversightOutput['recommendations'] = [];

    // Critical budget recommendations
    const criticalBudgets = policyResult.budgetStatus.filter(
      (b) => b.status === 'critical'
    );
    if (criticalBudgets.length > 0) {
      recommendations.push({
        recommendation_id: generateUUID(),
        priority: 'high',
        category: 'budget',
        description: `${criticalBudgets.length} budget(s) at critical levels`,
        action_items: [
          'Review high-cost users and models',
          'Consider implementing rate limiting',
          'Evaluate cost optimization strategies',
        ],
      });
    }

    // Low health score recommendations
    if (healthScore < 50) {
      recommendations.push({
        recommendation_id: generateUUID(),
        priority: 'high',
        category: 'governance',
        description: 'Governance health score is critically low',
        action_items: [
          'Conduct immediate policy compliance review',
          'Identify and address pattern violations',
          'Consider implementing stricter controls',
        ],
      });
    } else if (healthScore < 75) {
      recommendations.push({
        recommendation_id: generateUUID(),
        priority: 'medium',
        category: 'governance',
        description: 'Governance health score needs improvement',
        action_items: [
          'Review detected patterns for corrective actions',
          'Update policies based on current usage patterns',
        ],
      });
    }

    return recommendations;
  }

  /**
   * Calculate confidence metrics for the analysis
   */
  private calculateConfidence(
    input: UsageOversightInput,
    output: UsageOversightOutput
  ): { coverage: number; completeness: number; overall: number } {
    // Coverage: how much of the requested scope was analyzed
    const requestedUserCount = input.filters?.user_ids?.length || Infinity;
    const analyzedUserCount = output.usage_summary.unique_users;
    const userCoverage = Math.min(1, analyzedUserCount / requestedUserCount);

    // Completeness: how complete is the output
    const hasUsageSummary = output.usage_summary.total_requests > 0 ? 1 : 0;
    const hasPolicyAdherence = output.policy_adherence.length > 0 ? 1 : 0;
    const hasHealthScore = output.governance_health_score >= 0 ? 1 : 0;
    const completeness = (hasUsageSummary + hasPolicyAdherence + hasHealthScore) / 3;

    const coverage = (userCoverage + 1) / 2; // Average with time coverage (assumed 100%)
    const overall = DecisionEventEmitter.calculateOverallConfidence(coverage, completeness);

    return { coverage, completeness, overall };
  }
}
