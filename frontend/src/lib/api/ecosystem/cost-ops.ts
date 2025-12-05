/**
 * CostOps Consumer Adapter
 *
 * Consumes cost summaries, projections, and detailed breakdowns
 * from the LLM-CostOps upstream service.
 */

import type { UpstreamConfig } from './types';

/** Cost trend indicator */
export type CostTrend = 'increasing' | 'stable' | 'decreasing';

/** Cost granularity level */
export type CostGranularity = 'hourly' | 'daily' | 'weekly' | 'monthly';

/** Alert type */
export type AlertType = 'warning' | 'critical' | 'exceeded';

/** Cost summary from CostOps */
export interface CostSummary {
  organization_id: string;
  period_start: string;
  period_end: string;
  total_cost: number;
  currency: string;
  cost_by_provider: Record<string, number>;
  cost_by_model: Record<string, number>;
  cost_by_team: Record<string, number>;
  request_count: number;
  token_count: number;
}

/** Confidence interval for projections */
export interface ConfidenceInterval {
  lower_bound: number;
  upper_bound: number;
  confidence_level: number;
}

/** Factor affecting cost projection */
export interface ProjectionFactor {
  factor_name: string;
  impact: number;
  description: string;
}

/** Cost projection/forecast from CostOps */
export interface CostProjection {
  organization_id: string;
  projection_date: string;
  projected_daily_cost: number;
  projected_weekly_cost: number;
  projected_monthly_cost: number;
  confidence_interval: ConfidenceInterval;
  trend: CostTrend;
  factors: ProjectionFactor[];
}

/** Individual cost line item */
export interface CostLineItem {
  timestamp: string;
  provider: string;
  model: string;
  team_id?: string;
  user_id?: string;
  prompt_tokens: number;
  completion_tokens: number;
  prompt_cost: number;
  completion_cost: number;
  total_cost: number;
  request_count: number;
}

/** Detailed cost breakdown */
export interface CostBreakdownDetail {
  breakdown_id: string;
  organization_id: string;
  period: string;
  granularity: CostGranularity;
  items: CostLineItem[];
  subtotals: Record<string, number>;
  total: number;
}

/** Budget alert from CostOps */
export interface CostAlert {
  alert_id: string;
  budget_id: string;
  alert_type: AlertType;
  threshold_percentage: number;
  current_percentage: number;
  message: string;
  triggered_at: string;
}

/** Create a CostOps consumer adapter */
export function createCostOpsConsumer(config: UpstreamConfig) {
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
        throw new Error(`CostOps returned status: ${response.status}`);
      }

      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  };

  return {
    /** Service identifier */
    serviceName: 'LLM-CostOps' as const,

    /** Check service health */
    async healthCheck(): Promise<boolean> {
      try {
        const response = await fetch(`${baseUrl}/health`);
        return response.ok;
      } catch {
        return false;
      }
    },

    /** Consume cost summary for an organization */
    async getCostSummary(
      organizationId: string,
      periodStart: string,
      periodEnd: string
    ): Promise<CostSummary> {
      const url = `${baseUrl}/api/v1/costs/summary?org_id=${organizationId}&start=${periodStart}&end=${periodEnd}`;
      return fetchJson<CostSummary>(url);
    },

    /** Consume cost projections */
    async getCostProjection(organizationId: string): Promise<CostProjection> {
      const url = `${baseUrl}/api/v1/costs/projection?org_id=${organizationId}`;
      return fetchJson<CostProjection>(url);
    },

    /** Consume detailed cost breakdown */
    async getCostBreakdown(
      organizationId: string,
      granularity: CostGranularity,
      periodStart: string,
      periodEnd: string
    ): Promise<CostBreakdownDetail> {
      const url = `${baseUrl}/api/v1/costs/breakdown?org_id=${organizationId}&granularity=${granularity}&start=${periodStart}&end=${periodEnd}`;
      return fetchJson<CostBreakdownDetail>(url);
    },

    /** Consume active cost alerts */
    async getCostAlerts(organizationId: string): Promise<CostAlert[]> {
      const url = `${baseUrl}/api/v1/costs/alerts?org_id=${organizationId}`;
      return fetchJson<CostAlert[]>(url);
    },
  };
}

/** CostOps consumer type */
export type CostOpsConsumer = ReturnType<typeof createCostOpsConsumer>;
