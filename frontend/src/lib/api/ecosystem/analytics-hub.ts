/**
 * Analytics Hub Consumer Adapter
 *
 * Consumes aggregated analytics, baselines, usage clusters, and forecasting
 * insights from the LLM-Analytics-Hub upstream service.
 */

import type { UpstreamConfig } from './types';

/** Direction of a trend */
export type TrendDirection = 'up' | 'down' | 'stable';

/** Type of forecast */
export type ForecastType = 'cost' | 'usage' | 'capacity' | 'demand';

/** Usage pattern type */
export type UsagePattern =
  | 'light_user'
  | 'moderate_user'
  | 'heavy_user'
  | 'batch'
  | 'interactive'
  | 'mixed';

/** Type of anomaly */
export type AnomalyType = 'spike' | 'drop' | 'drift' | 'outlier' | 'pattern_change';

/** Severity of anomaly */
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

/** Core analytics metrics */
export interface AnalyticsMetrics {
  total_requests: number;
  total_tokens: number;
  total_cost: number;
  unique_users: number;
  unique_models: number;
  avg_latency_ms: number;
  error_rate: number;
  success_rate: number;
}

/** Data point in trend series */
export interface TrendDataPoint {
  timestamp: string;
  value: number;
  label: string;
}

/** Analytics trends over time */
export interface AnalyticsTrends {
  request_trend: TrendDirection;
  cost_trend: TrendDirection;
  latency_trend: TrendDirection;
  user_growth_trend: TrendDirection;
  trend_data: TrendDataPoint[];
}

/** Comparison with previous period */
export interface PeriodComparison {
  previous_period_start: string;
  previous_period_end: string;
  request_change_percent: number;
  cost_change_percent: number;
  latency_change_percent: number;
  user_change_percent: number;
}

/** Aggregated analytics from Analytics Hub */
export interface AggregatedAnalytics {
  organization_id: string;
  period_start: string;
  period_end: string;
  metrics: AnalyticsMetrics;
  trends: AnalyticsTrends;
  comparisons: PeriodComparison;
}

/** Baseline metrics for comparison */
export interface BaselineMetrics {
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  avg_tokens_per_request: number;
  avg_cost_per_request: number;
  typical_error_rate: number;
}

/** Thresholds derived from baseline */
export interface BaselineThresholds {
  latency_warning_ms: number;
  latency_critical_ms: number;
  error_rate_warning: number;
  error_rate_critical: number;
  cost_anomaly_threshold: number;
}

/** Performance baseline from Analytics Hub */
export interface PerformanceBaseline {
  baseline_id: string;
  organization_id: string;
  model_id?: string;
  created_at: string;
  valid_until: string;
  metrics: BaselineMetrics;
  thresholds: BaselineThresholds;
}

/** Characteristics of a usage cluster */
export interface ClusterCharacteristics {
  avg_requests_per_day: number;
  avg_tokens_per_request: number;
  preferred_models: string[];
  peak_hours: number[];
  usage_pattern: UsagePattern;
}

/** Member of a usage cluster */
export interface ClusterMember {
  user_id: string;
  membership_score: number;
  joined_cluster_at: string;
}

/** Usage cluster from Analytics Hub */
export interface UsageCluster {
  cluster_id: string;
  cluster_name: string;
  description: string;
  member_count: number;
  characteristics: ClusterCharacteristics;
  members: ClusterMember[];
}

/** Individual forecast prediction */
export interface ForecastPrediction {
  date: string;
  predicted_value: number;
  lower_bound: number;
  upper_bound: number;
  factors: Record<string, number>;
}

/** Forecasting insight from Analytics Hub */
export interface ForecastInsight {
  forecast_id: string;
  organization_id: string;
  forecast_type: ForecastType;
  generated_at: string;
  horizon_days: number;
  predictions: ForecastPrediction[];
  confidence_level: number;
  model_accuracy: number;
}

/** Anomaly detection result */
export interface AnomalyDetection {
  anomaly_id: string;
  detected_at: string;
  anomaly_type: AnomalyType;
  severity: AnomalySeverity;
  affected_metric: string;
  expected_value: number;
  actual_value: number;
  deviation_percent: number;
  description: string;
}

/** Create an Analytics Hub consumer adapter */
export function createAnalyticsHubConsumer(config: UpstreamConfig) {
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
        throw new Error(`Analytics Hub returned status: ${response.status}`);
      }

      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  };

  return {
    /** Service identifier */
    serviceName: 'LLM-Analytics-Hub' as const,

    /** Check service health */
    async healthCheck(): Promise<boolean> {
      try {
        const response = await fetch(`${baseUrl}/health`);
        return response.ok;
      } catch {
        return false;
      }
    },

    /** Consume aggregated analytics */
    async getAggregatedAnalytics(
      organizationId: string,
      periodStart: string,
      periodEnd: string
    ): Promise<AggregatedAnalytics> {
      const url = `${baseUrl}/api/v1/analytics/aggregate?org_id=${organizationId}&start=${periodStart}&end=${periodEnd}`;
      return fetchJson<AggregatedAnalytics>(url);
    },

    /** Consume performance baselines */
    async getBaselines(
      organizationId: string,
      modelId?: string
    ): Promise<PerformanceBaseline[]> {
      let url = `${baseUrl}/api/v1/analytics/baselines?org_id=${organizationId}`;
      if (modelId) {
        url += `&model_id=${modelId}`;
      }
      return fetchJson<PerformanceBaseline[]>(url);
    },

    /** Consume usage clusters */
    async getUsageClusters(organizationId: string): Promise<UsageCluster[]> {
      const url = `${baseUrl}/api/v1/analytics/clusters?org_id=${organizationId}`;
      return fetchJson<UsageCluster[]>(url);
    },

    /** Consume forecasting insights */
    async getForecast(
      organizationId: string,
      forecastType: ForecastType,
      horizonDays: number
    ): Promise<ForecastInsight> {
      const url = `${baseUrl}/api/v1/analytics/forecast?org_id=${organizationId}&type=${forecastType}&horizon=${horizonDays}`;
      return fetchJson<ForecastInsight>(url);
    },

    /** Consume detected anomalies */
    async getAnomalies(
      organizationId: string,
      fromTimestamp?: string
    ): Promise<AnomalyDetection[]> {
      let url = `${baseUrl}/api/v1/analytics/anomalies?org_id=${organizationId}`;
      if (fromTimestamp) {
        url += `&from=${fromTimestamp}`;
      }
      return fetchJson<AnomalyDetection[]>(url);
    },
  };
}

/** Analytics Hub consumer type */
export type AnalyticsHubConsumer = ReturnType<typeof createAnalyticsHubConsumer>;
