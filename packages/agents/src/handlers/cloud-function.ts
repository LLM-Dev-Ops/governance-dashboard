/**
 * Google Cloud Function Handler
 *
 * Entry point for governance-dashboard-agents Cloud Function.
 *
 * Cloud Function name: governance-dashboard-agents
 * Entry point: handler
 * Runtime: nodejs20
 *
 * Routes:
 * - POST /v1/governance-dashboard/audit     → Governance Audit Agent
 * - POST /v1/governance-dashboard/impact    → Change Impact Agent
 * - POST /v1/governance-dashboard/oversight  → Usage Oversight Agent
 * - GET  /v1/governance-dashboard/health    → Health check
 *
 * Every response includes execution_metadata and layers_executed.
 */

import type { Request, Response } from 'express';
import { createGovernanceAuditAgentFromEnv } from '../agents/governance-audit/index.js';
import { createChangeImpactAgentFromEnv } from '../agents/change-impact/index.js';
import { createUsageOversightAgentFromEnv } from '../agents/usage-oversight/index.js';
import type { AgentContext } from '../contracts/base-agent.js';
import { generateUUID, getCurrentTimestamp } from '../contracts/validation.js';
import {
  extractExecutionContext,
  createRepoSpan,
  createAgentSpan,
  attachArtifact,
  completeAgentSpan,
  failAgentSpan,
  finalizeRepoSpan,
  buildExecutionResponse,
  buildContextRejectionResponse,
} from '../infrastructure/execution-span-manager.js';
import type { RepoSpan } from '../contracts/execution-span.js';

// ============================================================================
// Constants
// ============================================================================

const SERVICE_NAME = 'governance-dashboard-agents';
const ROUTE_PREFIX = 'v1/governance-dashboard';
const HEALTH_AGENTS = ['audit', 'impact', 'oversight'] as const;

/**
 * Agent route configuration.
 * Maps route slug → { factory, label for layers_executed }.
 */
const AGENT_ROUTES: Record<string, { factory: () => any; label: string }> = {
  audit: {
    factory: createGovernanceAuditAgentFromEnv,
    label: 'GOVERNANCE_DASHBOARD_AUDIT',
  },
  impact: {
    factory: createChangeImpactAgentFromEnv,
    label: 'GOVERNANCE_DASHBOARD_IMPACT',
  },
  oversight: {
    factory: createUsageOversightAgentFromEnv,
    label: 'GOVERNANCE_DASHBOARD_OVERSIGHT',
  },
};

// ============================================================================
// Response helpers
// ============================================================================

interface ExecutionMetadata {
  trace_id: string;
  timestamp: string;
  service: string;
  execution_id: string;
}

interface LayerEntry {
  layer: string;
  status: string;
  duration_ms?: number;
}

/**
 * Build the execution_metadata block from request context.
 */
function buildExecutionMetadata(req: Request): ExecutionMetadata {
  return {
    trace_id: (req.headers['x-correlation-id'] as string) || generateUUID(),
    timestamp: getCurrentTimestamp(),
    service: SERVICE_NAME,
    execution_id: generateUUID(),
  };
}

/**
 * Build the full response envelope with execution_metadata + layers_executed.
 */
function buildEnvelope(
  metadata: ExecutionMetadata,
  layers: LayerEntry[],
  data: Record<string, unknown>
): Record<string, unknown> {
  return {
    execution_metadata: metadata,
    layers_executed: layers,
    ...data,
  };
}

/**
 * Apply CORS headers.
 */
function applyCors(res: Response): void {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Request-ID, X-Trace-ID, X-Correlation-ID, X-Parent-Span-ID, X-Execution-ID, X-Caller-Service, X-Caller-Version');
}

/**
 * Send JSON response with CORS.
 */
function sendJson(res: Response, status: number, body: unknown): void {
  applyCors(res);
  res.status(status).json(body);
}

/**
 * Create AgentContext from request.
 */
function createContextFromRequest(req: Request): AgentContext {
  return {
    execution_ref: (req.headers['x-request-id'] as string) || generateUUID(),
    request_timestamp: getCurrentTimestamp(),
    caller: {
      service: (req.headers['x-caller-service'] as string) || 'cloud-function',
      version: req.headers['x-caller-version'] as string,
      trace_id: req.headers['x-trace-id'] as string,
    },
    organization_id: req.body?.organization_id || 'unknown',
    telemetry_context: req.headers['x-trace-id']
      ? {
          trace_id: req.headers['x-trace-id'] as string,
          span_id: generateUUID().slice(0, 16),
          parent_span_id: req.headers['x-parent-span-id'] as string,
        }
      : undefined,
  };
}

// ============================================================================
// Main handler — exported as `handler` for gcloud --entry-point
// ============================================================================

/**
 * Google Cloud Function entry point.
 *
 * @param req - Express-compatible Request
 * @param res - Express-compatible Response
 */
