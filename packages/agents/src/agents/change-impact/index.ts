/**
 * Change Impact Agent Module
 *
 * Exports all public types and functions for the Change Impact Agent.
 */

export { ChangeImpactAgent, type ChangeImpactAgentConfig } from './agent.js';
export {
  createChangeImpactAgent,
  createChangeImpactAgentFromEnv,
  type ChangeImpactAgentFactoryConfig,
} from './factory.js';
export type {
  ChangeImpactAnalysisState,
  PolicyImpactResult,
  CostImpactResult,
  DownstreamAnalysisResult,
  HistoricalAnalysisResult,
  RiskContext,
  RecommendationContext,
} from './types.js';
