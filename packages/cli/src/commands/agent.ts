/**
 * Agent CLI Commands
 *
 * CLI commands for invoking governance agents.
 *
 * Commands:
 *   llm-gov agent usage-oversight analyze   - Analyze usage patterns
 *   llm-gov agent usage-oversight inspect   - Inspect specific patterns
 *   llm-gov agent usage-oversight summarize - Generate summary
 */

import { Command } from 'commander';
import * as output from '../utils/output';
import { getClient } from '../utils/client';

// Extend output with additional methods used here
const outputHelpers = {
  ...output,
  json: output.formatJSON,
  warn: output.warning,
};

/**
 * Create the agent command group
 */
export function createAgentCommand(): Command {
  const agent = new Command('agent')
    .description('Invoke governance agents');

  // Usage Oversight Agent subcommands
  const usageOversight = new Command('usage-oversight')
    .description('Usage Oversight Agent - Analyze LLM usage patterns for governance');

  usageOversight
    .command('analyze')
    .description('Analyze usage patterns for a time range')
    .requiredOption('--org <id>', 'Organization ID')
    .option('--from <date>', 'Start date (ISO 8601)')
    .option('--to <date>', 'End date (ISO 8601)')
    .option('--team <id>', 'Filter by team ID')
    .option('--user <id>', 'Filter by user ID')
    .option('--format <fmt>', 'Output format (json, table)', 'json')
    .option('--verbose', 'Verbose output', false)
    .action(async (options) => {
      try {
        const client = getClient();

        // Build request
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const request = {
          request_id: crypto.randomUUID(),
          organization_id: options.org,
          time_range: {
            start: options.from || thirtyDaysAgo.toISOString(),
            end: options.to || now.toISOString(),
          },
          usage_patterns: [], // Will be fetched by the agent from upstream
          policy_context: {
            active_policies: [],
          },
          filters: {
            team_ids: options.team ? [options.team] : undefined,
            user_ids: options.user ? [options.user] : undefined,
          },
        };

        outputHelpers.info('Invoking Usage Oversight Agent...');

        const response = await client.post('/agents/usage-oversight', request);

        if (response.data.success) {
          if (options.format === 'table') {
            outputAnalysisTable(response.data.output);
          } else {
            outputHelpers.success('Analysis complete');
            outputHelpers.json(response.data.output);
          }
        } else {
          outputHelpers.error('Analysis failed: ' + JSON.stringify(response.data.error));
        }
      } catch (error: any) {
        outputHelpers.error('Failed to analyze usage: ' + error.message);
        process.exit(1);
      }
    });

  usageOversight
    .command('inspect')
    .description('Inspect a specific decision event or pattern')
    .requiredOption('--id <id>', 'Decision event ID or pattern ID')
    .option('--format <fmt>', 'Output format (json, table)', 'json')
    .action(async (options) => {
      try {
        const client = getClient();

        outputHelpers.info(`Inspecting ${options.id}...`);

        const response = await client.get(`/decision-events/${options.id}`);

        if (response.data) {
          outputHelpers.success('Found decision event');
          outputHelpers.json(response.data);
        } else {
          outputHelpers.warn('Decision event not found');
        }
      } catch (error: any) {
        outputHelpers.error('Failed to inspect: ' + error.message);
        process.exit(1);
      }
    });

  usageOversight
    .command('summarize')
    .description('Generate a governance summary report')
    .requiredOption('--org <id>', 'Organization ID')
    .option('--period <period>', 'Time period (day, week, month)', 'week')
    .option('--format <fmt>', 'Output format (json, table, csv)', 'json')
    .action(async (options) => {
      try {
        const client = getClient();

        // Calculate time range based on period
        const now = new Date();
        let start: Date;
        switch (options.period) {
          case 'day':
            start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case 'week':
            start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }

        const request = {
          request_id: crypto.randomUUID(),
          organization_id: options.org,
          time_range: {
            start: start.toISOString(),
            end: now.toISOString(),
          },
          usage_patterns: [],
          policy_context: {
            active_policies: [],
          },
        };

        outputHelpers.info('Generating governance summary...');

        const response = await client.post('/agents/usage-oversight', request);

        if (response.data.success) {
          outputSummary(response.data.output, options.format);
        } else {
          outputHelpers.error('Summary generation failed: ' + JSON.stringify(response.data.error));
        }
      } catch (error: any) {
        outputHelpers.error('Failed to generate summary: ' + error.message);
        process.exit(1);
      }
    });

  agent.addCommand(usageOversight);

  // Health check command
  agent
    .command('health')
    .description('Check agent service health')
    .action(async () => {
      try {
        const client = getClient();
        const response = await client.get('/health');

        if (response.data.status === 'healthy') {
          outputHelpers.success('Agent service is healthy');
          outputHelpers.json(response.data);
        } else {
          outputHelpers.warn('Agent service health check returned unexpected status');
          outputHelpers.json(response.data);
        }
      } catch (error: any) {
        outputHelpers.error('Health check failed: ' + error.message);
        process.exit(1);
      }
    });

  // List agents command
  agent
    .command('list')
    .description('List available agents')
    .action(async () => {
      try {
        const client = getClient();
        const response = await client.get('/agents');

        outputHelpers.success('Available agents:');
        for (const agent of response.data.agents) {
          outputHelpers.info(`  - ${agent.id} (${agent.endpoint})`);
        }
      } catch (error: any) {
        outputHelpers.error('Failed to list agents: ' + error.message);
        process.exit(1);
      }
    });

  return agent;
}

