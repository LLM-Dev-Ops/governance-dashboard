/**
 * Governance Audit Agent Consumer Adapter
 *
 * Consumes governance audit summaries, compliance status assessments,
 * and decision events from the Governance Audit Agent.
 *
 * Classification: GOVERNANCE / AUDIT / OVERSIGHT
 *
 * This adapter provides read-only access to governance artifacts.
 * It does NOT intercept execution, enforce policies, or modify configurations.
 */

import type { UpstreamConfig } from './types';

// ============================================================================
// Types aligned with packages/types/src/index.ts
// ============================================================================

/** Types of governance decisions */
export type GovernanceDecisionType =
  | 'audit_summary'
  | 'compliance_status'
  | 'governance_snapshot'
  | 'policy_adherence'
  | 'approval_trail'
  | 'change_impact'
  | 'risk_aggregation';

/** Governance severity levels */
export type GovernanceSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

/** Finding category */
export type FindingCategory =
  | 'policy_violation'
  | 'approval_gap'
  | 'configuration_drift'
  | 'access_anomaly'
  | 'compliance_deviation'
  | 'audit_gap'
  | 'cost_anomaly';

/** Trend direction */
export type TrendDirection = 'improving' | 'stable' | 'degrading' | 'unknown';

/** Date range for queries */
export interface DateRange {
  start: string;
  end: string;
}

/** Governance finding from audit */
export interface GovernanceFinding {
  id: string;
  category: FindingCategory;
  severity: GovernanceSeverity;
  title: string;
  description: string;
  affected_resources: string[];
  evidence_refs: string[];
  first_detected: string;
  last_seen: string;
}

/** Governance metrics from audit */
export interface GovernanceMetrics {
  events_analyzed: number;
  coverage_percentage: number;
  policies_evaluated: number;
  compliance_rate: number;
  findings_by_severity: Record<string, number>;
  trend: TrendDirection;
}

/** Confidence assessment */
export interface DecisionConfidence {
  overall: number;
  completeness: number;
  certainty: number;
}

/** Audit artifact reference */
export interface AuditArtifact {
  id: string;
  type: 'summary_report' | 'compliance_certificate' | 'finding_detail' | 'trend_analysis' | 'approval_trail';
  generated_at: string;
  format: 'json' | 'pdf' | 'csv' | 'html';
  content_hash: string;
  expires_at?: string;
}

/** Governance audit result */
export interface GovernanceAuditResult {
  event_id: string;
  agent_id: string;
  agent_version: string;
  decision_type: GovernanceDecisionType;
  timestamp: string;
  organization_id: string;
  summary: string;
  metrics: GovernanceMetrics;
  findings_count: number;
  findings?: GovernanceFinding[];
  recommendations: string[];
  confidence: DecisionConfidence;
  telemetry_ref: string;
  artifact_ref: string;
}

/** Governance state summary */
export interface GovernanceSummary {
  organization_id: string;
  period: {
    from: string;
    to: string;
    days: number;
  };
  summary: {
    total_audit_events: number;
    unique_users: number;
    policy_evaluations: number;
    governance_status: 'healthy' | 'moderate' | 'limited';
  };
  agent: {
    id: string;
    version: string;
  };
}

/** Agent registration info */
export interface AgentRegistrationInfo {
  agent_id: string;
  name: string;
  description: string;
  version: string;
  classification: string;
  decision_types: GovernanceDecisionType[];
  capabilities: string[];
  non_responsibilities: string[];
  endpoints: Record<string, string>;
}

/** Request to generate governance audit */
export interface GovernanceAuditRequest {
  organization_id: string;
  audit_type: GovernanceDecisionType;
  from: string;
  to: string;
  scope?: {
    teams?: string[];
    users?: string[];
    policy_types?: string[];
    resource_types?: string[];
  };
  include_details?: boolean;
  baseline_ref?: string;
}

/** Stored audit record */
export interface StoredAudit {
  id: string;
  timestamp: string;
  action: string;
  details: Record<string, unknown>;
}

// ============================================================================
// Consumer Adapter
// ============================================================================

