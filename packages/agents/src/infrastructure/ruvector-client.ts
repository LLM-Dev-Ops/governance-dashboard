/**
 * RuVector Service Client
 *
 * Client for persisting governance artifacts to ruvector-service.
 * ruvector-service is backed by Google SQL (Postgres).
 *
 * IMPORTANT:
 * - LLM-Governance-Dashboard NEVER connects directly to Google SQL
 * - LLM-Governance-Dashboard NEVER executes SQL
 * - All persistence occurs via ruvector-service client calls only
 */

import type { DecisionEvent } from '../contracts/decision-event.js';
import type { UsageOversightOutput } from '../contracts/usage-oversight.js';

/**
 * Configuration for RuVector client
 */
export interface RuvectorClientConfig {
  /** Base URL of ruvector-service */
  baseUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** Request timeout in milliseconds */
  timeoutMs?: number;
  /** Retry configuration */
  retry?: {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
  };
}

/**
 * Response from ruvector-service
 */
export interface RuvectorResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * RuVector Service Client
 *
 * Handles all persistence operations for governance agents.
 */
export class RuvectorClient {
  private readonly config: RuvectorClientConfig;
  private readonly defaultTimeout = 30000;
  private readonly defaultRetry = {
    maxRetries: 3,
    initialDelayMs: 100,
    maxDelayMs: 5000,
  };

  constructor(config: RuvectorClientConfig) {
    this.config = {
      ...config,
      timeoutMs: config.timeoutMs ?? this.defaultTimeout,
      retry: config.retry ?? this.defaultRetry,
    };
  }

  /**
   * Persist a DecisionEvent
   *
   * Every agent invocation MUST call this exactly once.
   * Falls back gracefully if RuVector endpoint is unavailable.
   */
  async persistDecisionEvent(event: DecisionEvent): Promise<void> {
    try {
      await this.post('/api/v1/decision-events', event);
    } catch (error: any) {
      // Graceful degradation: log but don't fail the agent
      // Phase 4 Layer 1: Emit signal but don't block execution
      console.warn(`[RuVector] Failed to persist DecisionEvent ${event.id}: ${error.message}`);
      console.warn(`[RuVector] Event data logged for recovery:`, JSON.stringify({
        id: event.id,
        agent_id: event.agent_id,
        decision_type: event.decision_type,
        timestamp: event.timestamp,
      }));
      // Re-throw only for critical errors (auth failures)
      if (error.status === 401 || error.status === 403) {
        throw error;
      }
    }
  }

  /**
   * Persist a Usage Oversight output
   */
  async persistUsageOversightOutput(
    decisionEventId: string,
    output: UsageOversightOutput
  ): Promise<void> {
    await this.post(`/api/v1/decision-events/${decisionEventId}/outputs`, {
      output_type: 'usage_oversight',
      data: output,
    });
  }

  /**
   * Query historical DecisionEvents
   */
  async queryDecisionEvents(query: {
    agent_id?: string;
    decision_type?: string;
    organization_id?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }): Promise<DecisionEvent[]> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });

    const response = await this.get<{ items: DecisionEvent[] }>(
      `/api/v1/decision-events?${params.toString()}`
    );

    return response.data?.items ?? [];
  }

  /**
   * Get a specific DecisionEvent
   */
  async getDecisionEvent(id: string): Promise<DecisionEvent | null> {
    try {
      const response = await this.get<DecisionEvent>(
        `/api/v1/decision-events/${id}`
      );
      return response.data ?? null;
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Health check for ruvector-service
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    latencyMs: number;
    details?: Record<string, unknown>;
  }> {
    const start = Date.now();
    try {
      await this.get<{ status: string }>('/health');
      return {
        healthy: true,
        latencyMs: Date.now() - start,
      };
    } catch (error: any) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        details: {
          error: error.message,
        },
      };
    }
  }

  /**
   * Perform a GET request
   */
  private async get<T>(path: string): Promise<RuvectorResponse<T>> {
    return this.request<T>('GET', path);
  }

  /**
   * Perform a POST request
   */
  private async post<T>(path: string, data: unknown): Promise<RuvectorResponse<T>> {
    return this.request<T>('POST', path, data);
  }

  /**
   * Perform an HTTP request with retry logic
   */
  private async request<T>(
    method: string,
    path: string,
    data?: unknown
  ): Promise<RuvectorResponse<T>> {
    const url = `${this.config.baseUrl}${path}`;
    const retry = this.config.retry ?? this.defaultRetry;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retry.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.timeoutMs
        );

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
            'X-Client': 'governance-dashboard-agents',
          },
          body: data ? JSON.stringify(data) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({})) as { message?: string; code?: string };
          throw Object.assign(new Error(errorBody.message || response.statusText), {
            status: response.status,
            code: errorBody.code,
          });
        }

        const responseData = await response.json() as T;
        return { success: true, data: responseData };
      } catch (err) {
        const error = err as Error & { status?: number };
        lastError = error instanceof Error ? error : new Error(String(err));

        // Don't retry on client errors (4xx)
        if (error.status && error.status >= 400 && error.status < 500) {
          throw error;
        }

        // Calculate delay for next retry
        if (attempt < retry.maxRetries) {
          const delay = Math.min(
            retry.initialDelayMs * Math.pow(2, attempt),
            retry.maxDelayMs
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }
}

/**
 * Create a RuVector client from environment variables
 */
export function createRuvectorClientFromEnv(): RuvectorClient {
  const baseUrl = process.env.RUVECTOR_SERVICE_URL;
  const apiKey = process.env.RUVECTOR_API_KEY;

  if (!baseUrl) {
    throw new Error('RUVECTOR_SERVICE_URL environment variable is required');
  }

  if (!apiKey) {
    throw new Error('RUVECTOR_API_KEY environment variable is required');
  }

  return new RuvectorClient({
    baseUrl,
    apiKey,
    timeoutMs: parseInt(process.env.RUVECTOR_TIMEOUT_MS ?? '30000', 10),
  });
}

/**
 * Factory function to create a RuVector client
 */
export function createRuvectorClient(
  config: RuvectorClientConfig
): RuvectorClient {
  return new RuvectorClient(config);
}
