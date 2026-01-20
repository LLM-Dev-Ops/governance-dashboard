/**
 * Governance Audit Agent CLI Commands
 *
 * CLI interface for the Governance Audit Agent.
 *
 * Classification: GOVERNANCE / AUDIT / OVERSIGHT
 *
 * Commands:
 * - audit: Generate a governance audit
 * - inspect: Inspect a specific audit or finding
 * - summarize: Generate a governance summary
 * - agent: Show agent registration info
 */

import { Command } from 'commander';
import ora from 'ora';
import Table from 'cli-table3';
import { getClient } from '../utils/client';
import { config } from '../utils/config';
import { success, error, info, warn, handleError, formatJSON } from '../utils/output';
import type {
  GovernanceDecisionType,
  GovernanceAuditInput,
  GovernanceAuditCLIArgs,
  GovernanceSeverity,
} from '@llm-governance/types';

// API base URL from config or environment
const getApiUrl = (): string => {
  return config.get('apiUrl') || process.env.LLM_GOV_API_URL || 'http://localhost:8000';
};

// Make API request
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = config.getToken();
  const url = `${getApiUrl()}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API request failed: ${response.status}`);
  }

  return response.json();
}

export function createAuditCommand(): Command {
  const audit = new Command('audit');
  audit.description('Governance Audit Agent - Generate authoritative audit summaries');

  // Generate audit command
  audit
    .command('generate')
    .alias('run')
    .description('Generate a governance audit summary')
    .requiredOption('--org <id>', 'Organization ID to audit')
    .option('--type <type>', 'Audit type (audit_summary, compliance_status, governance_snapshot, policy_adherence, approval_trail)', 'audit_summary')
    .option('--from <date>', 'Start date (ISO 8601)', getDefaultFromDate())
    .option('--to <date>', 'End date (ISO 8601)', new Date().toISOString())
    .option('--teams <ids>', 'Comma-separated team IDs to include')
    .option('--users <ids>', 'Comma-separated user IDs to include')
    .option('--detailed', 'Include detailed findings', false)
    .option('--baseline <ref>', 'Baseline reference for comparison')
    .option('--json', 'Output in JSON format')
    .option('--output <file>', 'Write output to file')
    .action(async (options) => {
      try {
        if (!config.isLoggedIn()) {
          error('Not logged in. Run "llm-gov auth login" first.');
          process.exit(1);
        }

        const spinner = ora('Generating governance audit...').start();

        // Build request body
        const requestBody = {
          organization_id: options.org,
          audit_type: options.type,
          from: options.from,
          to: options.to,
          scope: {
            teams: options.teams ? options.teams.split(',') : undefined,
            users: options.users ? options.users.split(',') : undefined,
          },
          include_details: options.detailed,
          baseline_ref: options.baseline,
        };

        const response = await apiRequest<{
          data: {
            event_id: string;
            agent_id: string;
            agent_version: string;
            decision_type: string;
            timestamp: string;
            organization_id: string;
            summary: string;
            metrics: {
              events_analyzed: number;
              coverage_percentage: number;
              policies_evaluated: number;
              compliance_rate: number;
              findings_by_severity: Record<string, number>;
              trend: string;
            };
            findings_count: number;
            findings?: Array<{
              id: string;
              category: string;
              severity: string;
              title: string;
              description: string;
              affected_resources: string[];
              first_detected: string;
              last_seen: string;
            }>;
            recommendations: string[];
            confidence: {
              overall: number;
              completeness: number;
              certainty: number;
            };
            telemetry_ref: string;
            artifact_ref: string;
          };
          success: boolean;
          message?: string;
        }>('/api/v1/governance/audit', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        });

        spinner.stop();

        if (options.json) {
          formatJSON(response.data);
        } else {
          displayAuditResult(response.data, options.detailed);
        }

        // Write to file if specified
        if (options.output) {
          const fs = await import('fs').then(m => m.promises);
          await fs.writeFile(options.output, JSON.stringify(response.data, null, 2));
          info(`\nOutput written to: ${options.output}`);
        }

        success('\nGovernance audit completed successfully!');
      } catch (err) {
        handleError(err);
      }
    });

  // List audits command
  audit
    .command('list')
    .description('List previous governance audits')
    .requiredOption('--org <id>', 'Organization ID')
    .option('--type <type>', 'Filter by audit type')
    .option('--from <date>', 'Filter from date')
    .option('--to <date>', 'Filter to date')
    .option('--limit <n>', 'Maximum results', '50')
    .option('--offset <n>', 'Results offset', '0')
    .option('--json', 'Output in JSON format')
    .action(async (options) => {
      try {
        if (!config.isLoggedIn()) {
          error('Not logged in. Run "llm-gov auth login" first.');
          process.exit(1);
        }

        const spinner = ora('Fetching governance audits...').start();

        const params = new URLSearchParams({
          organization_id: options.org,
          limit: options.limit,
          offset: options.offset,
        });

        if (options.type) params.append('audit_type', options.type);
        if (options.from) params.append('from', options.from);
        if (options.to) params.append('to', options.to);

        const response = await apiRequest<{
          data: {
            audits: Array<{
              id: string;
              timestamp: string;
              action: string;
              details: Record<string, unknown>;
            }>;
            limit: number;
            offset: number;
          };
          success: boolean;
        }>(`/api/v1/governance/audits?${params.toString()}`);

        spinner.stop();

        if (options.json) {
          formatJSON(response.data);
        } else {
          displayAuditList(response.data.audits);
        }
      } catch (err) {
        handleError(err);
      }
    });

  // Get audit command
  audit
    .command('get <audit-id>')
    .alias('inspect')
    .description('Get details of a specific governance audit')
    .option('--json', 'Output in JSON format')
    .action(async (auditId, options) => {
      try {
        if (!config.isLoggedIn()) {
          error('Not logged in. Run "llm-gov auth login" first.');
          process.exit(1);
        }

        const spinner = ora('Fetching audit details...').start();

        const response = await apiRequest<{
          data: {
            id: string;
            timestamp: string;
            action: string;
            details: Record<string, unknown>;
          };
          success: boolean;
        }>(`/api/v1/governance/audit/${auditId}`);

        spinner.stop();

        if (options.json) {
          formatJSON(response.data);
        } else {
          displayAuditDetails(response.data);
        }
      } catch (err) {
        handleError(err);
      }
    });

  // Summary command
  audit
    .command('summary')
    .alias('summarize')
    .description('Generate a governance state summary')
    .requiredOption('--org <id>', 'Organization ID')
    .option('--days <n>', 'Number of days to analyze', '30')
    .option('--json', 'Output in JSON format')
    .action(async (options) => {
      try {
        if (!config.isLoggedIn()) {
          error('Not logged in. Run "llm-gov auth login" first.');
          process.exit(1);
        }

        const spinner = ora('Generating governance summary...').start();

        const params = new URLSearchParams({
          organization_id: options.org,
          period_days: options.days,
        });

        const response = await apiRequest<{
          data: {
            organization_id: string;
            period: {
              from: string;
              to: string;
              days: number;
            };
            summary: {
              total_audit_events: number;
              unique_users: number;
              policy_evaluations: number;
              governance_status: string;
            };
            agent: {
              id: string;
              version: string;
            };
          };
          success: boolean;
        }>(`/api/v1/governance/summary?${params.toString()}`);

        spinner.stop();

        if (options.json) {
          formatJSON(response.data);
        } else {
          displaySummary(response.data);
        }
      } catch (err) {
        handleError(err);
      }
    });

  // Agent info command
  audit
    .command('agent')
    .description('Show Governance Audit Agent registration info')
    .option('--json', 'Output in JSON format')
    .action(async (options) => {
      try {
        const spinner = ora('Fetching agent information...').start();

        const response = await apiRequest<{
          data: {
            agent_id: string;
            name: string;
            description: string;
            version: string;
            classification: string;
            decision_types: string[];
            capabilities: string[];
            non_responsibilities: string[];
            endpoints: Record<string, string>;
          };
          success: boolean;
        }>('/api/v1/governance/agent');

        spinner.stop();

        if (options.json) {
          formatJSON(response.data);
        } else {
          displayAgentInfo(response.data);
        }
      } catch (err) {
        handleError(err);
      }
    });

  return audit;
}

