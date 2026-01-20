/**
 * Base Agent Contract
 *
 * Defines the fundamental interface that ALL governance agents must implement.
 * This ensures consistent behavior across the agent infrastructure.
 */

import { z } from 'zod';
import type { DecisionEvent } from './decision-event.js';

/**
 * Agent classification types
 */
export const AgentClassificationSchema = z.enum([
  'GOVERNANCE_AUDIT',
  'OVERSIGHT',
  'COMPLIANCE_VISIBILITY',
  'GOVERNANCE_ANALYSIS',
]);

export type AgentClassification = z.infer<typeof AgentClassificationSchema>;

/**
 * Agent metadata schema
 */
export const AgentMetadataSchema = z.object({
  /** Unique agent identifier */
  agent_id: z.string(),
  /** Semantic version */
  agent_version: z.string().regex(/^\d+\.\d+\.\d+$/),
  /** Agent classification */
  classification: AgentClassificationSchema,
  /** Decision type this agent produces */
  decision_type: z.string(),
  /** Human-readable description */
  description: z.string(),
  /** What this agent can do */
  capabilities: z.array(z.string()),
  /** What this agent must not do */
  restrictions: z.array(z.string()),
  /** Systems that may consume output */
  consumers: z.array(z.string()),
});

export type AgentMetadata = z.infer<typeof AgentMetadataSchema>;

/**
 * Agent execution context
 */
export const AgentContextSchema = z.object({
  /** Unique execution reference */
  execution_ref: z.string(),
  /** Request timestamp */
  request_timestamp: z.string().datetime(),
  /** Caller identity (for audit) */
  caller: z.object({
    service: z.string(),
    version: z.string().optional(),
    trace_id: z.string().optional(),
  }),
  /** Organization context */
  organization_id: z.string(),
  /** Optional telemetry correlation */
  telemetry_context: z.object({
    trace_id: z.string(),
    span_id: z.string(),
    parent_span_id: z.string().optional(),
  }).optional(),
});

export type AgentContext = z.infer<typeof AgentContextSchema>;

/**
 * Agent execution result
 */
export interface AgentResult<TOutput> {
  /** Whether execution succeeded */
  success: boolean;
  /** The decision event (always emitted) */
  decision_event: DecisionEvent;
  /** Agent-specific output */
  output: TOutput;
  /** Error details if failed */
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Base interface for all governance agents
 *
 * Every agent in LLM-Governance-Dashboard MUST implement this interface.
 */
export interface GovernanceAgent<TInput, TOutput> {
  /** Agent metadata */
  readonly metadata: AgentMetadata;

  /**
   * Execute the agent
   *
   * @param input - Validated input for the agent
   * @param context - Execution context
   * @returns Agent result with DecisionEvent
   */
  execute(input: TInput, context: AgentContext): Promise<AgentResult<TOutput>>;

  /**
   * Validate input against the agent's schema
   *
   * @param input - Raw input to validate
   * @returns Validated input
   * @throws ZodError if validation fails
   */
  validateInput(input: unknown): TInput;

  /**
   * Validate output against the agent's schema
   *
   * @param output - Raw output to validate
   * @returns Validated output
   * @throws ZodError if validation fails
   */
  validateOutput(output: unknown): TOutput;

  /**
   * Get agent health status
   */
  healthCheck(): Promise<{
    healthy: boolean;
    details?: Record<string, unknown>;
  }>;
}

/**
 * Agent lifecycle hooks
 */
export interface AgentLifecycleHooks<TInput, TOutput> {
  /** Called before input validation */
  beforeValidation?: (rawInput: unknown) => Promise<void>;
  /** Called after input validation, before execution */
  beforeExecution?: (input: TInput, context: AgentContext) => Promise<void>;
  /** Called after execution, before output validation */
  afterExecution?: (output: TOutput, context: AgentContext) => Promise<void>;
  /** Called after successful completion */
  onSuccess?: (result: AgentResult<TOutput>) => Promise<void>;
  /** Called on any error */
  onError?: (error: Error, context: AgentContext) => Promise<void>;
}

/**
 * Configuration for agent deployment
 */
export const AgentDeploymentConfigSchema = z.object({
  /** Deployment environment */
  environment: z.enum(['development', 'staging', 'production']),
  /** Google Cloud region */
  region: z.string(),
  /** Memory allocation in MB */
  memory_mb: z.number().int().min(128).max(8192),
  /** Timeout in seconds */
  timeout_seconds: z.number().int().min(1).max(540),
  /** Maximum concurrent instances */
  max_instances: z.number().int().min(1).max(1000),
  /** Minimum instances to keep warm */
  min_instances: z.number().int().min(0).max(100),
  /** Environment variables */
  environment_variables: z.record(z.string()).optional(),
});

export type AgentDeploymentConfig = z.infer<typeof AgentDeploymentConfigSchema>;
