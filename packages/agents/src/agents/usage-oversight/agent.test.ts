/**
 * Usage Oversight Agent Tests
 *
 * Tests for the Usage Oversight Agent following the constitution requirements.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsageOversightAgent } from './agent.js';
import { createUsageOversightAgentForTesting } from './factory.js';
import type { UsageOversightInput, UsagePattern } from './types.js';
import type { AgentContext } from '../../contracts/base-agent.js';

// Mock data
const mockUsagePatterns: UsagePattern[] = [
  {
    usage_id: 'usage-001',
    organization_id: 'org_test123',
    user_id: 'usr_user1',
    model: 'gpt-4',
    provider: 'openai',
    prompt_tokens: 1000,
    completion_tokens: 500,
    total_tokens: 1500,
    cost_usd: 0.045,
    latency_ms: 1200,
    timestamp: '2024-01-15T10:00:00Z',
  },
  {
    usage_id: 'usage-002',
    organization_id: 'org_test123',
    user_id: 'usr_user2',
    model: 'gpt-4',
    provider: 'openai',
    prompt_tokens: 2000,
    completion_tokens: 1000,
    total_tokens: 3000,
    cost_usd: 0.09,
    latency_ms: 1500,
    timestamp: '2024-01-15T11:00:00Z',
  },
  {
    usage_id: 'usage-003',
    organization_id: 'org_test123',
    user_id: 'usr_user1',
    model: 'claude-3-sonnet',
    provider: 'anthropic',
    prompt_tokens: 500,
    completion_tokens: 250,
    total_tokens: 750,
    cost_usd: 0.02,
    latency_ms: 800,
    timestamp: '2024-01-16T10:00:00Z',
  },
];

const mockPolicyContext = {
  active_policies: [
    {
      policy_id: 'policy-001',
      policy_name: 'Standard Usage Policy',
      rules: [
        {
          rule_id: 'rule-001',
          rule_type: 'cost_limit',
          threshold: 100,
        },
        {
          rule_id: 'rule-002',
          rule_type: 'rate_limit',
          threshold: 1000,
        },
      ],
    },
  ],
  budget_limits: [
    {
      budget_id: 'budget-001',
      scope: 'organization' as const,
      scope_id: 'org_test123',
      limit_usd: 1000,
      current_spend_usd: 155,
      period: 'monthly' as const,
    },
  ],
  quota_limits: [
    {
      quota_id: 'quota-001',
      scope: 'organization' as const,
      scope_id: 'org_test123',
      quota_type: 'requests_per_day',
      limit_value: 10000,
      current_value: 3,
    },
  ],
};

const mockContext: AgentContext = {
  execution_ref: 'test-execution-001',
  request_timestamp: new Date().toISOString(),
  caller: {
    service: 'test-service',
    version: '1.0.0',
    trace_id: 'trace-001',
  },
  organization_id: 'org_test123',
};

describe('UsageOversightAgent', () => {
  let agent: UsageOversightAgent;

  beforeEach(() => {
    agent = createUsageOversightAgentForTesting();
  });

  describe('metadata', () => {
    it('should have correct agent_id', () => {
      expect(agent.metadata.agent_id).toBe('usage-oversight-agent');
    });

    it('should have correct classification', () => {
      expect(agent.metadata.classification).toBe('OVERSIGHT');
    });

    it('should have correct decision_type', () => {
      expect(agent.metadata.decision_type).toBe('usage_oversight_signal');
    });

    it('should have semantic version format', () => {
      expect(agent.metadata.agent_version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should list capabilities', () => {
      expect(agent.metadata.capabilities).toContain('Aggregate usage signals across systems');
      expect(agent.metadata.capabilities).toContain('Identify out-of-policy usage patterns');
    });

    it('should list restrictions', () => {
      expect(agent.metadata.restrictions).toContain('MUST NOT intercept execution');
      expect(agent.metadata.restrictions).toContain('MUST NOT enforce policies');
      expect(agent.metadata.restrictions).toContain('MUST NOT connect directly to Google SQL');
    });
  });

  describe('input validation', () => {
    it('should accept valid input', () => {
      const input: UsageOversightInput = {
        request_id: 'req-001',
        organization_id: 'org_test123',
        time_range: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T23:59:59Z',
        },
        usage_patterns: mockUsagePatterns,
        policy_context: mockPolicyContext,
      };

      expect(() => agent.validateInput(input)).not.toThrow();
    });

    it('should reject input without organization_id', () => {
      const input = {
        request_id: 'req-001',
        time_range: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T23:59:59Z',
        },
        usage_patterns: [],
        policy_context: mockPolicyContext,
      };

      expect(() => agent.validateInput(input)).toThrow();
    });

    it('should reject input with invalid time_range format', () => {
      const input = {
        request_id: 'req-001',
        organization_id: 'org_test123',
        time_range: {
          start: 'invalid-date',
          end: '2024-01-31T23:59:59Z',
        },
        usage_patterns: [],
        policy_context: mockPolicyContext,
      };

      expect(() => agent.validateInput(input)).toThrow();
    });
  });

  describe('execute', () => {
    it('should produce a DecisionEvent', async () => {
      const input: UsageOversightInput = {
        request_id: 'req-001',
        organization_id: 'org_test123',
        time_range: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T23:59:59Z',
        },
        usage_patterns: mockUsagePatterns,
        policy_context: mockPolicyContext,
      };

      const result = await agent.execute(input, mockContext);

      expect(result.success).toBe(true);
      expect(result.decision_event).toBeDefined();
      expect(result.decision_event.agent_id).toBe('usage-oversight-agent');
      expect(result.decision_event.decision_type).toBe('usage_oversight_signal');
    });

    it('should calculate usage summary correctly', async () => {
      const input: UsageOversightInput = {
        request_id: 'req-001',
        organization_id: 'org_test123',
        time_range: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T23:59:59Z',
        },
        usage_patterns: mockUsagePatterns,
        policy_context: mockPolicyContext,
      };

      const result = await agent.execute(input, mockContext);

      expect(result.success).toBe(true);
      expect(result.output.usage_summary.total_requests).toBe(3);
      expect(result.output.usage_summary.total_tokens).toBe(5250);
      expect(result.output.usage_summary.total_cost_usd).toBeCloseTo(0.155, 3);
      expect(result.output.usage_summary.unique_users).toBe(2);
      expect(result.output.usage_summary.unique_models).toBe(2);
    });

    it('should aggregate by model correctly', async () => {
      const input: UsageOversightInput = {
        request_id: 'req-001',
        organization_id: 'org_test123',
        time_range: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T23:59:59Z',
        },
        usage_patterns: mockUsagePatterns,
        policy_context: mockPolicyContext,
      };

      const result = await agent.execute(input, mockContext);

      const byModel = result.output.usage_summary.by_model;
      expect(byModel).toHaveLength(2);

      const gpt4 = byModel.find((m) => m.model === 'gpt-4');
      expect(gpt4).toBeDefined();
      expect(gpt4?.requests).toBe(2);
      expect(gpt4?.cost_usd).toBeCloseTo(0.135, 3);
    });

    it('should calculate governance health score', async () => {
      const input: UsageOversightInput = {
        request_id: 'req-001',
        organization_id: 'org_test123',
        time_range: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T23:59:59Z',
        },
        usage_patterns: mockUsagePatterns,
        policy_context: mockPolicyContext,
      };

      const result = await agent.execute(input, mockContext);

      expect(result.output.governance_health_score).toBeGreaterThanOrEqual(0);
      expect(result.output.governance_health_score).toBeLessThanOrEqual(100);
    });

    it('should include confidence metrics', async () => {
      const input: UsageOversightInput = {
        request_id: 'req-001',
        organization_id: 'org_test123',
        time_range: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T23:59:59Z',
        },
        usage_patterns: mockUsagePatterns,
        policy_context: mockPolicyContext,
      };

      const result = await agent.execute(input, mockContext);

      expect(result.decision_event.confidence).toBeDefined();
      expect(result.decision_event.confidence.coverage).toBeGreaterThanOrEqual(0);
      expect(result.decision_event.confidence.coverage).toBeLessThanOrEqual(1);
      expect(result.decision_event.confidence.completeness).toBeGreaterThanOrEqual(0);
      expect(result.decision_event.confidence.completeness).toBeLessThanOrEqual(1);
      expect(result.decision_event.confidence.overall).toBeGreaterThanOrEqual(0);
      expect(result.decision_event.confidence.overall).toBeLessThanOrEqual(1);
    });

    it('should include inputs_hash for audit trail', async () => {
      const input: UsageOversightInput = {
        request_id: 'req-001',
        organization_id: 'org_test123',
        time_range: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T23:59:59Z',
        },
        usage_patterns: mockUsagePatterns,
        policy_context: mockPolicyContext,
      };

      const result = await agent.execute(input, mockContext);

      expect(result.decision_event.inputs_hash).toBeDefined();
      expect(result.decision_event.inputs_hash).toHaveLength(64); // SHA-256 hex
    });
  });

  describe('budget warnings', () => {
    it('should detect critical budget status', async () => {
      const input: UsageOversightInput = {
        request_id: 'req-001',
        organization_id: 'org_test123',
        time_range: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T23:59:59Z',
        },
        usage_patterns: mockUsagePatterns,
        policy_context: {
          ...mockPolicyContext,
          budget_limits: [
            {
              budget_id: 'budget-001',
              scope: 'organization' as const,
              scope_id: 'org_test123',
              limit_usd: 100,
              current_spend_usd: 98, // 98% used
              period: 'monthly' as const,
            },
          ],
        },
      };

      const result = await agent.execute(input, mockContext);

      const criticalBudget = result.output.budget_status.find(
        (b) => b.status === 'critical'
      );
      expect(criticalBudget).toBeDefined();
    });

    it('should create pattern for budget warning', async () => {
      const input: UsageOversightInput = {
        request_id: 'req-001',
        organization_id: 'org_test123',
        time_range: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T23:59:59Z',
        },
        usage_patterns: mockUsagePatterns,
        policy_context: {
          ...mockPolicyContext,
          budget_limits: [
            {
              budget_id: 'budget-001',
              scope: 'organization' as const,
              scope_id: 'org_test123',
              limit_usd: 100,
              current_spend_usd: 85, // 85% used - warning level
              period: 'monthly' as const,
            },
          ],
        },
      };

      const result = await agent.execute(input, mockContext);

      const budgetPattern = result.output.out_of_policy_patterns.find(
        (p) => p.category === 'budget_warning'
      );
      expect(budgetPattern).toBeDefined();
      expect(budgetPattern?.severity).toBe('warning');
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const health = await agent.healthCheck();
      expect(health.healthy).toBe(true);
    });
  });

  describe('constitutional compliance', () => {
    it('should NOT intercept execution', () => {
      // Agent has no methods for interception
      expect(typeof (agent as any).interceptRequest).toBe('undefined');
      expect(typeof (agent as any).modifyRequest).toBe('undefined');
    });

    it('should NOT have SQL execution capabilities', () => {
      // Agent has no SQL methods
      expect(typeof (agent as any).executeSql).toBe('undefined');
      expect(typeof (agent as any).query).toBe('undefined');
      expect(typeof (agent as any).connect).toBe('undefined');
    });

    it('should only produce read-only analysis', async () => {
      const input: UsageOversightInput = {
        request_id: 'req-001',
        organization_id: 'org_test123',
        time_range: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T23:59:59Z',
        },
        usage_patterns: mockUsagePatterns,
        policy_context: mockPolicyContext,
      };

      const result = await agent.execute(input, mockContext);

      // Output should be analysis/visibility only, no enforcement actions
      expect(result.output).not.toHaveProperty('enforcePolicy');
      expect(result.output).not.toHaveProperty('blockRequest');
      expect(result.output).not.toHaveProperty('modifyConfiguration');
    });
  });
});
