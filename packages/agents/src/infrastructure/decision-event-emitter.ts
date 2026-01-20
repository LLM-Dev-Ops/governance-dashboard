/**
 * DecisionEvent Emitter
 *
 * Responsible for creating and emitting DecisionEvents to ruvector-service.
 * Every agent invocation MUST emit exactly ONE DecisionEvent.
 */

import type {
  DecisionEvent,
  DecisionType,
  Confidence,
  ConstraintsApplied,
} from '../contracts/decision-event.js';
import { validateDecisionEvent } from '../contracts/decision-event.js';
import {
  computeInputsHash,
  generateUUID,
  getCurrentTimestamp,
} from '../contracts/validation.js';
import type { RuvectorClient } from './ruvector-client.js';

/**
 * Configuration for DecisionEvent emission
 */
export interface DecisionEventEmitterConfig {
  /** RuVector client for persistence */
  ruvectorClient: RuvectorClient;
  /** Agent identifier */
  agentId: string;
  /** Agent version */
  agentVersion: string;
  /** Enable dry-run mode (no persistence) */
  dryRun?: boolean;
}

/**
 * Parameters for creating a DecisionEvent
 */
export interface CreateDecisionEventParams {
  /** Type of decision */
  decisionType: DecisionType;
  /** Raw input (will be hashed) */
  input: unknown;
  /** Decision outputs */
  outputs: Record<string, unknown>;
  /** Confidence metrics */
  confidence: Confidence;
  /** Applied constraints */
  constraintsApplied: ConstraintsApplied;
  /** Execution reference (trace ID) */
  executionRef: string;
  /** Optional telemetry data */
  telemetry?: {
    latency_ms: number;
    memory_mb?: number;
    source_system?: string;
  };
}

/**
 * DecisionEvent Emitter
 *
 * Creates and persists DecisionEvents to ruvector-service.
 */
export class DecisionEventEmitter {
  private readonly config: DecisionEventEmitterConfig;

  constructor(config: DecisionEventEmitterConfig) {
    this.config = config;
  }

  /**
   * Create and emit a DecisionEvent
   *
   * @param params - Parameters for the decision event
   * @returns The created DecisionEvent
   * @throws Error if validation or persistence fails
   */
  async emit(params: CreateDecisionEventParams): Promise<DecisionEvent> {
    const event = this.createEvent(params);

    // Validate the event against schema
    const validatedEvent = validateDecisionEvent(event);

    // Persist to ruvector-service (unless dry-run)
    if (!this.config.dryRun) {
      await this.persist(validatedEvent);
    }

    return validatedEvent;
  }

  /**
   * Create a DecisionEvent without emitting
   *
   * Useful for testing or preview scenarios.
   */
  createEvent(params: CreateDecisionEventParams): DecisionEvent {
    return {
      id: generateUUID(),
      agent_id: this.config.agentId,
      agent_version: this.config.agentVersion,
      decision_type: params.decisionType,
      inputs_hash: computeInputsHash(params.input),
      outputs: params.outputs,
      confidence: params.confidence,
      constraints_applied: params.constraintsApplied,
      execution_ref: params.executionRef,
      timestamp: getCurrentTimestamp(),
      telemetry: params.telemetry,
    };
  }

  /**
   * Persist a DecisionEvent to ruvector-service
   */
  private async persist(event: DecisionEvent): Promise<void> {
    await this.config.ruvectorClient.persistDecisionEvent(event);
  }

  /**
   * Calculate overall confidence from component metrics
   */
  static calculateOverallConfidence(
    coverage: number,
    completeness: number
  ): number {
    // Weighted average: coverage is slightly more important
    return coverage * 0.6 + completeness * 0.4;
  }

  /**
   * Create a confidence object from component metrics
   */
  static createConfidence(
    coverage: number,
    completeness: number,
    confidenceBand?: { lower: number; upper: number }
  ): Confidence {
    return {
      coverage,
      completeness,
      confidence_band: confidenceBand,
      overall: DecisionEventEmitter.calculateOverallConfidence(coverage, completeness),
    };
  }
}

/**
 * Factory function to create a DecisionEventEmitter
 */
export function createDecisionEventEmitter(
  config: DecisionEventEmitterConfig
): DecisionEventEmitter {
  return new DecisionEventEmitter(config);
}