// Helper functions

function getDefaultFromDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString();
}

function displayAuditResult(data: {
  event_id: string;
  agent_id: string;
  agent_version: string;
  decision_type: string;
  timestamp: string;
  organization_id: string;
  summary: string;
  metrics: {
    events_analyzed: number;
    coverage_percentage: number;
    policies_evaluated: number;
    compliance_rate: number;
    findings_by_severity: Record<string, number>;
    trend: string;
  };
  findings_count: number;
  findings?: Array<{
    id: string;
    category: string;
    severity: string;
    title: string;
    description: string;
    affected_resources: string[];
  }>;
  recommendations: string[];
  confidence: {
    overall: number;
    completeness: number;
    certainty: number;
  };
  telemetry_ref: string;
  artifact_ref: string;
}, detailed: boolean): void {
  console.log('');
  console.log('========================================');
  console.log('     GOVERNANCE AUDIT REPORT');
  console.log('========================================');
  console.log('');

  info(`Event ID: ${data.event_id}`);
  info(`Agent: ${data.agent_id} v${data.agent_version}`);
  info(`Type: ${data.decision_type}`);
  info(`Organization: ${data.organization_id}`);
  info(`Timestamp: ${data.timestamp}`);
  console.log('');

  console.log('--- Summary ---');
  console.log(data.summary);
  console.log('');

  console.log('--- Metrics ---');
  const metricsTable = new Table({
    head: ['Metric', 'Value'],
    colWidths: [30, 20],
  });
  metricsTable.push(
    ['Events Analyzed', data.metrics.events_analyzed.toString()],
    ['Coverage', `${data.metrics.coverage_percentage.toFixed(1)}%`],
    ['Policies Evaluated', data.metrics.policies_evaluated.toString()],
    ['Compliance Rate', `${data.metrics.compliance_rate.toFixed(1)}%`],
    ['Trend', data.metrics.trend],
  );
  console.log(metricsTable.toString());
  console.log('');

  console.log('--- Findings by Severity ---');
  const severityTable = new Table({
    head: ['Severity', 'Count'],
    colWidths: [20, 10],
  });
  Object.entries(data.metrics.findings_by_severity).forEach(([severity, count]) => {
    severityTable.push([severity, count.toString()]);
  });
  if (Object.keys(data.metrics.findings_by_severity).length === 0) {
    severityTable.push(['No findings', '-']);
  }
  console.log(severityTable.toString());
  console.log('');

  if (detailed && data.findings && data.findings.length > 0) {
    console.log('--- Detailed Findings ---');
    data.findings.forEach((finding, idx) => {
      console.log(`\n[${idx + 1}] ${finding.title}`);
      console.log(`    Severity: ${finding.severity}`);
      console.log(`    Category: ${finding.category}`);
      console.log(`    ${finding.description}`);
      if (finding.affected_resources.length > 0) {
        console.log(`    Affected: ${finding.affected_resources.join(', ')}`);
      }
    });
    console.log('');
  }

  console.log('--- Recommendations ---');
  if (data.recommendations.length > 0) {
    data.recommendations.forEach((rec, idx) => {
      console.log(`  ${idx + 1}. ${rec}`);
    });
  } else {
    console.log('  No recommendations at this time.');
  }
  console.log('');

  console.log('--- Confidence ---');
  info(`Overall: ${(data.confidence.overall * 100).toFixed(1)}%`);
  info(`Completeness: ${(data.confidence.completeness * 100).toFixed(1)}%`);
  info(`Certainty: ${(data.confidence.certainty * 100).toFixed(1)}%`);
  console.log('');

  console.log('--- References ---');
  info(`Telemetry: ${data.telemetry_ref}`);
  info(`Artifact: ${data.artifact_ref}`);
  console.log('');
}

