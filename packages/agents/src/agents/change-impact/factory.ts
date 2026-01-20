/**
 * Change Impact Agent Factory
 *
 * Factory for creating Change Impact Agent instances with proper configuration.
 */

import { ChangeImpactAgent, type ChangeImpactAgentConfig } from './agent.js';
import { createRuvectorClient, type RuvectorClientConfig } from '../../infrastructure/ruvector-client.js';
import { TelemetryEmitter, type TelemetryEmitterConfig } from '../../infrastructure/telemetry.js';

/**
 * Factory configuration for Change Impact Agent
 */
export interface ChangeImpactAgentFactoryConfig {
  /** RuVector service configuration */
  ruvector: RuvectorClientConfig;
  /** Optional telemetry configuration */
  telemetry?: TelemetryEmitterConfig;
  /** Dry-run mode */
  dryRun?: boolean;
  /** Default analysis depth */
  defaultAnalysisDepth?: number;
}

/**
 * Create a Change Impact Agent with standard configuration
 */
export function createChangeImpactAgent(
  config: ChangeImpactAgentFactoryConfig
): ChangeImpactAgent {
  const ruvectorClient = createRuvectorClient(config.ruvector);

  const telemetryEmitter = config.telemetry
    ? new TelemetryEmitter(config.telemetry)
    : undefined;

  const agentConfig: ChangeImpactAgentConfig = {
    ruvectorClient,
    telemetryEmitter,
    dryRun: config.dryRun,
    defaultAnalysisDepth: config.defaultAnalysisDepth,
  };

  return new ChangeImpactAgent(agentConfig);
}

/**
 * Create a Change Impact Agent from environment variables
 */
export function createChangeImpactAgentFromEnv(): ChangeImpactAgent {
  const ruvectorConfig: RuvectorClientConfig = {
    baseUrl: process.env.RUVECTOR_SERVICE_URL || 'http://localhost:8080',
    apiKey: process.env.RUVECTOR_API_KEY || '',
    timeoutMs: parseInt(process.env.RUVECTOR_TIMEOUT || '30000', 10),
  };

  const telemetryConfig: TelemetryEmitterConfig | undefined = process.env.OBSERVATORY_URL
    ? {
        observatoryUrl: process.env.OBSERVATORY_URL,
        observatoryApiKey: process.env.OBSERVATORY_API_KEY,
        enableLogging: process.env.NODE_ENV !== 'production',
      }
    : undefined;

  return createChangeImpactAgent({
    ruvector: ruvectorConfig,
    telemetry: telemetryConfig,
    dryRun: process.env.DRY_RUN === 'true',
    defaultAnalysisDepth: parseInt(process.env.DEFAULT_ANALYSIS_DEPTH || '3', 10),
  });
}
