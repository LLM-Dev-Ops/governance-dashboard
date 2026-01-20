/**
 * DecisionEvent Schema Tests
 */

import { describe, it, expect } from 'vitest';
import {
  validateDecisionEvent,
  safeValidateDecisionEvent,
  DecisionEventSchema,
  type DecisionEvent,
} from './decision-event.js';

const validDecisionEvent: DecisionEvent = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  agent_id: 'usage-oversight-agent',
  agent_version: '1.0.0',
  decision_type: 'usage_oversight_signal',
  inputs_hash: 'a'.repeat(64),
  outputs: {
    governance_health_score: 85,
  },
  confidence: {
    coverage: 0.95,
    completeness: 0.9,
    overall: 0.93,
  },
  constraints_applied: {
    policy_scope: ['policy-001'],
    org_boundaries: {
      organization_id: 'org_test123',
    },
    time_window: {
      start: '2024-01-01T00:00:00Z',
      end: '2024-01-31T23:59:59Z',
    },
  },
  execution_ref: 'exec-001',
  timestamp: '2024-01-15T10:00:00Z',
};

describe('DecisionEventSchema', () => {
  describe('validateDecisionEvent', () => {
    it('should accept valid decision event', () => {
      expect(() => validateDecisionEvent(validDecisionEvent)).not.toThrow();
    });

    it('should reject missing required fields', () => {
      const invalid = { ...validDecisionEvent };
      delete (invalid as any).agent_id;

      expect(() => validateDecisionEvent(invalid)).toThrow();
    });

    it('should reject invalid UUID', () => {
      const invalid = {
        ...validDecisionEvent,
        id: 'not-a-uuid',
      };

      expect(() => validateDecisionEvent(invalid)).toThrow();
    });

    it('should reject invalid version format', () => {
      const invalid = {
        ...validDecisionEvent,
        agent_version: 'v1.0',
      };

      expect(() => validateDecisionEvent(invalid)).toThrow();
    });

    it('should reject invalid decision_type', () => {
      const invalid = {
        ...validDecisionEvent,
        decision_type: 'invalid_type',
      };

      expect(() => validateDecisionEvent(invalid)).toThrow();
    });

    it('should reject confidence values out of range', () => {
      const invalid = {
        ...validDecisionEvent,
        confidence: {
          coverage: 1.5, // Invalid: > 1
          completeness: 0.9,
          overall: 0.93,
        },
      };

      expect(() => validateDecisionEvent(invalid)).toThrow();
    });

    it('should reject invalid timestamp format', () => {
      const invalid = {
        ...validDecisionEvent,
        timestamp: '2024/01/15',
      };

      expect(() => validateDecisionEvent(invalid)).toThrow();
    });
  });

  describe('safeValidateDecisionEvent', () => {
    it('should return success for valid input', () => {
      const result = safeValidateDecisionEvent(validDecisionEvent);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should return error for invalid input', () => {
      const result = safeValidateDecisionEvent({});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
    });
  });

  describe('DecisionType enum', () => {
    it('should accept usage_oversight_signal', () => {
      const event = {
        ...validDecisionEvent,
        decision_type: 'usage_oversight_signal',
      };

      expect(() => validateDecisionEvent(event)).not.toThrow();
    });

    it('should accept audit_summary', () => {
      const event = {
        ...validDecisionEvent,
        decision_type: 'audit_summary',
      };

      expect(() => validateDecisionEvent(event)).not.toThrow();
    });

    it('should accept compliance_status', () => {
      const event = {
        ...validDecisionEvent,
        decision_type: 'compliance_status',
      };

      expect(() => validateDecisionEvent(event)).not.toThrow();
    });
  });

  describe('Confidence schema', () => {
    it('should accept confidence_band', () => {
      const event = {
        ...validDecisionEvent,
        confidence: {
          coverage: 0.95,
          completeness: 0.9,
          overall: 0.93,
          confidence_band: {
            lower: 0.85,
            upper: 0.98,
          },
        },
      };

      expect(() => validateDecisionEvent(event)).not.toThrow();
    });
  });

  describe('ConstraintsApplied schema', () => {
    it('should accept team_ids and user_ids', () => {
      const event = {
        ...validDecisionEvent,
        constraints_applied: {
          ...validDecisionEvent.constraints_applied,
          org_boundaries: {
            organization_id: 'org_test123',
            team_ids: ['team_001', 'team_002'],
            user_ids: ['usr_001'],
          },
        },
      };

      expect(() => validateDecisionEvent(event)).not.toThrow();
    });

    it('should accept compliance_rules', () => {
      const event = {
        ...validDecisionEvent,
        constraints_applied: {
          ...validDecisionEvent.constraints_applied,
          compliance_rules: ['GDPR', 'HIPAA'],
        },
      };

      expect(() => validateDecisionEvent(event)).not.toThrow();
    });
  });

  describe('Telemetry field', () => {
    it('should accept telemetry data', () => {
      const event = {
        ...validDecisionEvent,
        telemetry: {
          latency_ms: 150,
          memory_mb: 256,
          source_system: 'governance-dashboard',
        },
      };

      expect(() => validateDecisionEvent(event)).not.toThrow();
    });
  });
});
