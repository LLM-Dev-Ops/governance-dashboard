/**
 * Usage Oversight Agent Contract
 *
 * Classification: OVERSIGHT / VISIBILITY
 *
 * Purpose:
 * Provide visibility into LLM usage patterns for governance and compliance monitoring.
 *
 * This agent:
 * - Aggregates usage signals across systems
 * - Identifies out-of-policy usage patterns
 * - Produces oversight dashboards and signals
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

import { z } from 'zod';

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

/**
 * Usage pattern from upstream systems
 */
export const UsagePatternSchema = z.object({
  /** Unique identifier for the usage record */
  usage_id: z.string(),
  /** Organization context */
  organization_id: z.string(),
  /** Optional team context */
  team_id: z.string().optional(),
  /** User who initiated the request */
  user_id: z.string(),
  /** LLM model used */
  model: z.string(),
  /** Provider (openai, anthropic, etc.) */
  provider: z.string(),
  /** Token counts */
  prompt_tokens: z.number().int().min(0),
  completion_tokens: z.number().int().min(0),
  total_tokens: z.number().int().min(0),
  /** Cost in USD */
  cost_usd: z.number().min(0),
  /** Latency in milliseconds */
  latency_ms: z.number().min(0),
  /** Timestamp of the request */
  timestamp: z.string().datetime(),
  /** Optional metadata */
  metadata: z.record(z.unknown()).optional(),
});

export type UsagePattern = z.infer<typeof UsagePatternSchema>;

/**
 * Policy context for usage evaluation
 */
export const PolicyContextSchema = z.object({
  /** Active policies for the organization */
  active_policies: z.array(z.object({
    policy_id: z.string(),
    policy_name: z.string(),
    rules: z.array(z.object({
      rule_id: z.string(),
      rule_type: z.string(),
      threshold: z.unknown().optional(),
      condition: z.string().optional(),
    })),
  })),
  /** Budget limits */
  budget_limits: z.array(z.object({
    budget_id: z.string(),
    scope: z.enum(['organization', 'team', 'user']),
    scope_id: z.string(),
    limit_usd: z.number(),
    current_spend_usd: z.number(),
    period: z.enum(['daily', 'weekly', 'monthly']),
  })).optional(),
  /** Quota limits */
  quota_limits: z.array(z.object({
    quota_id: z.string(),
    scope: z.enum(['organization', 'team', 'user']),
    scope_id: z.string(),
    quota_type: z.string(),
    limit_value: z.number(),
    current_value: z.number(),
  })).optional(),
});

export type PolicyContext = z.infer<typeof PolicyContextSchema>;

/**
 * Input schema for Usage Oversight Agent
 */
export const UsageOversightInputSchema = z.object({
  /** Request identifier for tracing */
  request_id: z.string(),
  /** Organization to analyze */
  organization_id: z.string(),
  /** Time range for analysis */
  time_range: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  /** Usage patterns to analyze */
  usage_patterns: z.array(UsagePatternSchema),
  /** Policy context for evaluation */
  policy_context: PolicyContextSchema,
  /** Optional filters */
  filters: z.object({
    team_ids: z.array(z.string()).optional(),
    user_ids: z.array(z.string()).optional(),
    models: z.array(z.string()).optional(),
    providers: z.array(z.string()).optional(),
  }).optional(),
});

export type UsageOversightInput = z.infer<typeof UsageOversightInputSchema>;

// ============================================================================
// OUTPUT SCHEMAS
// ============================================================================

/**
 * Severity levels for oversight signals
 */
export const OversightSeveritySchema = z.enum([
  'info',      // Informational, no action needed
  'advisory',  // Recommend review
  'warning',   // Potential policy concern
  'alert',     // Requires attention
]);

export type OversightSeverity = z.infer<typeof OversightSeveritySchema>;

/**
 * Out-of-policy pattern detected
 */
export const OutOfPolicyPatternSchema = z.object({
  /** Pattern identifier */
  pattern_id: z.string(),
  /** Pattern category */
  category: z.enum([
    'cost_anomaly',
    'usage_spike',
    'policy_threshold_breach',
    'quota_warning',
    'budget_warning',
    'unusual_model_usage',
    'off_hours_usage',
    'high_frequency_usage',
  ]),
  /** Severity of the pattern */
  severity: OversightSeveritySchema,
  /** Human-readable description */
  description: z.string(),
  /** Affected scope */
  affected_scope: z.object({
    users: z.array(z.string()),
    teams: z.array(z.string()).optional(),
    models: z.array(z.string()),
  }),
  /** Related policy (if any) */
  related_policy_id: z.string().optional(),
  /** Quantitative details */
  metrics: z.object({
    observed_value: z.number(),
    threshold_value: z.number().optional(),
    deviation_percentage: z.number().optional(),
  }),
  /** Timeframe of the pattern */
  timeframe: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
});

export type OutOfPolicyPattern = z.infer<typeof OutOfPolicyPatternSchema>;

/**
 * Aggregated usage summary
 */
export const UsageSummarySchema = z.object({
  /** Total requests in period */
  total_requests: z.number().int(),
  /** Total tokens consumed */
  total_tokens: z.number().int(),
  /** Total cost in USD */
  total_cost_usd: z.number(),
  /** Average latency in ms */
  average_latency_ms: z.number(),
  /** Unique users */
  unique_users: z.number().int(),
  /** Unique models used */
  unique_models: z.number().int(),
  /** Breakdown by model */
  by_model: z.array(z.object({
    model: z.string(),
    provider: z.string(),
    requests: z.number().int(),
    tokens: z.number().int(),
    cost_usd: z.number(),
    percentage_of_total: z.number(),
  })),
  /** Breakdown by user (top N) */
  by_user: z.array(z.object({
    user_id: z.string(),
    requests: z.number().int(),
    tokens: z.number().int(),
    cost_usd: z.number(),
    percentage_of_total: z.number(),
  })),
  /** Temporal distribution */
  temporal_distribution: z.array(z.object({
    period: z.string(),
    requests: z.number().int(),
    cost_usd: z.number(),
  })),
});

