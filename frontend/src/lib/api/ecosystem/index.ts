/**
 * LLM-Dev-Ops Ecosystem Consumer Adapters
 *
 * This module provides thin adapter layers for consuming data from upstream
 * LLM-Dev-Ops ecosystem components. These are additive, read-only consumers
 * that do not modify existing public APIs.
 *
 * Phase 2B - Runtime Consumer Integrations
 */

export * from './policy-engine';
export * from './registry';
export * from './cost-ops';
export * from './observatory';
export * from './analytics-hub';
export { createGovernanceAuditConsumer } from './governance-audit';
export type {
	GovernanceDecisionType,
	GovernanceSeverity,
	FindingCategory,
	TrendDirection as GovernanceTrendDirection,
	DateRange as GovernanceDateRange,
	GovernanceFinding,
	GovernanceMetrics,
	DecisionConfidence,
	AuditArtifact,
	GovernanceAuditResult,
	GovernanceSummary,
	AgentRegistrationInfo,
	GovernanceAuditRequest,
	StoredAudit,
	GovernanceAuditConsumer
} from './governance-audit';
export * from './types';