export async function handler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();

  // CORS preflight
  if (req.method === 'OPTIONS') {
    applyCors(res);
    res.status(204).send('');
    return;
  }

  // Normalize path — strip leading/trailing slashes
  const path = (req.path || '/').replace(/^\/+|\/+$/g, '');

  const metadata = buildExecutionMetadata(req);

  // Track repo span for error handling
  let activeRepoSpan: RepoSpan | undefined;

  try {
    // ---- Health check ----
    if (path === `${ROUTE_PREFIX}/health` || path === 'health') {
      const layers: LayerEntry[] = [
        { layer: 'AGENT_ROUTING', status: 'completed' },
        { layer: 'HEALTH_CHECK', status: 'completed', duration_ms: Date.now() - startTime },
      ];

      sendJson(res, 200, buildEnvelope(metadata, layers, {
        status: 'healthy',
        agents: [...HEALTH_AGENTS],
        version: '1.0.0',
      }));
      return;
    }

    // ---- Agent routes ----
    // Match: v1/governance-dashboard/{agentSlug}
    const agentRoutePrefix = `${ROUTE_PREFIX}/`;
    if (path.startsWith(agentRoutePrefix)) {
      const agentSlug = path.slice(agentRoutePrefix.length);
      const route = AGENT_ROUTES[agentSlug];

      if (!route) {
        const layers: LayerEntry[] = [
          { layer: 'AGENT_ROUTING', status: 'failed', duration_ms: Date.now() - startTime },
        ];
        sendJson(res, 404, buildEnvelope(metadata, layers, {
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `Agent '${agentSlug}' not found`,
            available_agents: Object.keys(AGENT_ROUTES),
          },
        }));
        return;
      }

      if (req.method !== 'POST') {
        const layers: LayerEntry[] = [
          { layer: 'AGENT_ROUTING', status: 'failed', duration_ms: Date.now() - startTime },
        ];
        sendJson(res, 405, buildEnvelope(metadata, layers, {
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: `Method ${req.method} not allowed. Use POST.`,
          },
        }));
        return;
      }

      // Routing layer completed
      const routingDone = Date.now();

      // --- Execution Span enforcement ---
      const execCtx = extractExecutionContext(
        req.headers as Record<string, string | string[] | undefined>
      );
      if (!execCtx) {
        const layers: LayerEntry[] = [
          { layer: 'AGENT_ROUTING', status: 'completed', duration_ms: routingDone - startTime },
          { layer: route.label, status: 'failed', duration_ms: Date.now() - routingDone },
        ];
        sendJson(res, 400, buildEnvelope(metadata, layers, buildContextRejectionResponse()));
        return;
      }

      // Create repo span
      const repoSpan = createRepoSpan(execCtx);
      activeRepoSpan = repoSpan;

      // Create agent context
      const context = createContextFromRequest(req);

      // Create agent span
      const agentSpan = createAgentSpan(repoSpan, agentSlug);

      // Execute agent
      const agent = route.factory();
      let result;
      try {
        result = await agent.execute(req.body, context);
      } catch (agentError: any) {
        failAgentSpan(agentSpan, {
          code: agentError.code || 'AGENT_UNHANDLED_ERROR',
          message: agentError.message || 'Unhandled agent error',
        });
        repoSpan.agent_spans.push(agentSpan);
        finalizeRepoSpan(repoSpan);

        const agentDone = Date.now();
        const layers: LayerEntry[] = [
          { layer: 'AGENT_ROUTING', status: 'completed', duration_ms: routingDone - startTime },
          { layer: route.label, status: 'failed', duration_ms: agentDone - routingDone },
        ];
        sendJson(res, 500, buildEnvelope(metadata, layers, buildExecutionResponse(repoSpan)));
        return;
      }

      // Attach DecisionEvent artifact
      if (result.decision_event) {
        attachArtifact(
          agentSpan,
          'decision_event',
          result.decision_event as unknown as Record<string, unknown>
        );
      }

      // Finalize agent span
      if (result.success) {
        completeAgentSpan(agentSpan);
      } else {
        failAgentSpan(agentSpan, {
          code: result.error?.code || 'AGENT_FAILED',
          message: result.error?.message || 'Agent execution failed',
          details: result.error?.details,
        });
      }

      repoSpan.agent_spans.push(agentSpan);
      finalizeRepoSpan(repoSpan);

      const agentDone = Date.now();
      const layers: LayerEntry[] = [
        { layer: 'AGENT_ROUTING', status: 'completed', duration_ms: routingDone - startTime },
        { layer: route.label, status: result.success ? 'completed' : 'failed', duration_ms: agentDone - routingDone },
      ];

      const executionResult: Record<string, unknown> = {
        success: result.success,
        decision_event_id: result.decision_event?.id,
        output: result.success ? result.output : undefined,
        error: result.success ? undefined : result.error,
      };

      const httpStatus = result.success ? 200 : 400;
      sendJson(res, httpStatus, buildEnvelope(metadata, layers, {
        ...buildExecutionResponse(repoSpan, executionResult),
      }));
      return;
    }

    // ---- Not found ----
    const layers: LayerEntry[] = [
      { layer: 'AGENT_ROUTING', status: 'failed', duration_ms: Date.now() - startTime },
    ];
    sendJson(res, 404, buildEnvelope(metadata, layers, {
      error: {
        code: 'NOT_FOUND',
        message: `Path '/${path}' not found. Use /v1/governance-dashboard/{audit|impact|oversight}`,
      },
    }));
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error('Cloud Function handler error:', error);

    const layers: LayerEntry[] = [
      { layer: 'AGENT_ROUTING', status: 'failed', duration_ms: elapsed },
    ];

    if (activeRepoSpan) {
      activeRepoSpan.end_time = getCurrentTimestamp();
      activeRepoSpan.status = 'FAILED';
      activeRepoSpan.error = {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Internal server error',
      };
      sendJson(res, 500, buildEnvelope(metadata, layers, buildExecutionResponse(activeRepoSpan)));
    } else {
      sendJson(res, 500, buildEnvelope(metadata, layers, {
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Internal server error',
        },
      }));
    }
  }
}

// Default export for Cloud Functions
export default handler;
