/**
 * Phase 4 Layer 1 - Governance & FinOps Configuration
 *
 * Performance budgets and governance rules for agents.
 *
 * GOVERNANCE RULES:
 * - Agents MUST emit cost signals
 * - Agents MUST emit policy evaluation signals
 * - Agents MUST emit approval requirements
 * - Agents MUST NOT auto-enforce policy
 * - Agents MUST NOT auto-approve actions
 */

/**
 * Performance Budget Configuration
 *
 * These constraints ensure predictable response times and resource usage.
 */
export const PERFORMANCE_BUDGETS = {
  /** Maximum tokens per agent invocation */
  MAX_TOKENS: 1200,
  /** Maximum latency in milliseconds */
  MAX_LATENCY_MS: 2500,
  /** Maximum memory in MB */
  MAX_MEMORY_MB: 256,
  /** Request timeout in milliseconds */
  REQUEST_TIMEOUT_MS: 3000,
} as const;

/**
 * Phase 4 Layer 1 Environment Configuration
 */
export const PHASE4_ENV = {
  AGENT_PHASE: 'phase4',
  AGENT_LAYER: 'layer1',
} as const;

/**
 * Decision Event Types for Phase 4 Layer 1
 *
 * These are the signal types that agents MUST emit.
 */
export const PHASE4_DECISION_TYPES = {
  /** Emitted when cost risk is detected */
  COST_RISK: 'cost_risk_signal',
  /** Emitted when budget thresholds are crossed */
  BUDGET_THRESHOLD: 'budget_threshold_signal',
  /** Emitted when policy violations are detected */
  POLICY_VIOLATION: 'policy_violation_signal',
  /** Emitted when human approval is required */
  APPROVAL_REQUIRED: 'approval_required_signal',
} as const;

/**
 * Governance Signal Thresholds
 */
export const SIGNAL_THRESHOLDS = {
  /** Cost risk signal emitted when spend exceeds this % of budget */
  COST_RISK_PERCENT: 70,
  /** Budget threshold signal emitted at these % levels */
  BUDGET_WARNING_PERCENT: 80,
  BUDGET_CRITICAL_PERCENT: 95,
  /** Policy violation signal emitted when adherence drops below this % */
  POLICY_ADHERENCE_MIN_PERCENT: 90,
  /** Approval required for risk scores above this threshold */
  APPROVAL_RISK_THRESHOLD: 0.6,
} as const;

/**
 * Validate agent execution against performance budgets
 *
 * @param metrics - Execution metrics to validate
 * @returns Validation result with any budget violations
 */
export function validatePerformanceBudgets(metrics: {
  latency_ms: number;
  tokens_used?: number;
  memory_mb?: number;
}): {
  valid: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  if (metrics.latency_ms > PERFORMANCE_BUDGETS.MAX_LATENCY_MS) {
    violations.push(
      `Latency ${metrics.latency_ms}ms exceeds budget ${PERFORMANCE_BUDGETS.MAX_LATENCY_MS}ms`
    );
  }

  if (metrics.tokens_used && metrics.tokens_used > PERFORMANCE_BUDGETS.MAX_TOKENS) {
    violations.push(
      `Token usage ${metrics.tokens_used} exceeds budget ${PERFORMANCE_BUDGETS.MAX_TOKENS}`
    );
  }

  if (metrics.memory_mb && metrics.memory_mb > PERFORMANCE_BUDGETS.MAX_MEMORY_MB) {
    violations.push(
      `Memory ${metrics.memory_mb}MB exceeds budget ${PERFORMANCE_BUDGETS.MAX_MEMORY_MB}MB`
    );
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Create telemetry metadata for Phase 4 Layer 1
 */
export function createPhase4Telemetry(
  latency_ms: number,
  source_system?: string
): {
  latency_ms: number;
  source_system?: string;
  phase: string;
  layer: string;
  performance_budget_check: ReturnType<typeof validatePerformanceBudgets>;
} {
  const budgetCheck = validatePerformanceBudgets({ latency_ms });

  return {
    latency_ms,
    source_system,
    phase: PHASE4_ENV.AGENT_PHASE,
    layer: PHASE4_ENV.AGENT_LAYER,
    performance_budget_check: budgetCheck,
  };
}
