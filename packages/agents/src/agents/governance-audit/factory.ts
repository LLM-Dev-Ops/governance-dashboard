/**
 * Governance Audit Agent Factory
 *
 * Factory functions for creating GovernanceAuditAgent instances.
 */

import { GovernanceAuditAgent, type GovernanceAuditAgentConfig } from './agent.js';
import {
  createRuvectorClient,
  createRuvectorClientFromEnv,
  type RuvectorClientConfig,
} from '../../infrastructure/ruvector-client.js';
import {
  TelemetryEmitter,
  createTelemetryEmitterFromEnv,
  type TelemetryEmitterConfig,
} from '../../infrastructure/telemetry.js';

/**
 * Factory configuration for Governance Audit Agent
 */
export interface GovernanceAuditAgentFactoryConfig {
  ruvector: RuvectorClientConfig;
  telemetry?: TelemetryEmitterConfig;
  dryRun?: boolean;
}

/**
 * Create a Governance Audit Agent with explicit configuration
 */
export function createGovernanceAuditAgent(
  config: GovernanceAuditAgentFactoryConfig
): GovernanceAuditAgent {
  const ruvectorClient = createRuvectorClient(config.ruvector);

  const telemetryEmitter = config.telemetry
    ? new TelemetryEmitter(config.telemetry)
    : undefined;

  return new GovernanceAuditAgent({
    ruvectorClient,
    telemetryEmitter,
    dryRun: config.dryRun,
  });
}

/**
 * Create a Governance Audit Agent from environment variables
 */
export function createGovernanceAuditAgentFromEnv(): GovernanceAuditAgent {
  const ruvectorClient = createRuvectorClientFromEnv();
  const telemetryEmitter = createTelemetryEmitterFromEnv();
  const dryRun = process.env.AGENT_DRY_RUN === 'true';

  return new GovernanceAuditAgent({
    ruvectorClient,
    telemetryEmitter,
    dryRun,
  });
}

/**
 * Create a Governance Audit Agent for testing
 */
export function createGovernanceAuditAgentForTesting(
  overrides?: Partial<GovernanceAuditAgentConfig>
): GovernanceAuditAgent {
  const mockRuvectorClient = createRuvectorClient({
    baseUrl: 'http://mock-ruvector:8080',
    apiKey: 'mock-api-key',
  });

  (mockRuvectorClient as any).persistDecisionEvent = async () => {};

  return new GovernanceAuditAgent({
    ruvectorClient: mockRuvectorClient,
    dryRun: true,
    ...overrides,
  });
}
