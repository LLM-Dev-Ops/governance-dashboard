import { describe, it, expect } from 'vitest';
import {
  extractExecutionContext,
  createRepoSpan,
  createAgentSpan,
  attachArtifact,
  completeAgentSpan,
  failAgentSpan,
  finalizeRepoSpan,
  buildExecutionResponse,
  buildContextRejectionResponse,
} from './execution-span-manager.js';

describe('extractExecutionContext', () => {
  it('returns null when x-parent-span-id is missing', () => {
    const result = extractExecutionContext({
      'x-execution-id': 'exec-1',
    });
    expect(result).toBeNull();
  });

  it('returns null when both headers are missing', () => {
    const result = extractExecutionContext({});
    expect(result).toBeNull();
  });

  it('returns null when execution id headers are missing', () => {
    const result = extractExecutionContext({
      'x-parent-span-id': 'span-parent',
    });
    expect(result).toBeNull();
  });

  it('extracts context from valid headers', () => {
    const result = extractExecutionContext({
      'x-execution-id': 'exec-1',
      'x-parent-span-id': 'span-parent',
    });
    expect(result).toEqual({
      execution_id: 'exec-1',
      parent_span_id: 'span-parent',
    });
  });

  it('falls back to x-request-id for execution_id', () => {
    const result = extractExecutionContext({
      'x-request-id': 'req-1',
      'x-parent-span-id': 'span-parent',
    });
    expect(result?.execution_id).toBe('req-1');
    expect(result?.parent_span_id).toBe('span-parent');
  });

  it('prefers x-execution-id over x-request-id', () => {
    const result = extractExecutionContext({
      'x-execution-id': 'exec-1',
      'x-request-id': 'req-1',
      'x-parent-span-id': 'span-parent',
    });
    expect(result?.execution_id).toBe('exec-1');
  });

  it('handles array header values', () => {
    const result = extractExecutionContext({
      'x-execution-id': ['exec-1', 'exec-2'],
      'x-parent-span-id': ['span-1'],
    });
    expect(result?.execution_id).toBe('exec-1');
    expect(result?.parent_span_id).toBe('span-1');
  });
});

describe('createRepoSpan', () => {
  it('creates a span with type repo and RUNNING status', () => {
    const span = createRepoSpan({ execution_id: 'e1', parent_span_id: 'p1' });
    expect(span.type).toBe('repo');
    expect(span.status).toBe('RUNNING');
    expect(span.parent_span_id).toBe('p1');
    expect(span.execution_id).toBe('e1');
    expect(span.repo_name).toBe('llm-governance-dashboard');
    expect(span.agent_spans).toEqual([]);
    expect(span.span_id).toBeTruthy();
    expect(span.start_time).toBeTruthy();
    expect(span.end_time).toBeUndefined();
  });

  it('generates unique span_ids', () => {
    const span1 = createRepoSpan({ execution_id: 'e1', parent_span_id: 'p1' });
    const span2 = createRepoSpan({ execution_id: 'e1', parent_span_id: 'p1' });
    expect(span1.span_id).not.toBe(span2.span_id);
  });
});

describe('createAgentSpan', () => {
  it('creates an agent span parented to the repo span', () => {
    const repo = createRepoSpan({ execution_id: 'e1', parent_span_id: 'p1' });
    const agent = createAgentSpan(repo, 'usage-oversight');
    expect(agent.type).toBe('agent');
    expect(agent.parent_span_id).toBe(repo.span_id);
    expect(agent.agent_name).toBe('usage-oversight');
    expect(agent.repo_name).toBe('llm-governance-dashboard');
    expect(agent.status).toBe('RUNNING');
    expect(agent.artifacts).toEqual([]);
    expect(agent.start_time).toBeTruthy();
    expect(agent.end_time).toBeUndefined();
  });

  it('generates unique span_ids per agent', () => {
    const repo = createRepoSpan({ execution_id: 'e1', parent_span_id: 'p1' });
    const a1 = createAgentSpan(repo, 'agent-a');
    const a2 = createAgentSpan(repo, 'agent-b');
    expect(a1.span_id).not.toBe(a2.span_id);
  });
});

describe('attachArtifact', () => {
  it('appends an artifact to the agent span', () => {
    const repo = createRepoSpan({ execution_id: 'e1', parent_span_id: 'p1' });
    const agent = createAgentSpan(repo, 'test-agent');
    attachArtifact(agent, 'decision_event', { id: 'de-1', decision_type: 'test' });
    expect(agent.artifacts).toHaveLength(1);
    expect(agent.artifacts[0].artifact_type).toBe('decision_event');
    expect(agent.artifacts[0].data.id).toBe('de-1');
    expect(agent.artifacts[0].artifact_id).toBeTruthy();
  });

  it('appends multiple artifacts', () => {
    const repo = createRepoSpan({ execution_id: 'e1', parent_span_id: 'p1' });
    const agent = createAgentSpan(repo, 'test-agent');
    attachArtifact(agent, 'decision_event', { id: 'de-1' });
    attachArtifact(agent, 'metric', { name: 'latency', value: 100 });
    expect(agent.artifacts).toHaveLength(2);
    expect(agent.artifacts[0].artifact_type).toBe('decision_event');
    expect(agent.artifacts[1].artifact_type).toBe('metric');
  });
});