function displayAuditList(audits: Array<{
  id: string;
  timestamp: string;
  action: string;
  details: Record<string, unknown>;
}>): void {
  if (audits.length === 0) {
    info('No governance audits found.');
    return;
  }

  console.log('');
  const table = new Table({
    head: ['ID', 'Timestamp', 'Action', 'Details'],
    colWidths: [40, 25, 20, 40],
  });

  audits.forEach((audit) => {
    table.push([
      audit.id,
      new Date(audit.timestamp).toLocaleString(),
      audit.action,
      JSON.stringify(audit.details).substring(0, 35) + '...',
    ]);
  });

  console.log(table.toString());
  console.log('');
  info(`Total: ${audits.length} audit(s)`);
}

function displayAuditDetails(data: {
  id: string;
  timestamp: string;
  action: string;
  details: Record<string, unknown>;
}): void {
  console.log('');
  console.log('--- Audit Details ---');
  info(`ID: ${data.id}`);
  info(`Timestamp: ${new Date(data.timestamp).toLocaleString()}`);
  info(`Action: ${data.action}`);
  console.log('');
  console.log('Details:');
  console.log(JSON.stringify(data.details, null, 2));
  console.log('');
}

function displaySummary(data: {
  organization_id: string;
  period: {
    from: string;
    to: string;
    days: number;
  };
  summary: {
    total_audit_events: number;
    unique_users: number;
    policy_evaluations: number;
    governance_status: string;
  };
  agent: {
    id: string;
    version: string;
  };
}): void {
  console.log('');
  console.log('========================================');
  console.log('     GOVERNANCE STATE SUMMARY');
  console.log('========================================');
  console.log('');

  info(`Organization: ${data.organization_id}`);
  info(`Period: ${data.period.days} days (${new Date(data.period.from).toLocaleDateString()} - ${new Date(data.period.to).toLocaleDateString()})`);
  console.log('');

  const table = new Table({
    head: ['Metric', 'Value'],
    colWidths: [30, 20],
  });
  table.push(
    ['Total Audit Events', data.summary.total_audit_events.toString()],
    ['Unique Users', data.summary.unique_users.toString()],
    ['Policy Evaluations', data.summary.policy_evaluations.toString()],
    ['Governance Status', getStatusDisplay(data.summary.governance_status)],
  );
  console.log(table.toString());
  console.log('');

  info(`Agent: ${data.agent.id} v${data.agent.version}`);
  console.log('');
}

