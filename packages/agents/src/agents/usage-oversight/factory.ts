/**
 * Usage Oversight Agent Factory
 *
 * Factory functions for creating UsageOversightAgent instances.
 */

import { UsageOversightAgent, UsageOversightAgentConfig } from './agent.js';
import {
  createRuvectorClient,
  createRuvectorClientFromEnv,
} from '../../infrastructure/ruvector-client.js';
import { createTelemetryEmitterFromEnv } from '../../infrastructure/telemetry.js';

/**
 * Create a Usage Oversight Agent with explicit configuration
 */
export function createUsageOversightAgent(
  config: UsageOversightAgentConfig
): UsageOversightAgent {
  return new UsageOversightAgent(config);
}

/**
 * Create a Usage Oversight Agent from environment variables
 *
 * Required environment variables:
 * - RUVECTOR_SERVICE_URL: URL of the ruvector-service
 * - RUVECTOR_API_KEY: API key for ruvector-service
 *
 * Optional environment variables:
 * - LLM_OBSERVATORY_URL: URL of LLM-Observatory for telemetry
 * - LLM_OBSERVATORY_API_KEY: API key for Observatory
 * - AGENT_DRY_RUN: Set to 'true' to disable persistence
 */
export function createUsageOversightAgentFromEnv(): UsageOversightAgent {
  const ruvectorClient = createRuvectorClientFromEnv();
  const telemetryEmitter = createTelemetryEmitterFromEnv();
  const dryRun = process.env.AGENT_DRY_RUN === 'true';

  return createUsageOversightAgent({
    ruvectorClient,
    telemetryEmitter,
    dryRun,
  });
}

/**
 * Create a Usage Oversight Agent for testing
 *
 * Uses mock clients that don't make actual network calls.
 */
export function createUsageOversightAgentForTesting(
  overrides?: Partial<UsageOversightAgentConfig>
): UsageOversightAgent {
  const mockRuvectorClient = createRuvectorClient({
    baseUrl: 'http://mock-ruvector:8080',
    apiKey: 'mock-api-key',
  });

  // Override the persist method to no-op for testing
  (mockRuvectorClient as any).persistDecisionEvent = async () => {};

  return createUsageOversightAgent({
    ruvectorClient: mockRuvectorClient,
    dryRun: true,
    ...overrides,
  });
}
