/**
 * Change Impact Agent Tests
 *
 * Verification tests for the Change Impact Agent.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChangeImpactAgent } from './agent.js';
import type { ChangeImpactInput } from '../../contracts/change-impact.js';
import {
  validateChangeImpactInput,
  validateChangeImpactOutput,
  impactLevelFromScore,
  riskClassificationFromScore,
  CHANGE_IMPACT_AGENT_METADATA,
} from '../../contracts/change-impact.js';
import type { AgentContext } from '../../contracts/base-agent.js';

// Mock RuvectorClient
const mockRuvectorClient = {
  persist: vi.fn().mockResolvedValue({ id: 'test-decision-id' }),
  query: vi.fn().mockResolvedValue({ items: [] }),
};

// Mock TelemetryEmitter
const mockTelemetryEmitter = {
  emitInvocationStart: vi.fn(),
  emitInvocationSuccess: vi.fn(),
  emitInvocationFailure: vi.fn(),
  emitHealthCheck: vi.fn(),
};

describe('ChangeImpactAgent', () => {
  let agent: ChangeImpactAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new ChangeImpactAgent({
      ruvectorClient: mockRuvectorClient as any,
      telemetryEmitter: mockTelemetryEmitter as any,
      dryRun: true,
    });
  });

  describe('metadata', () => {
    it('should have correct agent metadata', () => {
      expect(agent.metadata.agent_id).toBe('change-impact-agent');
      expect(agent.metadata.agent_version).toBe('1.0.0');
      expect(agent.metadata.decision_type).toBe('change_impact_assessment');
      expect(agent.metadata.classification).toBe('GOVERNANCE_ANALYSIS');
    });

    it('should have proper capabilities defined', () => {
      expect(CHANGE_IMPACT_AGENT_METADATA.capabilities).toContain('historical_change_analysis');
      expect(CHANGE_IMPACT_AGENT_METADATA.capabilities).toContain('affected_system_evaluation');
      expect(CHANGE_IMPACT_AGENT_METADATA.capabilities).toContain('risk_indicator_surfacing');
    });

    it('should have proper constraints defined', () => {
      expect(CHANGE_IMPACT_AGENT_METADATA.constraints).toContain('does_not_enforce_policies');
      expect(CHANGE_IMPACT_AGENT_METADATA.constraints).toContain('does_not_execute_changes');
      expect(CHANGE_IMPACT_AGENT_METADATA.constraints).toContain('read_only_analysis');
    });
  });

  describe('execute', () => {
    const validInput: ChangeImpactInput = {
      organization_id: 'org-123',
      change_request: {
        change_id: 'ch-456',
        change_type: 'update',
        subject_type: 'policy',
        subject_id: 'pol-789',
        description: 'Update rate limiting policy',
        timestamp: new Date().toISOString(),
        initiator: 'user@example.com',
      },
      include_downstream: true,
      include_risk_projection: false,
    };

    const context: AgentContext = {
      execution_ref: {
        request_id: 'req-001',
        trace_id: 'trace-001',
      },
      caller: {
        service: 'test-service',
        user_id: 'user-123',
      },
    };

    it('should successfully execute impact assessment for policy change', async () => {
      const result = await agent.execute(validInput, context);

      expect(result.success).toBe(true);
      expect(result.output.assessment).toBeDefined();
      expect(result.output.assessment.change_request_id).toBe('ch-456');
      expect(result.output.telemetry_ref).toContain('change-impact-agent');
    });

    it('should analyze policy impacts correctly', async () => {
      const result = await agent.execute(validInput, context);

      expect(result.output.assessment.impacts.length).toBeGreaterThan(0);
      expect(result.output.assessment.impacts[0].area).toBe('policy_enforcement');
    });

    it('should identify affected systems for policy change', async () => {
      const result = await agent.execute(validInput, context);

      expect(result.output.assessment.affected_systems.length).toBeGreaterThan(0);
      expect(result.output.assessment.affected_systems[0].system_id).toBe('policy-engine');
    });

    it('should generate risk indicators', async () => {
      const result = await agent.execute(validInput, context);

      expect(result.output.assessment.risk_indicators.length).toBeGreaterThan(0);
      expect(result.output.assessment.risk_indicators[0].category).toBe('compliance_risk');
    });

    it('should generate recommendations', async () => {
      const result = await agent.execute(validInput, context);

      expect(result.output.assessment.recommendations.length).toBeGreaterThan(0);
    });

    it('should emit telemetry events', async () => {
      await agent.execute(validInput, context);

      expect(mockTelemetryEmitter.emitInvocationStart).toHaveBeenCalled();
      expect(mockTelemetryEmitter.emitInvocationSuccess).toHaveBeenCalled();
    });

    it('should handle model/provider changes with higher risk', async () => {
      const modelInput: ChangeImpactInput = {
        ...validInput,
        change_request: {
          ...validInput.change_request,
          subject_type: 'llm_model',
          subject_id: 'gpt-4',
        },
      };

      const result = await agent.execute(modelInput, context);

      expect(result.output.assessment.impacts[0].area).toBe('model_behavior');
      expect(result.output.assessment.impacts[0].level).toBe('high');
    });

    it('should handle access control changes', async () => {
      const accessInput: ChangeImpactInput = {
        ...validInput,
        change_request: {
          ...validInput.change_request,
          subject_type: 'access_control',
          subject_id: 'acl-001',
        },
      };

      const result = await agent.execute(accessInput, context);

      expect(result.output.assessment.impacts[0].area).toBe('access_control');
      expect(result.output.assessment.risk_indicators[0].category).toBe('security_risk');
    });

    it('should handle budget changes', async () => {
      const budgetInput: ChangeImpactInput = {
        ...validInput,
        change_request: {
          ...validInput.change_request,
          subject_type: 'budget',
          change_type: 'budget_adjust',
          subject_id: 'budget-001',
        },
      };

      const result = await agent.execute(budgetInput, context);

      expect(result.output.assessment.impacts[0].area).toBe('cost');
      expect(result.output.assessment.risk_indicators[0].category).toBe('financial_risk');
    });
  });

  describe('validateInput', () => {
    it('should validate valid input', () => {
      const input = {
        organization_id: 'org-123',
        change_request: {
          change_id: 'ch-456',
          change_type: 'update',
          subject_type: 'policy',
          subject_id: 'pol-789',
          description: 'Update policy',
          timestamp: new Date().toISOString(),
          initiator: 'user@example.com',
        },
      };

      const result = agent.validateInput(input);
      expect(result.organization_id).toBe('org-123');
    });

    it('should reject invalid change_type', () => {
      const input = {
        organization_id: 'org-123',
        change_request: {
          change_id: 'ch-456',
          change_type: 'invalid_type',
          subject_type: 'policy',
          subject_id: 'pol-789',
          description: 'Update policy',
          timestamp: new Date().toISOString(),
          initiator: 'user@example.com',
        },
      };

      expect(() => agent.validateInput(input)).toThrow();
    });

    it('should reject missing organization_id', () => {
      const input = {
        change_request: {
          change_id: 'ch-456',
          change_type: 'update',
          subject_type: 'policy',
          subject_id: 'pol-789',
          description: 'Update policy',
          timestamp: new Date().toISOString(),
          initiator: 'user@example.com',
        },
      };

      expect(() => agent.validateInput(input)).toThrow();
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const result = await agent.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.details?.agent_id).toBe('change-impact-agent');
    });

    it('should emit health check telemetry', async () => {
      await agent.healthCheck();

      expect(mockTelemetryEmitter.emitHealthCheck).toHaveBeenCalledWith(
        agent.metadata,
        true
      );
    });
  });
});

describe('Change Impact Contract Utilities', () => {
  describe('impactLevelFromScore', () => {
    it('should return correct impact levels', () => {
      expect(impactLevelFromScore(0)).toBe('none');
      expect(impactLevelFromScore(0.15)).toBe('minimal');
      expect(impactLevelFromScore(0.3)).toBe('low');
      expect(impactLevelFromScore(0.5)).toBe('moderate');
      expect(impactLevelFromScore(0.75)).toBe('high');
      expect(impactLevelFromScore(0.9)).toBe('critical');
    });
  });

  describe('riskClassificationFromScore', () => {
    it('should return correct risk classifications', () => {
      expect(riskClassificationFromScore(0.1)).toBe('acceptable');
      expect(riskClassificationFromScore(0.25)).toBe('low_risk');
      expect(riskClassificationFromScore(0.45)).toBe('medium_risk');
      expect(riskClassificationFromScore(0.65)).toBe('high_risk');
      expect(riskClassificationFromScore(0.8)).toBe('critical_risk');
      expect(riskClassificationFromScore(0.9)).toBe('unacceptable');
    });
  });

  describe('validateChangeImpactInput', () => {
    it('should validate a complete input', () => {
      const input = {
        organization_id: 'org-123',
        change_request: {
          change_id: 'ch-456',
          change_type: 'policy_modify',
          subject_type: 'policy_rule',
          subject_id: 'rule-789',
          description: 'Modify policy rule',
          timestamp: '2024-01-15T10:00:00Z',
          initiator: 'admin@example.com',
        },
        scope: {
          teams: ['team-1', 'team-2'],
          analysis_depth: 3,
          include_cost_impact: true,
          include_compliance_impact: true,
        },
        include_downstream: true,
        include_risk_projection: true,
      };

      const result = validateChangeImpactInput(input);
      expect(result.organization_id).toBe('org-123');
      expect(result.scope?.analysis_depth).toBe(3);
    });

    it('should validate all change types', () => {
      const changeTypes = [
        'create', 'update', 'delete', 'toggle', 'configure',
        'policy_modify', 'access_change', 'model_version',
        'budget_adjust', 'quota_modify',
      ];

      for (const changeType of changeTypes) {
        const input = {
          organization_id: 'org-123',
          change_request: {
            change_id: 'ch-456',
            change_type,
            subject_type: 'policy',
            subject_id: 'pol-789',
            description: 'Test',
            timestamp: '2024-01-15T10:00:00Z',
            initiator: 'user@example.com',
          },
        };

        expect(() => validateChangeImpactInput(input)).not.toThrow();
      }
    });

    it('should validate all subject types', () => {
      const subjectTypes = [
        'policy', 'policy_rule', 'configuration', 'llm_model',
        'llm_provider', 'budget', 'quota', 'access_control',
        'team', 'user', 'organization', 'integration', 'webhook',
      ];

      for (const subjectType of subjectTypes) {
        const input = {
          organization_id: 'org-123',
          change_request: {
            change_id: 'ch-456',
            change_type: 'update',
            subject_type: subjectType,
            subject_id: 'test-id',
            description: 'Test',
            timestamp: '2024-01-15T10:00:00Z',
            initiator: 'user@example.com',
          },
        };

        expect(() => validateChangeImpactInput(input)).not.toThrow();
      }
    });
  });

  describe('validateChangeImpactOutput', () => {
    it('should validate a complete output', () => {
      const output = {
        assessment: {
          id: 'assess-123',
          change_request_id: 'ch-456',
          impact_level: 'moderate',
          risk_score: 0.45,
          risk_classification: 'medium_risk',
          summary: 'Impact assessment summary',
          impacts: [{
            area: 'policy_enforcement',
            level: 'moderate',
            description: 'Test impact',
            affected_entities: ['entity-1'],
          }],
          affected_systems: [{
            system_id: 'sys-1',
            system_name: 'Test System',
            system_type: 'enforcement',
            impact_description: 'Test impact',
            severity: 'medium',
            dependencies: [],
          }],
          policy_implications: [],
          compliance_implications: [],
          risk_indicators: [],
          recommendations: [{
            id: 'rec-1',
            priority: 'medium',
            recommendation_type: 'review_required',
            recommendation: 'Review the change',
            rationale: 'Medium risk level',
            related_risks: [],
          }],
          assessed_at: '2024-01-15T10:00:00Z',
        },
        telemetry_ref: 'observatory://telemetry/change-impact-agent/assess-123',
      };

      const result = validateChangeImpactOutput(output);
      expect(result.assessment.id).toBe('assess-123');
    });
  });
});

describe('Change Impact Agent - Error Handling', () => {
  let agent: ChangeImpactAgent;

  beforeEach(() => {
    agent = new ChangeImpactAgent({
      ruvectorClient: mockRuvectorClient as any,
      telemetryEmitter: mockTelemetryEmitter as any,
      dryRun: true,
    });
  });

  it('should handle invalid input gracefully', async () => {
    const invalidInput = {
      organization_id: '', // Empty - invalid
      change_request: {
        change_id: 'ch-456',
        change_type: 'update',
        subject_type: 'policy',
        subject_id: 'pol-789',
        description: 'Update policy',
        timestamp: new Date().toISOString(),
        initiator: 'user@example.com',
      },
    };

    const context: AgentContext = {
      execution_ref: { request_id: 'req-001' },
      caller: { service: 'test' },
    };

    const result = await agent.execute(invalidInput as any, context);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(mockTelemetryEmitter.emitInvocationFailure).toHaveBeenCalled();
  });
});
