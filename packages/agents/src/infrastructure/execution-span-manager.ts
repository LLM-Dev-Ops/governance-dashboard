/**
 * Execution Span Manager
 *
 * Stateless utility functions for creating, managing, and finalizing
 * execution spans. Each handler invocation constructs its own span tree.
 *
 * This module enforces the Foundational Execution Unit contract:
 * - Every externally-invoked operation requires execution context
 * - Repo-level spans wrap all agent executions
 * - Agent-level spans are mandatory for every agent that executes
 * - Artifacts are attached at the agent level only
 * - No agent spans = execution is INVALID
 */

import { generateUUID, getCurrentTimestamp } from '../contracts/validation.js';
import type { RepoSpan, AgentSpan, SpanArtifact } from '../contracts/execution-span.js';

const REPO_NAME = 'llm-governance-dashboard';

/**
 * Execution context extracted from incoming request headers.
 */
export interface ExecutionContext {
  execution_id: string;
  parent_span_id: string;
}

/**
 * Extract execution context from request headers.
 * Returns null if required parent_span_id is missing.
 *
 * Required: x-parent-span-id
 * execution_id: x-execution-id (preferred) or x-request-id (fallback)
 */
export function extractExecutionContext(
  headers: Record<string, string | string[] | undefined>
): ExecutionContext | null {
  const parentSpanId = asString(headers['x-parent-span-id']);
  if (!parentSpanId) {
    return null;
  }

  const executionId = asString(headers['x-execution-id'])
    ?? asString(headers['x-request-id']);
  if (!executionId) {
    return null;
  }

  return { execution_id: executionId, parent_span_id: parentSpanId };
}

/**
 * Create a new repo-level span.
 * Called once per handler invocation.
 */
export function createRepoSpan(ctx: ExecutionContext): RepoSpan {
  return {
    type: 'repo',
    span_id: generateUUID(),
    parent_span_id: ctx.parent_span_id,
    execution_id: ctx.execution_id,
    repo_name: REPO_NAME,
    status: 'RUNNING',
    start_time: getCurrentTimestamp(),
    end_time: undefined,
    agent_spans: [],
  };
}

/**
 * Create a new agent-level span.
 * parent_span_id is always the repo span's span_id.
 */
export function createAgentSpan(
  repoSpan: RepoSpan,
  agentName: string
): AgentSpan {
  return {
    type: 'agent',
    span_id: generateUUID(),
    parent_span_id: repoSpan.span_id,
    agent_name: agentName,
    repo_name: REPO_NAME,
    status: 'RUNNING',
    start_time: getCurrentTimestamp(),
    end_time: undefined,
    artifacts: [],
  };
}

/**
 * Attach an artifact (e.g. DecisionEvent) to an agent span.
 * Artifacts MUST be attached at the agent level, never at repo level.
 */
export function attachArtifact(
  agentSpan: AgentSpan,
  artifactType: string,
  data: Record<string, unknown>
): void {
  const artifact: SpanArtifact = {
    artifact_id: generateUUID(),
    artifact_type: artifactType,
    data,
  };
  agentSpan.artifacts.push(artifact);
}

/**
 * Finalize an agent span as COMPLETED.
 */
export function completeAgentSpan(agentSpan: AgentSpan): void {
  agentSpan.status = 'COMPLETED';
  agentSpan.end_time = getCurrentTimestamp();
}

/**
 * Finalize an agent span as FAILED with error details.
 */
export function failAgentSpan(
  agentSpan: AgentSpan,
  error: { code: string; message: string; details?: Record<string, unknown> }
): void {
  agentSpan.status = 'FAILED';
  agentSpan.end_time = getCurrentTimestamp();
  agentSpan.error = error;
}

/**
 * Finalize the repo span.
 *
 * ENFORCEMENT:
 * - If no agent spans were emitted, status is FAILED (execution is INVALID)
 * - If any agent span is FAILED, repo span is FAILED
 * - Only COMPLETED if all agent spans are COMPLETED
 * - All emitted spans are preserved regardless of status
 */
export function finalizeRepoSpan(repoSpan: RepoSpan): void {
  repoSpan.end_time = getCurrentTimestamp();

  if (repoSpan.agent_spans.length === 0) {
    repoSpan.status = 'FAILED';
    repoSpan.error = {
      code: 'NO_AGENT_SPANS',
      message: 'Execution completed without any agent spans. This is forbidden.',
    };
    return;
  }

  const hasFailedAgent = repoSpan.agent_spans.some(
    (s) => s.status === 'FAILED'
  );

  if (hasFailedAgent) {
    repoSpan.status = 'FAILED';
    const failedAgents = repoSpan.agent_spans
      .filter((s) => s.status === 'FAILED')
      .map((s) => s.agent_name);
    repoSpan.error = {
      code: 'AGENT_EXECUTION_FAILED',
      message: `Agent(s) failed: ${failedAgents.join(', ')}`,
    };
  } else {
    repoSpan.status = 'COMPLETED';
  }
}

/**
 * Build the execution response envelope.
 * This is the ONLY shape that handlers return for agent execution routes.
 */
export function buildExecutionResponse(
  repoSpan: RepoSpan,
  result?: Record<string, unknown>
): {
  execution_id: string;
  repo_span: RepoSpan;
  result?: Record<string, unknown>;
} {
  return {
    execution_id: repoSpan.execution_id,
    repo_span: repoSpan,
    result,
  };
}

/**
 * Build a rejection response for when execution context is missing.
 */
export function buildContextRejectionResponse(): {
  error: {
    code: string;
    message: string;
    required_headers: string[];
  };
} {
  return {
    error: {
      code: 'MISSING_EXECUTION_CONTEXT',
      message:
        'Execution rejected: parent_span_id is required. '
        + 'This repo is a Foundational Execution Unit and must be invoked with execution context.',
      required_headers: ['x-execution-id', 'x-parent-span-id'],
    },
  };
}

function asString(
  value: string | string[] | undefined
): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0) return value[0];
  return undefined;
}