/** Create a Governance Audit Agent consumer adapter */
export function createGovernanceAuditConsumer(config: UpstreamConfig) {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const fetchJson = async <T>(url: string, options?: RequestInit): Promise<T> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs || 30000);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...(options?.headers || {}),
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Governance Audit returned status: ${response.status}`);
      }

      const data = await response.json();
      // Handle ApiResponse wrapper
      return data.data !== undefined ? data.data : data;
    } finally {
      clearTimeout(timeout);
    }
  };

  return {
    /** Service identifier */
    serviceName: 'governance-audit-agent' as const,

    /** Check service health */
    async healthCheck(): Promise<boolean> {
      try {
        const response = await fetch(`${baseUrl}/health`);
        return response.ok;
      } catch {
        return false;
      }
    },

    /**
     * Generate a governance audit
     *
     * This is the main entry point for creating audit summaries.
     * The result includes findings, metrics, and recommendations.
     */
    async generateAudit(request: GovernanceAuditRequest): Promise<GovernanceAuditResult> {
      const url = `${baseUrl}/api/v1/governance/audit`;
      return fetchJson<GovernanceAuditResult>(url, {
        method: 'POST',
        body: JSON.stringify(request),
      });
    },

    /**
     * List previous governance audits
     */
    async listAudits(
      organizationId: string,
      options?: {
        auditType?: GovernanceDecisionType;
        from?: string;
        to?: string;
        limit?: number;
        offset?: number;
      }
    ): Promise<{ audits: StoredAudit[]; limit: number; offset: number }> {
      const params = new URLSearchParams({
        organization_id: organizationId,
        limit: String(options?.limit || 50),
        offset: String(options?.offset || 0),
      });

      if (options?.auditType) params.append('audit_type', options.auditType);
      if (options?.from) params.append('from', options.from);
      if (options?.to) params.append('to', options.to);

      const url = `${baseUrl}/api/v1/governance/audits?${params.toString()}`;
      return fetchJson<{ audits: StoredAudit[]; limit: number; offset: number }>(url);
    },

    /**
     * Get a specific governance audit by ID
     */
    async getAudit(auditId: string): Promise<StoredAudit> {
      const url = `${baseUrl}/api/v1/governance/audit/${auditId}`;
      return fetchJson<StoredAudit>(url);
    },

    /**
     * Get governance state summary
     *
     * Provides a quick overview of governance health for an organization.
     */
    async getSummary(
      organizationId: string,
      periodDays = 30
    ): Promise<GovernanceSummary> {
      const params = new URLSearchParams({
        organization_id: organizationId,
        period_days: String(periodDays),
      });

      const url = `${baseUrl}/api/v1/governance/summary?${params.toString()}`;
      return fetchJson<GovernanceSummary>(url);
    },

    /**
     * Get agent registration information
     *
     * Returns capabilities, decision types, and explicit non-responsibilities.
     */
    async getAgentInfo(): Promise<AgentRegistrationInfo> {
      const url = `${baseUrl}/api/v1/governance/agent`;
      return fetchJson<AgentRegistrationInfo>(url);
    },

    /**
     * Generate quick audit summary
     *
     * Convenience method that generates an audit_summary type audit
     * with default settings for the last 30 days.
     */
    async quickAudit(organizationId: string): Promise<GovernanceAuditResult> {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      return this.generateAudit({
        organization_id: organizationId,
        audit_type: 'audit_summary',
        from: thirtyDaysAgo.toISOString(),
        to: now.toISOString(),
        include_details: false,
      });
    },

    /**
     * Generate compliance status audit
     *
     * Convenience method for compliance-focused audits.
     */
    async complianceAudit(
      organizationId: string,
      options?: { from?: string; to?: string; detailed?: boolean }
    ): Promise<GovernanceAuditResult> {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      return this.generateAudit({
        organization_id: organizationId,
        audit_type: 'compliance_status',
        from: options?.from || thirtyDaysAgo.toISOString(),
        to: options?.to || now.toISOString(),
        include_details: options?.detailed ?? true,
      });
    },

    /**
     * Generate policy adherence audit
     *
     * Convenience method for policy-focused audits.
     */
    async policyAdherenceAudit(
      organizationId: string,
      options?: { from?: string; to?: string; policyTypes?: string[] }
    ): Promise<GovernanceAuditResult> {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      return this.generateAudit({
        organization_id: organizationId,
        audit_type: 'policy_adherence',
        from: options?.from || thirtyDaysAgo.toISOString(),
        to: options?.to || now.toISOString(),
        scope: options?.policyTypes ? { policy_types: options.policyTypes } : undefined,
        include_details: true,
      });
    },
  };
}

/** Governance Audit consumer type */
export type GovernanceAuditConsumer = ReturnType<typeof createGovernanceAuditConsumer>;
