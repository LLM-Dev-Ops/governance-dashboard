/**
 * Telemetry Integration
 *
 * Emits telemetry compatible with LLM-Observatory.
 * All governance agents MUST emit telemetry for each invocation.
 */

import type { AgentContext, AgentMetadata } from '../contracts/base-agent.js';

/**
 * Telemetry event types
 */
export type TelemetryEventType =
  | 'agent.invocation.start'
  | 'agent.invocation.success'
  | 'agent.invocation.failure'
  | 'agent.health.check';

/**
 * Telemetry event payload
 */
export interface TelemetryEvent {
  /** Event type */
  event_type: TelemetryEventType;
  /** Event timestamp */
  timestamp: string;
  /** Agent metadata */
  agent: {
    id: string;
    version: string;
    classification: string;
  };
  /** Execution context */
  context: {
    execution_ref: string;
    organization_id: string;
    trace_id?: string;
    span_id?: string;
  };
  /** Event-specific data */
  data: Record<string, unknown>;
  /** Duration in milliseconds (for completed events) */
  duration_ms?: number;
}

/**
 * Telemetry emitter configuration
 */
export interface TelemetryEmitterConfig {
  /** LLM-Observatory endpoint */
  observatoryUrl?: string;
  /** API key for Observatory */
  observatoryApiKey?: string;
  /** Enable local logging */
  enableLogging?: boolean;
  /** Batch size for telemetry events */
  batchSize?: number;
  /** Flush interval in milliseconds */
  flushIntervalMs?: number;
}

/**
 * Telemetry Emitter
 *
 * Sends telemetry events to LLM-Observatory.
 */
export class TelemetryEmitter {
  private readonly config: TelemetryEmitterConfig;
  private readonly buffer: TelemetryEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: TelemetryEmitterConfig = {}) {
    this.config = {
      enableLogging: true,
      batchSize: 100,
      flushIntervalMs: 5000,
      ...config,
    };

    // Start flush timer if Observatory URL is configured
    if (this.config.observatoryUrl) {
      this.startFlushTimer();
    }
  }

  /**
   * Emit an agent invocation start event
   */
  emitInvocationStart(
    metadata: AgentMetadata,
    context: AgentContext
  ): void {
    this.emit({
      event_type: 'agent.invocation.start',
      timestamp: new Date().toISOString(),
      agent: {
        id: metadata.agent_id,
        version: metadata.agent_version,
        classification: metadata.classification,
      },
      context: {
        execution_ref: context.execution_ref,
        organization_id: context.organization_id,
        trace_id: context.telemetry_context?.trace_id,
        span_id: context.telemetry_context?.span_id,
      },
      data: {
        caller: context.caller,
      },
    });
  }

  /**
   * Emit an agent invocation success event
   */
  emitInvocationSuccess(
    metadata: AgentMetadata,
    context: AgentContext,
    durationMs: number,
    data: Record<string, unknown> = {}
  ): void {
    this.emit({
      event_type: 'agent.invocation.success',
      timestamp: new Date().toISOString(),
      agent: {
        id: metadata.agent_id,
        version: metadata.agent_version,
        classification: metadata.classification,
      },
      context: {
        execution_ref: context.execution_ref,
        organization_id: context.organization_id,
        trace_id: context.telemetry_context?.trace_id,
        span_id: context.telemetry_context?.span_id,
      },
      data,
      duration_ms: durationMs,
    });
  }

  /**
   * Emit an agent invocation failure event
   */
  emitInvocationFailure(
    metadata: AgentMetadata,
    context: AgentContext,
    durationMs: number,
    error: {
      code: string;
      message: string;
      details?: Record<string, unknown>;
    }
  ): void {
    this.emit({
      event_type: 'agent.invocation.failure',
      timestamp: new Date().toISOString(),
      agent: {
        id: metadata.agent_id,
        version: metadata.agent_version,
        classification: metadata.classification,
      },
      context: {
        execution_ref: context.execution_ref,
        organization_id: context.organization_id,
        trace_id: context.telemetry_context?.trace_id,
        span_id: context.telemetry_context?.span_id,
      },
      data: {
        error,
      },
      duration_ms: durationMs,
    });
  }

  /**
   * Emit a health check event
   */
  emitHealthCheck(
    metadata: AgentMetadata,
    healthy: boolean,
    details?: Record<string, unknown>
  ): void {
    this.emit({
      event_type: 'agent.health.check',
      timestamp: new Date().toISOString(),
      agent: {
        id: metadata.agent_id,
        version: metadata.agent_version,
        classification: metadata.classification,
      },
      context: {
        execution_ref: `health-${Date.now()}`,
        organization_id: 'system',
      },
      data: {
        healthy,
        details,
      },
    });
  }

  /**
   * Emit a telemetry event
   */
  private emit(event: TelemetryEvent): void {
    // Log locally if enabled
    if (this.config.enableLogging) {
      console.log(
        JSON.stringify({
          level: event.event_type.includes('failure') ? 'error' : 'info',
          ...event,
        })
      );
    }

    // Buffer for Observatory if configured
    if (this.config.observatoryUrl) {
      this.buffer.push(event);

      // Flush if buffer is full
      if (this.buffer.length >= (this.config.batchSize ?? 100)) {
        this.flush();
      }
    }
  }

  /**
   * Flush buffered events to Observatory
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0 || !this.config.observatoryUrl) {
      return;
    }

    const events = this.buffer.splice(0, this.buffer.length);

    try {
      await fetch(`${this.config.observatoryUrl}/api/v1/telemetry/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.observatoryApiKey}`,
          'X-Client': 'governance-dashboard-agents',
        },
        body: JSON.stringify({ events }),
      });
    } catch (error) {
      // Log error but don't throw - telemetry should not block agent execution
      console.error('Failed to flush telemetry:', error);
      // Put events back in buffer for retry (up to limit)
      const maxBuffer = (this.config.batchSize ?? 100) * 2;
      if (this.buffer.length + events.length <= maxBuffer) {
        this.buffer.unshift(...events);
      }
    }
  }

  /**
   * Start the flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(
      () => this.flush(),
      this.config.flushIntervalMs ?? 5000
    );
  }

  /**
   * Stop the flush timer and flush remaining events
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }
}

/**
 * Create a telemetry emitter from environment variables
 */
export function createTelemetryEmitterFromEnv(): TelemetryEmitter {
  return new TelemetryEmitter({
    observatoryUrl: process.env.LLM_OBSERVATORY_URL,
    observatoryApiKey: process.env.LLM_OBSERVATORY_API_KEY,
    enableLogging: process.env.NODE_ENV !== 'production',
  });
}

/**
 * Singleton telemetry emitter instance
 */
let telemetryInstance: TelemetryEmitter | null = null;

export function getTelemetryEmitter(): TelemetryEmitter {
  if (!telemetryInstance) {
    telemetryInstance = createTelemetryEmitterFromEnv();
  }
  return telemetryInstance;
}