/**
 * Output analysis results as a table
 */
function outputAnalysisTable(analysisOutput: any): void {
  const summary = analysisOutput.usage_summary;

  outputHelpers.info('\n=== Usage Summary ===');
  outputHelpers.info(`Total Requests: ${summary.total_requests}`);
  outputHelpers.info(`Total Tokens: ${summary.total_tokens.toLocaleString()}`);
  outputHelpers.info(`Total Cost: $${summary.total_cost_usd.toFixed(2)}`);
  outputHelpers.info(`Average Latency: ${summary.average_latency_ms.toFixed(0)}ms`);
  outputHelpers.info(`Unique Users: ${summary.unique_users}`);
  outputHelpers.info(`Unique Models: ${summary.unique_models}`);

  outputHelpers.info('\n=== Governance Health ===');
  const score = analysisOutput.governance_health_score;
  const status = score >= 80 ? 'HEALTHY' : score >= 50 ? 'WARNING' : 'CRITICAL';
  outputHelpers.info(`Health Score: ${score}/100 (${status})`);

  if (analysisOutput.out_of_policy_patterns.length > 0) {
    outputHelpers.info('\n=== Detected Patterns ===');
    for (const pattern of analysisOutput.out_of_policy_patterns) {
      outputHelpers.warn(`[${pattern.severity.toUpperCase()}] ${pattern.category}: ${pattern.description}`);
    }
  }

  if (analysisOutput.recommendations.length > 0) {
    outputHelpers.info('\n=== Recommendations ===');
    for (const rec of analysisOutput.recommendations) {
      outputHelpers.info(`[${rec.priority.toUpperCase()}] ${rec.description}`);
      for (const item of rec.action_items) {
        outputHelpers.info(`  - ${item}`);
      }
    }
  }
}

/**
 * Output summary in specified format
 */
function outputSummary(summaryOutput: any, format: string): void {
  if (format === 'csv') {
    console.log('date,requests,cost_usd');
    for (const bucket of summaryOutput.usage_summary.temporal_distribution) {
      console.log(`${bucket.period},${bucket.requests},${bucket.costUsd.toFixed(2)}`);
    }
  } else if (format === 'table') {
    outputAnalysisTable(summaryOutput);
  } else {
    outputHelpers.json(summaryOutput);
  }
}
