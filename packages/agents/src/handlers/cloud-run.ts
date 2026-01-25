/**
 * Google Cloud Run Handler
 *
 * Phase 4 Layer 1 - Governance & FinOps compliant HTTP server.
 *
 * GOVERNANCE RULES ENFORCED:
 * - Agents MUST emit cost signals
 * - Agents MUST emit policy evaluation signals
 * - Agents MUST emit approval requirements
 * - Agents MUST NOT auto-enforce policy
 * - Agents MUST NOT auto-approve actions
 *
 * PERFORMANCE BUDGETS:
 * - MAX_TOKENS: 1200
 * - MAX_LATENCY_MS: 2500
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { createUsageOversightAgentFromEnv } from '../agents/usage-oversight/index.js';
import { createChangeImpactAgentFromEnv } from '../agents/change-impact/index.js';
import type { AgentContext } from '../contracts/base-agent.js';
import { generateUUID, getCurrentTimestamp } from '../contracts/validation.js';
import {
  PERFORMANCE_BUDGETS,
  PHASE4_ENV,
  validatePerformanceBudgets,
  createPhase4Telemetry,
} from '../config/phase4-layer1.js';

/**
 * Environment configuration
 */
const PORT = parseInt(process.env.PORT || '8080', 10);
const MAX_LATENCY_MS = parseInt(process.env.MAX_LATENCY_MS || String(PERFORMANCE_BUDGETS.MAX_LATENCY_MS), 10);

/**
 * Agent route configuration
 */
const AGENT_ROUTES: Record<string, () => any> = {
  'usage-oversight': createUsageOversightAgentFromEnv,
  'change-impact': createChangeImpactAgentFromEnv,
};

/**
 * Structured logging for Cloud Run
 */
function log(severity: 'INFO' | 'WARNING' | 'ERROR', message: string, data?: Record<string, unknown>): void {
  const entry = {
    severity,
    message,
    timestamp: getCurrentTimestamp(),
    phase: PHASE4_ENV.AGENT_PHASE,
    layer: PHASE4_ENV.AGENT_LAYER,
    ...data,
  };
  console.log(JSON.stringify(entry));
}

/**
 * Parse request body as JSON
 */
async function parseBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString();
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Send JSON response
 */
function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID, X-Trace-ID',
    'X-Agent-Phase': PHASE4_ENV.AGENT_PHASE,
    'X-Agent-Layer': PHASE4_ENV.AGENT_LAYER,
  });
  res.end(JSON.stringify(data));
}

/**
 * Create AgentContext from request headers
 */
function createContext(req: IncomingMessage, body: any): AgentContext {
  return {
    execution_ref: (req.headers['x-request-id'] as string) || generateUUID(),
    request_timestamp: getCurrentTimestamp(),
    caller: {
      service: (req.headers['x-caller-service'] as string) || 'cloud-run',
      version: req.headers['x-caller-version'] as string,
      trace_id: req.headers['x-trace-id'] as string,
    },
    organization_id: body?.organization_id || 'unknown',
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
 * Handle incoming HTTP request
 */
async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const startTime = Date.now();
  const path = (req.url || '/').replace(/^\/+|\/+$/g, '');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, null);
    return;
  }

  try {
    // Health check
    if (path === 'health') {
      sendJson(res, 200, {
        status: 'healthy',
        timestamp: getCurrentTimestamp(),
        version: '1.0.0',
        phase: PHASE4_ENV.AGENT_PHASE,
        layer: PHASE4_ENV.AGENT_LAYER,
        agents: Object.keys(AGENT_ROUTES),
        performance_budgets: PERFORMANCE_BUDGETS,
      });
      return;
    }

    // Readiness check (for Cloud Run)
    if (path === 'ready') {
      sendJson(res, 200, { ready: true });
      return;
    }

    // List agents
    if (path === 'agents' && req.method === 'GET') {
      sendJson(res, 200, {
        agents: Object.keys(AGENT_ROUTES).map((id) => ({
          id,
          endpoint: `/agents/${id}`,
          methods: ['POST'],
          phase: PHASE4_ENV.AGENT_PHASE,
          layer: PHASE4_ENV.AGENT_LAYER,
        })),
      });
      return;
    }

    // Agent execution
    if (path.startsWith('agents/')) {
      const agentId = path.replace('agents/', '');

      if (req.method !== 'POST') {
        sendJson(res, 405, {
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: `Method ${req.method} not allowed. Use POST.`,
          },
        });
        return;
      }

      const agentFactory = AGENT_ROUTES[agentId];
      if (!agentFactory) {
        sendJson(res, 404, {
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `Agent '${agentId}' not found`,
            available_agents: Object.keys(AGENT_ROUTES),
          },
        });
        return;
      }

      // Parse request body
      const body = await parseBody(req);
      const context = createContext(req, body);

      // Create and execute agent
      const agent = agentFactory();
      const result = await agent.execute(body, context);

      // Calculate execution metrics
      const latencyMs = Date.now() - startTime;
      const budgetCheck = validatePerformanceBudgets({ latency_ms: latencyMs });

      // Log execution (structured for Cloud Run)
      log(result.success ? 'INFO' : 'WARNING', `Agent ${agentId} execution`, {
        agent_id: agentId,
        success: result.success,
        latency_ms: latencyMs,
        decision_event_id: result.decision_event?.id,
        budget_violations: budgetCheck.violations,
      });

      // Warn if performance budget exceeded (but don't fail - just emit signal)
      if (!budgetCheck.valid) {
        log('WARNING', 'Performance budget exceeded', {
          agent_id: agentId,
          violations: budgetCheck.violations,
          latency_ms: latencyMs,
          max_latency_ms: MAX_LATENCY_MS,
        });
      }

      // Build response with Phase 4 telemetry
      const telemetry = createPhase4Telemetry(latencyMs, context.caller.service);

      if (result.success) {
        sendJson(res, 200, {
          success: true,
          decision_event_id: result.decision_event.id,
          output: result.output,
          telemetry,
        });
      } else {
        sendJson(res, 400, {
          success: false,
          decision_event_id: result.decision_event?.id,
          error: result.error,
          telemetry,
        });
      }
      return;
    }

    // Not found
    sendJson(res, 404, {
      error: {
        code: 'NOT_FOUND',
        message: `Path '${path}' not found`,
      },
    });
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    log('ERROR', 'Request handler error', {
      error: error.message,
      stack: error.stack,
      path,
      latency_ms: latencyMs,
    });

    sendJson(res, 500, {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Internal server error',
      },
      telemetry: createPhase4Telemetry(latencyMs),
    });
  }
}

/**
 * Create and start HTTP server
 */
const server = createServer(handleRequest);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  log('INFO', 'SIGTERM received, shutting down gracefully');
  server.close(() => {
    log('INFO', 'Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  log('INFO', 'SIGINT received, shutting down');
  server.close(() => {
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  log('INFO', 'Governance Agents Cloud Run service started', {
    port: PORT,
    phase: PHASE4_ENV.AGENT_PHASE,
    layer: PHASE4_ENV.AGENT_LAYER,
    agents: Object.keys(AGENT_ROUTES),
    performance_budgets: PERFORMANCE_BUDGETS,
  });
});

export { server };
