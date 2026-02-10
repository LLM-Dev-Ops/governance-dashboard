/**
 * Google Cloud Edge Function Handler
 *
 * Unified entry point for all governance agents deployed as a single
 * Google Cloud service. Agents are stateless at runtime.
 *
 * Deployment model:
 * - All agents execute inside the LLM-Governance-Dashboard repo
 * - All agents deploy as Google Cloud Edge Functions
 * - The repo deploys ONE unified Google Cloud service
 */

import type { Request, Response } from 'express';
import { createUsageOversightAgentFromEnv } from '../agents/usage-oversight/index.js';
import { createChangeImpactAgentFromEnv } from '../agents/change-impact/index.js';
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

/**
 * Route configuration for agents
 */
const AGENT_ROUTES: Record<string, () => any> = {
  'usage-oversight': createUsageOversightAgentFromEnv,
  'change-impact': createChangeImpactAgentFromEnv,
};

/**
 * Create an AgentContext from the incoming request
 */
function createContextFromRequest(req: Request): AgentContext {
  return {
    execution_ref: (req.headers['x-request-id'] as string) || generateUUID(),
    request_timestamp: getCurrentTimestamp(),
    caller: {
      service: (req.headers['x-caller-service'] as string) || 'unknown',
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

/**
 * Main Edge Function handler
 *
 * Routes requests to the appropriate agent based on the path.
 *
 * Endpoints:
 * - POST /agents/usage-oversight - Execute Usage Oversight Agent
 * - GET /health - Health check
 * - GET /agents - List available agents
 */
export async function handleRequest(req: Request, res: Response): Promise<void> {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, X-Trace-ID');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const path = req.path.replace(/^\/+|\/+$/g, ''); // Normalize path

  // Track active repo span for error handling
  let activeRepoSpan: RepoSpan | undefined;

  try {
    // Health check
    if (path === 'health') {
      res.status(200).json({
        status: 'healthy',
        timestamp: getCurrentTimestamp(),
        version: '1.0.0',
        agents: Object.keys(AGENT_ROUTES),
      });
      return;
    }

    // List agents
    if (path === 'agents' && req.method === 'GET') {
      res.status(200).json({
        agents: Object.keys(AGENT_ROUTES).map((id) => ({
          id,
          endpoint: `/agents/${id}`,
          methods: ['POST'],
        })),
      });
      return;
    }

    // Agent execution
    if (path.startsWith('agents/')) {
      const agentId = path.replace('agents/', '');

      if (req.method !== 'POST') {
        res.status(405).json({
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: `Method ${req.method} not allowed. Use POST.`,
          },
        });
        return;
      }

      const agentFactory = AGENT_ROUTES[agentId];
      if (!agentFactory) {
        res.status(404).json({
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `Agent '${agentId}' not found`,
            available_agents: Object.keys(AGENT_ROUTES),
          },
        });
        return;
      }

      // --- EXECUTION SPAN ENFORCEMENT ---
      // Extract execution context (REQUIRED by Foundational Execution Unit contract)
      const execCtx = extractExecutionContext(
        req.headers as Record<string, string | string[] | undefined>
      );
      if (!execCtx) {
        res.status(400).json(buildContextRejectionResponse());
        return;
      }

      // Create repo-level span
      const repoSpan = createRepoSpan(execCtx);
      activeRepoSpan = repoSpan;

      // Create agent context (preserves existing behavior)
      const context = createContextFromRequest(req);

      // Create agent-level span
      const agentSpan = createAgentSpan(repoSpan, agentId);

      // Execute agent
      const agent = agentFactory();
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
        res.status(500).json(buildExecutionResponse(repoSpan));
        return;
      }

      // Attach DecisionEvent as artifact on the agent span
      if (result.decision_event) {
        attachArtifact(
          agentSpan,
          'decision_event',
          result.decision_event as unknown as Record<string, unknown>
        );
      }

      // Finalize agent span based on result
      if (result.success) {
        completeAgentSpan(agentSpan);
      } else {
        failAgentSpan(agentSpan, {
          code: result.error?.code || 'AGENT_FAILED',
          message: result.error?.message || 'Agent execution failed',
          details: result.error?.details,
        });
      }

      // Attach agent span to repo span and finalize
      repoSpan.agent_spans.push(agentSpan);
      finalizeRepoSpan(repoSpan);

      const executionResult: Record<string, unknown> = {
        success: result.success,
        decision_event_id: result.decision_event?.id,
        output: result.success ? result.output : undefined,
        error: result.success ? undefined : result.error,
      };

      const httpStatus = result.success ? 200 : 400;
      res.status(httpStatus).json(buildExecutionResponse(repoSpan, executionResult));
      return;
    }

    // Not found
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Path '${path}' not found`,
      },
    });
  } catch (error: any) {
    console.error('Edge function error:', error);

    // If we were in span execution mode, finalize and return spans
    if (activeRepoSpan) {
      activeRepoSpan.end_time = getCurrentTimestamp();
      activeRepoSpan.status = 'FAILED';
      activeRepoSpan.error = {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Internal server error',
      };
      res.status(500).json(buildExecutionResponse(activeRepoSpan));
    } else {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Internal server error',
        },
      });
    }
  }
}

/**
 * Express-compatible middleware
 */
export function governanceAgentsMiddleware() {
  return (req: Request, res: Response) => handleRequest(req, res);
}

/**
 * Google Cloud Functions entry point
 */
export const governanceAgents = handleRequest;

// Default export for Google Cloud Functions
export default governanceAgents;
