/**
 * Execution Span Contract
 *
 * Defines the span types for the Agentics execution system.
 * This repo is a Foundational Execution Unit that MUST emit
 * hierarchical execution spans: Core -> Repo -> Agent.
 *
 * INVARIANTS:
 * - Every agent execution response includes a repo_span with nested agent_spans
 * - Spans are append-only and causally ordered via parent_span_id
 * - Artifacts are attached at the agent level only
 * - If no agent spans exist, execution is INVALID
 */

import { z } from 'zod';

/**
 * Span status
 */
export const SpanStatusSchema = z.enum(['RUNNING', 'COMPLETED', 'FAILED']);
export type SpanStatus = z.infer<typeof SpanStatusSchema>;

/**
 * Span error details
 */
export const SpanErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});
export type SpanError = z.infer<typeof SpanErrorSchema>;

/**
 * Artifact attached to an agent span.
 * Wraps a DecisionEvent or any machine-verifiable evidence.
 */
export const SpanArtifactSchema = z.object({
  artifact_id: z.string(),
  artifact_type: z.string(),
  data: z.record(z.unknown()),
});
export type SpanArtifact = z.infer<typeof SpanArtifactSchema>;

/**
 * Agent-level execution span.
 * One per agent execution within a repo invocation.
 */
export const AgentSpanSchema = z.object({
  type: z.literal('agent'),
  span_id: z.string(),
  parent_span_id: z.string(),
  agent_name: z.string(),
  repo_name: z.string(),
  status: SpanStatusSchema,
  start_time: z.string().datetime(),
  end_time: z.string().datetime().optional(),
  error: SpanErrorSchema.optional(),
  artifacts: z.array(SpanArtifactSchema),
});
export type AgentSpan = z.infer<typeof AgentSpanSchema>;

/**
 * Repo-level execution span.
 * One per handler invocation. Contains nested agent spans.
 */
export const RepoSpanSchema = z.object({
  type: z.literal('repo'),
  span_id: z.string(),
  parent_span_id: z.string(),
  execution_id: z.string(),
  repo_name: z.string(),
  status: SpanStatusSchema,
  start_time: z.string().datetime(),
  end_time: z.string().datetime().optional(),
  error: SpanErrorSchema.optional(),
  agent_spans: z.array(AgentSpanSchema),
});
export type RepoSpan = z.infer<typeof RepoSpanSchema>;