export type UsageSummary = z.infer<typeof UsageSummarySchema>;

/**
 * Policy adherence status
 */
export const PolicyAdherenceSchema = z.object({
  /** Policy identifier */
  policy_id: z.string(),
  /** Policy name */
  policy_name: z.string(),
  /** Overall adherence status */
  status: z.enum(['compliant', 'warning', 'violation']),
  /** Adherence percentage (0-100) */
  adherence_percentage: z.number().min(0).max(100),
  /** Rule-level adherence */
  rule_adherence: z.array(z.object({
    rule_id: z.string(),
    rule_type: z.string(),
    status: z.enum(['compliant', 'warning', 'violation']),
    details: z.string().optional(),
  })),
});

export type PolicyAdherence = z.infer<typeof PolicyAdherenceSchema>;

/**
 * Output schema for Usage Oversight Agent
 *
 * decision_type: "usage_oversight_signal"
 */
export const UsageOversightOutputSchema = z.object({
  /** Aggregated usage summary */
  usage_summary: UsageSummarySchema,
  /** Detected out-of-policy patterns */
  out_of_policy_patterns: z.array(OutOfPolicyPatternSchema),
  /** Policy adherence status */
  policy_adherence: z.array(PolicyAdherenceSchema),
  /** Budget status */
  budget_status: z.array(z.object({
    budget_id: z.string(),
    scope: z.string(),
    scope_id: z.string(),
    limit_usd: z.number(),
    current_spend_usd: z.number(),
    percentage_used: z.number(),
    status: z.enum(['healthy', 'warning', 'critical']),
  })),
  /** Quota status */
  quota_status: z.array(z.object({
    quota_id: z.string(),
    quota_type: z.string(),
    scope: z.string(),
    scope_id: z.string(),
    limit_value: z.number(),
    current_value: z.number(),
    percentage_used: z.number(),
    status: z.enum(['healthy', 'warning', 'critical']),
  })),
  /** Governance health score (0-100) */
  governance_health_score: z.number().min(0).max(100),
  /** Recommendations for governance improvement */
  recommendations: z.array(z.object({
    recommendation_id: z.string(),
    priority: z.enum(['low', 'medium', 'high']),
    category: z.string(),
    description: z.string(),
    action_items: z.array(z.string()),
  })),
});

export type UsageOversightOutput = z.infer<typeof UsageOversightOutputSchema>;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export function validateUsageOversightInput(input: unknown): UsageOversightInput {
  return UsageOversightInputSchema.parse(input);
}

export function validateUsageOversightOutput(output: unknown): UsageOversightOutput {
  return UsageOversightOutputSchema.parse(output);
}

// ============================================================================
// CLI CONTRACT
// ============================================================================

/**
 * CLI invocation shape for Usage Oversight Agent
 *
 * Command: llm-gov agent usage-oversight
 *
 * Subcommands:
 * - analyze: Analyze usage patterns for a time range
 * - inspect: Inspect specific usage records
 * - summarize: Generate a governance summary
 *
 * Examples:
 *   llm-gov agent usage-oversight analyze --org org_123 --from 2024-01-01 --to 2024-01-31
 *   llm-gov agent usage-oversight inspect --pattern pattern_456
 *   llm-gov agent usage-oversight summarize --org org_123 --format json
 */
export const UsageOversightCLISchema = z.object({
  subcommand: z.enum(['analyze', 'inspect', 'summarize']),
  options: z.object({
    organization_id: z.string(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    team_id: z.string().optional(),
    user_id: z.string().optional(),
    format: z.enum(['json', 'table', 'csv']).default('json'),
    verbose: z.boolean().default(false),
  }),
});

export type UsageOversightCLI = z.infer<typeof UsageOversightCLISchema>;

// ============================================================================
// AGENT METADATA
// ============================================================================

export const USAGE_OVERSIGHT_AGENT_METADATA = {
  agent_id: 'usage-oversight-agent',
  agent_version: '1.0.0',
  classification: 'OVERSIGHT',
  decision_type: 'usage_oversight_signal' as const,
  description: 'Provide visibility into LLM usage patterns for governance and compliance monitoring',

  // What this agent MAY do
  capabilities: [
    'Aggregate usage signals across systems',
    'Identify out-of-policy usage patterns',
    'Produce oversight dashboards and signals',
    'Calculate governance health scores',
    'Generate adherence reports',
  ],

  // What this agent MUST NOT do
  restrictions: [
    'MUST NOT intercept execution',
    'MUST NOT trigger retries or workflows',
    'MUST NOT enforce policies',
    'MUST NOT modify configurations',
    'MUST NOT emit anomaly detections',
    'MUST NOT apply optimizations',
    'MUST NOT connect directly to Google SQL',
    'MUST NOT execute SQL queries',
  ],

  // Systems that MAY consume this agent's output
  consumers: [
    'Governance & compliance dashboards',
    'Audit systems',
    'Management reporting',
    'Policy recommendation systems',
  ],

  // Data persistence rules
  persistence: {
    persisted_to: 'ruvector-service',
    data_persisted: [
      'DecisionEvent',
      'UsageOversightOutput',
    ],
    data_not_persisted: [
      'Raw usage patterns (already in source systems)',
      'PII beyond user IDs',
      'Actual prompt/completion content',
    ],
  },
} as const;