function displayAgentInfo(data: {
  agent_id: string;
  name: string;
  description: string;
  version: string;
  classification: string;
  decision_types: string[];
  capabilities: string[];
  non_responsibilities: string[];
  endpoints: Record<string, string>;
}): void {
  console.log('');
  console.log('========================================');
  console.log('     GOVERNANCE AUDIT AGENT');
  console.log('========================================');
  console.log('');

  info(`ID: ${data.agent_id}`);
  info(`Name: ${data.name}`);
  info(`Version: ${data.version}`);
  info(`Classification: ${data.classification.toUpperCase()}`);
  console.log('');
  console.log(`Description: ${data.description}`);
  console.log('');

  console.log('--- Decision Types ---');
  data.decision_types.forEach((dt) => console.log(`  - ${dt}`));
  console.log('');

  console.log('--- Capabilities ---');
  data.capabilities.forEach((cap) => console.log(`  - ${cap}`));
  console.log('');

  console.log('--- Non-Responsibilities (Explicit Boundaries) ---');
  data.non_responsibilities.forEach((nr) => console.log(`  - ${nr}`));
  console.log('');

  console.log('--- Endpoints ---');
  Object.entries(data.endpoints).forEach(([name, endpoint]) => {
    console.log(`  ${name}: ${endpoint}`);
  });
  console.log('');
}

function getStatusDisplay(status: string): string {
  switch (status) {
    case 'healthy':
      return 'HEALTHY';
    case 'moderate':
      return 'MODERATE';
    case 'limited':
      return 'LIMITED';
    default:
      return status.toUpperCase();
  }
}
