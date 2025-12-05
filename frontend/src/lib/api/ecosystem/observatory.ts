/**
 * Observatory Consumer Adapter
 *
 * Consumes telemetry events, trace spans, and system health indicators
 * from the LLM-Observatory upstream service.
 */

import type { UpstreamConfig } from './types';

/** Type of telemetry event */
export type TelemetryEventType =
  | 'request'
  | 'response'
  | 'error'
  | 'rate_limit'
  | 'token_usage'
  | 'latency'
  | 'custom';

/** Status of a trace span */
export type SpanStatus = 'ok' | 'error' | 'unset';

/** Health status */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/** Metrics associated with a telemetry event */
export interface EventMetrics {
  latency_ms?: number;
  token_count?: number;
  error_count?: number;
  custom_metrics: Record<string, number>;
}

/** Telemetry event from Observatory */
export interface TelemetryEvent {
  event_id: string;
  event_type: TelemetryEventType;
  timestamp: string;
  source: string;
  organization_id?: string;
  user_id?: string;
  model_id?: string;
  attributes: Record<string, unknown>;
  metrics: EventMetrics;
}

/** Event within a span */
export interface SpanEvent {
  name: string;
  timestamp: string;
  attributes: Record<string, unknown>;
}

/** Distributed trace span from Observatory */
export interface TraceSpan {
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  operation_name: string;
  service_name: string;
  start_time: string;
  end_time: string;
  duration_ms: number;
  status: SpanStatus;
  attributes: Record<string, unknown>;
  events: SpanEvent[];
}

/** Resource usage metrics */
export interface ResourceUsage {
  cpu_percent: number;
  memory_percent: number;
  disk_percent?: number;
  network_in_bytes?: number;
  network_out_bytes?: number;
}

/** Health of a dependency */
export interface DependencyHealth {
  name: string;
  status: HealthStatus;
  latency_ms: number;
}

/** System health indicator from Observatory */
export interface HealthIndicator {
  service_name: string;
  status: HealthStatus;
  last_check: string;
  response_time_ms: number;
  error_rate: number;
  throughput_rps: number;
  resource_usage: ResourceUsage;
  dependencies: DependencyHealth[];
}

/** Aggregated system health summary */
export interface SystemHealthSummary {
  overall_status: HealthStatus;
  services: HealthIndicator[];
  active_alerts: number;
  error_rate_1h: number;
  avg_latency_1h: number;
  uptime_percentage: number;
  last_updated: string;
}

/** Create an Observatory consumer adapter */
export function createObservatoryConsumer(config: UpstreamConfig) {
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
        throw new Error(`Observatory returned status: ${response.status}`);
      }

      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  };

  return {
    /** Service identifier */
    serviceName: 'LLM-Observatory' as const,

    /** Check service health */
    async healthCheck(): Promise<boolean> {
      try {
        const response = await fetch(`${baseUrl}/health`);
        return response.ok;
      } catch {
        return false;
      }
    },

    /** Consume recent telemetry events */
    async getTelemetryEvents(
      organizationId: string,
      eventType?: TelemetryEventType,
      limit = 100
    ): Promise<TelemetryEvent[]> {
      let url = `${baseUrl}/api/v1/telemetry/events?org_id=${organizationId}&limit=${limit}`;
      if (eventType) {
        url += `&type=${eventType}`;
      }
      return fetchJson<TelemetryEvent[]>(url);
    },

    /** Consume trace spans for a specific trace */
    async getTraceSpans(traceId: string): Promise<TraceSpan[]> {
      const url = `${baseUrl}/api/v1/traces/${traceId}/spans`;
      return fetchJson<TraceSpan[]>(url);
    },

    /** Consume trace spans within a time range */
    async listTraces(
      organizationId: string,
      fromTimestamp: string,
      toTimestamp: string
    ): Promise<TraceSpan[]> {
      const url = `${baseUrl}/api/v1/traces?org_id=${organizationId}&from=${fromTimestamp}&to=${toTimestamp}`;
      return fetchJson<TraceSpan[]>(url);
    },

    /** Consume system health summary */
    async getHealthIndicators(): Promise<SystemHealthSummary> {
      const url = `${baseUrl}/api/v1/health/summary`;
      return fetchJson<SystemHealthSummary>(url);
    },

    /** Consume health indicator for a specific service */
    async getServiceHealth(serviceName: string): Promise<HealthIndicator> {
      const url = `${baseUrl}/api/v1/health/services/${serviceName}`;
      return fetchJson<HealthIndicator>(url);
    },
  };
}

/** Observatory consumer type */
export type ObservatoryConsumer = ReturnType<typeof createObservatoryConsumer>;
