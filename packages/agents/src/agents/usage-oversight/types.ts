/**
 * Usage Oversight Agent Types
 *
 * Re-exports contract types and defines internal types.
 */

// Re-export contract types
export type {
  UsagePattern,
  PolicyContext,
  UsageOversightInput,
  UsageOversightOutput,
  OutOfPolicyPattern,
  UsageSummary,
  PolicyAdherence,
  OversightSeverity,
  UsageOversightCLI,
} from '../../contracts/usage-oversight.js';

export {
  USAGE_OVERSIGHT_AGENT_METADATA,
  validateUsageOversightInput,
  validateUsageOversightOutput,
  UsageOversightInputSchema,
  UsageOversightOutputSchema,
} from '../../contracts/usage-oversight.js';

/**
 * Internal analysis state
 */
export interface AnalysisState {
  /** Total requests analyzed */
  totalRequests: number;
  /** Total tokens consumed */
  totalTokens: number;
  /** Total cost in USD */
  totalCostUsd: number;
  /** Latency sum for average calculation */
  latencySum: number;
  /** Unique user set */
  uniqueUsers: Set<string>;
  /** Unique model set */
  uniqueModels: Set<string>;
  /** By-model aggregates */
  byModel: Map<string, ModelAggregate>;
  /** By-user aggregates */
  byUser: Map<string, UserAggregate>;
  /** Temporal buckets */
  temporalBuckets: Map<string, TemporalBucket>;
}

export interface ModelAggregate {
  model: string;
  provider: string;
  requests: number;
  tokens: number;
  costUsd: number;
}

export interface UserAggregate {
  userId: string;
  requests: number;
  tokens: number;
  costUsd: number;
}

export interface TemporalBucket {
  period: string;
  requests: number;
  costUsd: number;
}

/**
 * Pattern detection result
 */
export interface PatternDetectionResult {
  patterns: import('../../contracts/usage-oversight.js').OutOfPolicyPattern[];
  coverageScore: number;
}

/**
 * Policy evaluation result
 */
export interface PolicyEvaluationResult {
  adherence: import('../../contracts/usage-oversight.js').PolicyAdherence[];
  budgetStatus: Array<{
    budget_id: string;
    scope: string;
    scope_id: string;
    limit_usd: number;
    current_spend_usd: number;
    percentage_used: number;
    status: 'healthy' | 'warning' | 'critical';
  }>;
  quotaStatus: Array<{
    quota_id: string;
    quota_type: string;
    scope: string;
    scope_id: string;
    limit_value: number;
    current_value: number;
    percentage_used: number;
    status: 'healthy' | 'warning' | 'critical';
  }>;
}
