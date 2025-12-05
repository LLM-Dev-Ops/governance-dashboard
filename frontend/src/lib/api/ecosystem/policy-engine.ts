/**
 * Policy Engine Consumer Adapter
 *
 * Consumes policy evaluation results, compliance rule states, and enforcement
 * decisions from the LLM-Policy-Engine upstream service.
 */

import type { UpstreamConfig, EcosystemResponse } from './types';

/** Enforcement decision from policy evaluation */
export type EnforcementDecision = 'allow' | 'deny' | 'warn' | 'require_approval' | 'rate_limit';

/** Policy evaluation result from upstream Policy Engine */
export interface PolicyEvaluationResult {
  policy_id: string;
  policy_name: string;
  decision: EnforcementDecision;
  evaluated_at: string;
  matched_rules: MatchedRule[];
  context: Record<string, unknown>;
}

/** A rule that matched during policy evaluation */
export interface MatchedRule {
  rule_id: string;
  rule_type: string;
  severity: string;
  message: string;
}

/** Compliance rule state from upstream */
export interface ComplianceRuleState {
  rule_id: string;
  rule_name: string;
  is_compliant: boolean;
  last_checked: string;
  violation_count: number;
  details?: string;
}

/** Aggregated compliance status */
export interface ComplianceStatus {
  overall_compliant: boolean;
  total_rules: number;
  passing_rules: number;
  failing_rules: number;
  rule_states: ComplianceRuleState[];
  last_updated: string;
}

/** Create a Policy Engine consumer adapter */
export function createPolicyEngineConsumer(config: UpstreamConfig) {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const fetchJson = async <T>(url: string): Promise<T> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs || 30000);

    try {
      const response = await fetch(url, {
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Policy Engine returned status: ${response.status}`);
      }

      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  };

  return {
    /** Service identifier */
    serviceName: 'LLM-Policy-Engine' as const,

    /** Check service health */
    async healthCheck(): Promise<boolean> {
      try {
        const response = await fetch(`${baseUrl}/health`);
        return response.ok;
      } catch {
        return false;
      }
    },

    /** Consume policy evaluation results for an organization */
    async getEvaluationResults(
      organizationId: string,
      limit = 100
    ): Promise<PolicyEvaluationResult[]> {
      const url = `${baseUrl}/api/v1/evaluations?org_id=${organizationId}&limit=${limit}`;
      return fetchJson<PolicyEvaluationResult[]>(url);
    },

    /** Consume compliance status */
    async getComplianceStatus(organizationId: string): Promise<ComplianceStatus> {
      const url = `${baseUrl}/api/v1/compliance/status?org_id=${organizationId}`;
      return fetchJson<ComplianceStatus>(url);
    },

    /** Consume enforcement decisions for audit trail */
    async getEnforcementDecisions(
      organizationId: string,
      fromTimestamp?: string
    ): Promise<PolicyEvaluationResult[]> {
      let url = `${baseUrl}/api/v1/enforcement/decisions?org_id=${organizationId}`;
      if (fromTimestamp) {
        url += `&from=${fromTimestamp}`;
      }
      return fetchJson<PolicyEvaluationResult[]>(url);
    },
  };
}

/** Policy Engine consumer type */
export type PolicyEngineConsumer = ReturnType<typeof createPolicyEngineConsumer>;
