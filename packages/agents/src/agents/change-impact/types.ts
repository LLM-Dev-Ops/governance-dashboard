/**
 * Change Impact Agent Internal Types
 *
 * Internal types used by the Change Impact Agent implementation.
 */

import type {
  ImpactDetail,
  AffectedSystem,
  PolicyImplication,
  RiskIndicator,
} from '../../contracts/change-impact.js';

/**
 * Internal state for impact analysis
 */
export interface ChangeImpactAnalysisState {
  impactScore: number;
  confidenceScore: number;
  policiesAnalyzed: number;
  systemsEvaluated: number;
  risksIdentified: number;
}

/**
 * Policy impact analysis result
 */
export interface PolicyImpactResult {
  impacts: ImpactDetail[];
  implications: PolicyImplication[];
  risks: RiskIndicator[];
}

/**
 * Cost impact analysis result
 */
export interface CostImpactResult {
  estimatedDelta: number;
  confidence: number;
  budgetAlerts: string[];
}

/**
 * Downstream system analysis result
 */
export interface DownstreamAnalysisResult {
  systems: AffectedSystem[];
  dependencyChain: string[];
  cascadeRisk: number;
}

/**
 * Historical analysis result
 */
export interface HistoricalAnalysisResult {
  similarChangeCount: number;
  successRate: number;
  commonIssues: string[];
  successPatterns: string[];
}

/**
 * Risk calculation context
 */
export interface RiskContext {
  changeType: string;
  subjectType: string;
  scopeSize: number;
  hasBreakingChanges: boolean;
  affectsProduction: boolean;
}

/**
 * Recommendation generation context
 */
export interface RecommendationContext {
  riskLevel: string;
  impactLevel: string;
  risksCount: number;
  policyImplicationsCount: number;
  affectedSystemsCount: number;
}