describe('completeAgentSpan', () => {
  it('sets status to COMPLETED with end_time', () => {
    const repo = createRepoSpan({ execution_id: 'e1', parent_span_id: 'p1' });
    const agent = createAgentSpan(repo, 'test-agent');
    completeAgentSpan(agent);
    expect(agent.status).toBe('COMPLETED');
    expect(agent.end_time).toBeTruthy();
  });
});

describe('failAgentSpan', () => {
  it('sets status to FAILED with error and end_time', () => {
    const repo = createRepoSpan({ execution_id: 'e1', parent_span_id: 'p1' });
    const agent = createAgentSpan(repo, 'test-agent');
    failAgentSpan(agent, { code: 'ERR', message: 'broken' });
    expect(agent.status).toBe('FAILED');
    expect(agent.error?.code).toBe('ERR');
    expect(agent.error?.message).toBe('broken');
    expect(agent.end_time).toBeTruthy();
  });

  it('includes optional details in error', () => {
    const repo = createRepoSpan({ execution_id: 'e1', parent_span_id: 'p1' });
    const agent = createAgentSpan(repo, 'test-agent');
    failAgentSpan(agent, { code: 'ERR', message: 'broken', details: { field: 'value' } });
    expect(agent.error?.details).toEqual({ field: 'value' });
  });
});

describe('finalizeRepoSpan', () => {
  it('marks FAILED when no agent spans exist', () => {
    const repo = createRepoSpan({ execution_id: 'e1', parent_span_id: 'p1' });
    finalizeRepoSpan(repo);
    expect(repo.status).toBe('FAILED');
    expect(repo.error?.code).toBe('NO_AGENT_SPANS');
    expect(repo.end_time).toBeTruthy();
  });

  it('marks COMPLETED when all agent spans completed', () => {
    const repo = createRepoSpan({ execution_id: 'e1', parent_span_id: 'p1' });
    const agent = createAgentSpan(repo, 'test');
    completeAgentSpan(agent);
    repo.agent_spans.push(agent);
    finalizeRepoSpan(repo);
    expect(repo.status).toBe('COMPLETED');
    expect(repo.error).toBeUndefined();
    expect(repo.end_time).toBeTruthy();
  });

  it('marks FAILED when any agent span failed', () => {
    const repo = createRepoSpan({ execution_id: 'e1', parent_span_id: 'p1' });
    const a1 = createAgentSpan(repo, 'ok-agent');
    completeAgentSpan(a1);
    repo.agent_spans.push(a1);
    const a2 = createAgentSpan(repo, 'bad-agent');
    failAgentSpan(a2, { code: 'ERR', message: 'fail' });
    repo.agent_spans.push(a2);
    finalizeRepoSpan(repo);
    expect(repo.status).toBe('FAILED');
    expect(repo.error?.code).toBe('AGENT_EXECUTION_FAILED');
    expect(repo.error?.message).toContain('bad-agent');
    expect(repo.error?.message).not.toContain('ok-agent');
  });

  it('marks FAILED when all agent spans failed', () => {
    const repo = createRepoSpan({ execution_id: 'e1', parent_span_id: 'p1' });
    const a1 = createAgentSpan(repo, 'agent-a');
    failAgentSpan(a1, { code: 'ERR', message: 'fail-a' });
    repo.agent_spans.push(a1);
    const a2 = createAgentSpan(repo, 'agent-b');
    failAgentSpan(a2, { code: 'ERR', message: 'fail-b' });
    repo.agent_spans.push(a2);
    finalizeRepoSpan(repo);
    expect(repo.status).toBe('FAILED');
    expect(repo.error?.message).toContain('agent-a');
    expect(repo.error?.message).toContain('agent-b');
  });
});

describe('buildExecutionResponse', () => {
  it('produces a valid response envelope', () => {
    const repo = createRepoSpan({ execution_id: 'e1', parent_span_id: 'p1' });
    const agent = createAgentSpan(repo, 'test');
    completeAgentSpan(agent);
    repo.agent_spans.push(agent);
    finalizeRepoSpan(repo);

    const response = buildExecutionResponse(repo, { success: true });
    expect(response.execution_id).toBe('e1');
    expect(response.repo_span).toBe(repo);
    expect(response.result).toEqual({ success: true });
  });

  it('works without result', () => {
    const repo = createRepoSpan({ execution_id: 'e1', parent_span_id: 'p1' });
    finalizeRepoSpan(repo);
    const response = buildExecutionResponse(repo);
    expect(response.execution_id).toBe('e1');
    expect(response.result).toBeUndefined();
  });
});

describe('buildContextRejectionResponse', () => {
  it('produces error with required headers listed', () => {
    const resp = buildContextRejectionResponse();
    expect(resp.error.code).toBe('MISSING_EXECUTION_CONTEXT');
    expect(resp.error.required_headers).toContain('x-execution-id');
    expect(resp.error.required_headers).toContain('x-parent-span-id');
  });
});
