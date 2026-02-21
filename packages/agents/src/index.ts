/**
 * LLM Governance Dashboard - Agent Infrastructure
 *
 * This package provides the agent infrastructure for the LLM-Governance-Dashboard.
 *
 * IMPORTANT ARCHITECTURAL CONSTRAINTS:
 * - All agents execute inside the LLM-Governance-Dashboard repo
 * - All agents deploy as Google Cloud Edge Functions
 * - The repo deploys ONE unified Google Cloud service
 * - Agents are stateless at runtime
 * - No local persistence is allowed
 * - ALL persistence occurs via ruvector-service client calls only
 * - LLM-Governance-Dashboard NEVER connects directly to Google SQL
 * - LLM-Governance-Dashboard NEVER executes SQL
 *
 * Agent Classification:
 * - GOVERNANCE_AUDIT: Audit and compliance visibility
 * - OVERSIGHT: Usage visibility and monitoring
 * - COMPLIANCE_VISIBILITY: Policy adherence tracking
 * - GOVERNANCE_ANALYSIS: Impact assessment and risk analysis
 */

// Contracts - All schemas from agentics-contracts
export * from './contracts/index.js';

// Infrastructure - Shared components
export * from './infrastructure/index.js';

// Agents
export * from './agents/usage-oversight/index.js';
export * from './agents/change-impact/index.js';
export * from './agents/governance-audit/index.js';

// Handlers - Entry points for deployment
export * from './handlers/index.js';
