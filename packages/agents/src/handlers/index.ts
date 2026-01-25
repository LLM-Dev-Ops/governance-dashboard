/**
 * Handlers Module
 *
 * Entry points for deploying governance agents.
 *
 * Available handlers:
 * - Edge Function: For Google Cloud Functions
 * - Cloud Run: For Google Cloud Run (Phase 4 Layer 1)
 */

export {
  handleRequest,
  governanceAgentsMiddleware,
  governanceAgents,
} from './edge-function.js';

// Cloud Run handler is a standalone server and should be imported directly
// from './cloud-run.js' when deploying to Cloud Run
