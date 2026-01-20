/**
 * Change Impact Agent CLI Commands
 *
 * CLI interface for the Change Impact Agent.
 *
 * Classification: GOVERNANCE ANALYSIS
 *
 * Purpose:
 * - Assess downstream governance and compliance impact of configuration or policy changes
 *
 * Scope:
 * - Analyze historical changes
 * - Evaluate affected systems and policies
 * - Surface governance risk indicators
 *
 * decision_type: "change_impact_assessment"
 *
 * Commands:
 * - assess: Assess impact of a change
 * - compare: Compare two configurations
 * - history: View change impact history
 * - simulate: Simulate a hypothetical change
 * - agent: Show agent registration info
 *
 * Non-Responsibilities (NEVER does):
 * - Intercept execution
 * - Enforce policies
 * - Modify configurations
 * - Block or approve changes
 * - Execute changes
 */

import { Command } from 'commander';
import ora from 'ora';
import Table from 'cli-table3';
import { config } from '../utils/config';
import { success, error, info, warn, handleError, formatJSON } from '../utils/output';
import type {
  ChangeType,
  ChangeSubjectType,
  ImpactLevel,
  RiskClassification,
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

export function createChangeImpactCommand(): Command {
  const changeImpact = new Command('change-impact');
  changeImpact.description('Change Impact Agent - Assess governance and compliance impact of changes');

  // Assess change impact command
  changeImpact
    .command('assess')
    .alias('evaluate')
    .description('Assess the impact of a configuration or policy change')
    .requiredOption('--org <id>', 'Organization ID')
    .requiredOption('--change-id <id>', 'Change identifier')
    .requiredOption('--change-type <type>', 'Change type (create, update, delete, toggle, configure, policy_modify, access_change, model_version, budget_adjust, quota_modify)')
    .requiredOption('--subject-type <type>', 'Subject type (policy, policy_rule, configuration, llm_model, llm_provider, budget, quota, access_control, team, user, organization, integration, webhook)')
    .requiredOption('--subject-id <id>', 'Subject ID being changed')
    .option('--description <text>', 'Human-readable description of the change')
    .option('--initiator <user>', 'User or system initiating the change')
    .option('--previous-state <json>', 'Previous state as JSON')
    .option('--new-state <json>', 'New state as JSON')
    .option('--teams <ids>', 'Comma-separated team IDs to scope analysis')
    .option('--depth <n>', 'Analysis depth (1-5)', '3')
    .option('--include-cost', 'Include cost impact analysis', false)
    .option('--include-compliance', 'Include compliance impact analysis', false)
    .option('--include-downstream', 'Include downstream system analysis', true)
    .option('--include-history', 'Include historical context', false)
    .option('--from <date>', 'Historical analysis start date (ISO 8601)')
    .option('--to <date>', 'Historical analysis end date (ISO 8601)')
    .option('--json', 'Output in JSON format')
    .option('--output <file>', 'Write output to file')
    .action(async (options) => {
      try {
        if (!config.isLoggedIn()) {
          error('Not logged in. Run "llm-gov auth login" first.');
          process.exit(1);
        }

        const spinner = ora('Assessing change impact...').start();

        // Parse JSON states if provided
        let previousState: Record<string, unknown> | undefined;
        let newState: Record<string, unknown> | undefined;

        if (options.previousState) {
          try {
            previousState = JSON.parse(options.previousState);
          } catch {
            spinner.stop();
            error('Invalid JSON for --previous-state');
            process.exit(1);
          }
        }

        if (options.newState) {
          try {
            newState = JSON.parse(options.newState);
          } catch {
            spinner.stop();
            error('Invalid JSON for --new-state');
            process.exit(1);
          }
        }

        // Build request body
        const requestBody = {
          organization_id: options.org,
          change_request: {
            change_id: options.changeId,
            change_type: options.changeType,
            subject_type: options.subjectType,
            subject_id: options.subjectId,
            description: options.description || `${options.changeType} ${options.subjectType} ${options.subjectId}`,
            timestamp: new Date().toISOString(),
            initiator: options.initiator || 'cli-user',
            previous_state: previousState,
            new_state: newState,
          },
          scope: {
            teams: options.teams ? options.teams.split(',') : undefined,
            analysis_depth: parseInt(options.depth, 10),
            include_cost_impact: options.includeCost,
            include_compliance_impact: options.includeCompliance,
          },
          include_downstream: options.includeDownstream,
          include_risk_projection: options.includeHistory,
          historical_range: options.from || options.to ? {
            start: options.from || getDefaultFromDate(),
            end: options.to || new Date().toISOString(),
          } : undefined,
        };

        const response = await apiRequest<{
          data: ChangeImpactResponseData;
          success: boolean;
          message?: string;
        }>('/api/v1/governance/change-impact', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        });

        spinner.stop();

        if (options.json) {
          formatJSON(response.data);
        } else {
          displayChangeImpactResult(response.data);
        }

        // Write to file if specified
        if (options.output) {
          const fs = await import('fs').then(m => m.promises);
          await fs.writeFile(options.output, JSON.stringify(response.data, null, 2));
          info(`\nOutput written to: ${options.output}`);
        }

        // Display appropriate message based on risk
        const risk = response.data.assessment.risk_classification;
        if (risk === 'critical_risk' || risk === 'unacceptable') {
          warn('\nChange impact assessment complete - CRITICAL RISK IDENTIFIED');
        } else if (risk === 'high_risk') {
          warn('\nChange impact assessment complete - HIGH RISK IDENTIFIED');
        } else {
          success('\nChange impact assessment completed successfully!');
        }
      } catch (err) {
        handleError(err);
      }
    });

  // List change impact history command
  changeImpact
    .command('history')
    .alias('list')
    .description('List previous change impact assessments')
    .requiredOption('--org <id>', 'Organization ID')
    .option('--subject-type <type>', 'Filter by subject type')
    .option('--risk-level <level>', 'Filter by risk classification (acceptable, low_risk, medium_risk, high_risk, critical_risk, unacceptable)')
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

        const spinner = ora('Fetching change impact history...').start();

        const params = new URLSearchParams({
          organization_id: options.org,
          limit: options.limit,
          offset: options.offset,
        });

        if (options.subjectType) params.append('subject_type', options.subjectType);
        if (options.riskLevel) params.append('risk_level', options.riskLevel);
        if (options.from) params.append('from', options.from);
        if (options.to) params.append('to', options.to);

        const response = await apiRequest<{
          data: {
            assessments: Array<{
              id: string;
              change_request_id: string;
              subject_type: string;
              impact_level: string;
              risk_classification: string;
              risk_score: number;
              assessed_at: string;
            }>;
            total: number;
            limit: number;
            offset: number;
          };
          success: boolean;
        }>(`/api/v1/governance/change-impact/history?${params.toString()}`);

        spinner.stop();

        if (options.json) {
          formatJSON(response.data);
        } else {
          displayChangeImpactHistory(response.data.assessments);
        }
      } catch (err) {
        handleError(err);
      }
    });

  // Get specific assessment command
  changeImpact
    .command('get <assessment-id>')
    .alias('inspect')
    .description('Get details of a specific change impact assessment')
    .option('--json', 'Output in JSON format')
    .action(async (assessmentId, options) => {
      try {
        if (!config.isLoggedIn()) {
          error('Not logged in. Run "llm-gov auth login" first.');
          process.exit(1);
        }

        const spinner = ora('Fetching assessment details...').start();

        const response = await apiRequest<{
          data: ChangeImpactResponseData;
          success: boolean;
        }>(`/api/v1/governance/change-impact/${assessmentId}`);

        spinner.stop();

        if (options.json) {
          formatJSON(response.data);
        } else {
          displayChangeImpactResult(response.data);
        }
      } catch (err) {
        handleError(err);
      }
    });

  // Compare configurations command
  changeImpact
    .command('compare')
    .description('Compare two configurations and assess impact of moving from one to another')
    .requiredOption('--org <id>', 'Organization ID')
    .requiredOption('--subject-type <type>', 'Subject type being compared')
    .requiredOption('--subject-id <id>', 'Subject ID')
    .requiredOption('--baseline <json-or-file>', 'Baseline configuration (JSON or file path)')
    .requiredOption('--target <json-or-file>', 'Target configuration (JSON or file path)')
    .option('--depth <n>', 'Analysis depth (1-5)', '3')
    .option('--json', 'Output in JSON format')
    .action(async (options) => {
      try {
        if (!config.isLoggedIn()) {
          error('Not logged in. Run "llm-gov auth login" first.');
          process.exit(1);
        }

        const spinner = ora('Comparing configurations...').start();

        // Parse baseline and target (could be JSON or file path)
        let baseline: Record<string, unknown>;
        let target: Record<string, unknown>;

        try {
          baseline = await parseJsonOrFile(options.baseline);
          target = await parseJsonOrFile(options.target);
        } catch (parseError) {
          spinner.stop();
          error(`Failed to parse configurations: ${parseError}`);
          process.exit(1);
        }

        const requestBody = {
          organization_id: options.org,
          change_request: {
            change_id: `compare-${Date.now()}`,
            change_type: 'update',
            subject_type: options.subjectType,
            subject_id: options.subjectId,
            description: `Compare configuration: ${options.subjectType} ${options.subjectId}`,
            timestamp: new Date().toISOString(),
            initiator: 'cli-compare',
            previous_state: baseline,
            new_state: target,
          },
          scope: {
            analysis_depth: parseInt(options.depth, 10),
            include_cost_impact: true,
            include_compliance_impact: true,
          },
          include_downstream: true,
        };

        const response = await apiRequest<{
          data: ChangeImpactResponseData;
          success: boolean;
        }>('/api/v1/governance/change-impact', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        });

        spinner.stop();

        if (options.json) {
          formatJSON(response.data);
        } else {
          console.log('');
          console.log('========================================');
          console.log('     CONFIGURATION COMPARISON');
          console.log('========================================');
          console.log('');
          displayChangeImpactResult(response.data);
        }
      } catch (err) {
        handleError(err);
      }
    });

  // Simulate hypothetical change command
  changeImpact
    .command('simulate')
    .alias('what-if')
    .description('Simulate impact of a hypothetical change without executing')
    .requiredOption('--org <id>', 'Organization ID')
    .requiredOption('--subject-type <type>', 'Subject type')
    .requiredOption('--subject-id <id>', 'Subject ID')
    .requiredOption('--change-type <type>', 'Change type to simulate')
    .option('--new-state <json>', 'Hypothetical new state as JSON')
    .option('--depth <n>', 'Analysis depth (1-5)', '4')
    .option('--json', 'Output in JSON format')
    .action(async (options) => {
      try {
        if (!config.isLoggedIn()) {
          error('Not logged in. Run "llm-gov auth login" first.');
          process.exit(1);
        }

        const spinner = ora('Simulating change impact...').start();

        let newState: Record<string, unknown> | undefined;
        if (options.newState) {
          try {
            newState = JSON.parse(options.newState);
          } catch {
            spinner.stop();
            error('Invalid JSON for --new-state');
            process.exit(1);
          }
        }

        const requestBody = {
          organization_id: options.org,
          change_request: {
            change_id: `simulation-${Date.now()}`,
            change_type: options.changeType,
            subject_type: options.subjectType,
            subject_id: options.subjectId,
            description: `SIMULATION: ${options.changeType} ${options.subjectType} ${options.subjectId}`,
            timestamp: new Date().toISOString(),
            initiator: 'cli-simulation',
            new_state: newState,
            metadata: { simulation: true },
          },
          scope: {
            analysis_depth: parseInt(options.depth, 10),
            include_cost_impact: true,
            include_compliance_impact: true,
          },
          include_downstream: true,
          include_risk_projection: true,
        };

        const response = await apiRequest<{
          data: ChangeImpactResponseData;
          success: boolean;
        }>('/api/v1/governance/change-impact/simulate', {
          method: 'POST',
          body: JSON.stringify(requestBody),
        });

        spinner.stop();

        console.log('');
        warn('========================================');
        warn('     SIMULATION - NOT A REAL CHANGE');
        warn('========================================');
        console.log('');

        if (options.json) {
          formatJSON(response.data);
        } else {
          displayChangeImpactResult(response.data);
        }

        info('\nNote: This is a simulation. No changes have been made.');
      } catch (err) {
        handleError(err);
      }
    });

  // Agent info command
  changeImpact
    .command('agent')
    .description('Show Change Impact Agent registration info')
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
        }>('/api/v1/governance/change-impact/agent');

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

  return changeImpact;
}

// Types

interface ChangeImpactResponseData {
  event_id: string;
  agent_id: string;
  agent_version: string;
  timestamp: string;
  organization_id: string;
  assessment: {
    id: string;
    change_request_id: string;
    impact_level: string;
    risk_score: number;
    risk_classification: string;
    summary: string;
    impacts: Array<{
      area: string;
      level: string;
      description: string;
      affected_entities: string[];
      metrics?: Record<string, number>;
    }>;
    affected_systems: Array<{
      system_id: string;
      system_name: string;
      system_type: string;
      impact_description: string;
      severity: string;
      dependencies: string[];
    }>;
    policy_implications: Array<{
      policy_id: string;
      policy_name: string;
      implication_type: string;
      description: string;
      affected_rules: string[];
      policy_remains_valid: boolean;
    }>;
    compliance_implications: Array<{
      framework: string;
      requirement_id: string;
      requirement_description: string;
      current_status: string;
      projected_status: string;
      gap_description?: string;
    }>;
    cost_implications?: {
      estimated_delta: number;
      currency: string;
      period: string;
      confidence: number;
      breakdown: Array<{
        category: string;
        current_cost: number;
        projected_cost: number;
        delta: number;
      }>;
      budget_alerts_triggered: string[];
    };
    risk_indicators: Array<{
      id: string;
      category: string;
      severity: string;
      description: string;
      evidence: string[];
      mitigation_suggestions: string[];
    }>;
    recommendations: Array<{
      id: string;
      priority: string;
      recommendation_type: string;
      recommendation: string;
      rationale: string;
      related_risks: string[];
    }>;
    historical_context?: {
      similar_changes_count: number;
      average_outcome: string;
      common_issues: string[];
      success_patterns: string[];
    };
    assessed_at: string;
  };
  confidence: {
    overall: number;
    completeness: number;
    certainty: number;
  };
  telemetry_ref: string;
}

// Helper functions

function getDefaultFromDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 90);
  return date.toISOString();
}

async function parseJsonOrFile(input: string): Promise<Record<string, unknown>> {
  // Try parsing as JSON first
  try {
    return JSON.parse(input);
  } catch {
    // Try reading as file
    const fs = await import('fs').then(m => m.promises);
    const content = await fs.readFile(input, 'utf-8');
    return JSON.parse(content);
  }
}

function displayChangeImpactResult(data: ChangeImpactResponseData): void {
  const assessment = data.assessment;

  console.log('');
  console.log('========================================');
  console.log('     CHANGE IMPACT ASSESSMENT');
  console.log('========================================');
  console.log('');

  info(`Event ID: ${data.event_id}`);
  info(`Agent: ${data.agent_id} v${data.agent_version}`);
  info(`Organization: ${data.organization_id}`);
  info(`Assessment ID: ${assessment.id}`);
  info(`Change Request: ${assessment.change_request_id}`);
  info(`Timestamp: ${assessment.assessed_at}`);
  console.log('');

  // Risk Summary
  console.log('--- Risk Assessment ---');
  const riskTable = new Table({
    colWidths: [25, 30],
  });

  const riskColor = getRiskColor(assessment.risk_classification);
  riskTable.push(
    ['Impact Level', getImpactDisplay(assessment.impact_level)],
    ['Risk Score', `${(assessment.risk_score * 100).toFixed(1)}%`],
    ['Risk Classification', riskColor(assessment.risk_classification.toUpperCase().replace('_', ' '))],
  );
  console.log(riskTable.toString());
  console.log('');

  // Summary
  console.log('--- Summary ---');
  console.log(assessment.summary);
  console.log('');

  // Impact Areas
  if (assessment.impacts.length > 0) {
    console.log('--- Impact Areas ---');
    const impactTable = new Table({
      head: ['Area', 'Level', 'Description'],
      colWidths: [20, 12, 50],
    });

    assessment.impacts.forEach((impact) => {
      impactTable.push([
        impact.area.replace('_', ' '),
        getImpactDisplay(impact.level),
        impact.description.substring(0, 47) + (impact.description.length > 47 ? '...' : ''),
      ]);
    });
    console.log(impactTable.toString());
    console.log('');
  }

  // Affected Systems
  if (assessment.affected_systems.length > 0) {
    console.log('--- Affected Downstream Systems ---');
    const systemsTable = new Table({
      head: ['System', 'Type', 'Severity', 'Impact'],
      colWidths: [25, 15, 12, 35],
    });

    assessment.affected_systems.forEach((system) => {
      systemsTable.push([
        system.system_name,
        system.system_type,
        getSeverityDisplay(system.severity),
        system.impact_description.substring(0, 32) + (system.impact_description.length > 32 ? '...' : ''),
      ]);
    });
    console.log(systemsTable.toString());
    console.log('');
  }

  // Policy Implications
  if (assessment.policy_implications.length > 0) {
    console.log('--- Policy Implications ---');
    assessment.policy_implications.forEach((impl, idx) => {
      console.log(`  ${idx + 1}. ${impl.policy_name} (${impl.policy_id})`);
      console.log(`     Type: ${impl.implication_type.replace('_', ' ')}`);
      console.log(`     ${impl.description}`);
      console.log(`     Valid after change: ${impl.policy_remains_valid ? 'Yes' : 'NO'}`);
    });
    console.log('');
  }

  // Compliance Implications
  if (assessment.compliance_implications.length > 0) {
    console.log('--- Compliance Implications ---');
    const complianceTable = new Table({
      head: ['Framework', 'Requirement', 'Current', 'Projected'],
      colWidths: [20, 15, 18, 18],
    });

    assessment.compliance_implications.forEach((impl) => {
      complianceTable.push([
        impl.framework,
        impl.requirement_id,
        getComplianceDisplay(impl.current_status),
        getComplianceDisplay(impl.projected_status),
      ]);
    });
    console.log(complianceTable.toString());
    console.log('');
  }

  // Cost Implications
  if (assessment.cost_implications) {
    const cost = assessment.cost_implications;
    console.log('--- Cost Implications ---');
    const deltaSign = cost.estimated_delta >= 0 ? '+' : '';
    info(`Estimated Delta: ${deltaSign}${cost.currency}${cost.estimated_delta.toFixed(2)}/${cost.period}`);
    info(`Confidence: ${(cost.confidence * 100).toFixed(0)}%`);

    if (cost.breakdown.length > 0) {
      const costTable = new Table({
        head: ['Category', 'Current', 'Projected', 'Delta'],
        colWidths: [20, 15, 15, 15],
      });

      cost.breakdown.forEach((item) => {
        const sign = item.delta >= 0 ? '+' : '';
        costTable.push([
          item.category,
          `$${item.current_cost.toFixed(2)}`,
          `$${item.projected_cost.toFixed(2)}`,
          `${sign}$${item.delta.toFixed(2)}`,
        ]);
      });
      console.log(costTable.toString());
    }

    if (cost.budget_alerts_triggered.length > 0) {
      warn(`Budget Alerts: ${cost.budget_alerts_triggered.join(', ')}`);
    }
    console.log('');
  }

  // Risk Indicators
  if (assessment.risk_indicators.length > 0) {
    console.log('--- Risk Indicators ---');
    assessment.risk_indicators.forEach((risk, idx) => {
      const severityDisplay = getSeverityDisplay(risk.severity);
      console.log(`  ${idx + 1}. [${severityDisplay}] ${risk.description}`);
      console.log(`     Category: ${risk.category.replace('_', ' ')}`);
      if (risk.evidence.length > 0) {
        console.log(`     Evidence: ${risk.evidence.join('; ')}`);
      }
      if (risk.mitigation_suggestions.length > 0) {
        console.log(`     Mitigations:`);
        risk.mitigation_suggestions.forEach((m) => console.log(`       - ${m}`));
      }
    });
    console.log('');
  }

  // Recommendations
  if (assessment.recommendations.length > 0) {
    console.log('--- Recommendations ---');
    assessment.recommendations.forEach((rec, idx) => {
      const priorityDisplay = getPriorityDisplay(rec.priority);
      console.log(`  ${idx + 1}. [${priorityDisplay}] ${rec.recommendation}`);
      console.log(`     Type: ${rec.recommendation_type.replace('_', ' ')}`);
      console.log(`     Rationale: ${rec.rationale}`);
    });
    console.log('');
  }

  // Historical Context
  if (assessment.historical_context) {
    const history = assessment.historical_context;
    console.log('--- Historical Context ---');
    info(`Similar Changes Found: ${history.similar_changes_count}`);
    info(`Average Outcome: ${history.average_outcome.replace('_', ' ')}`);
    if (history.common_issues.length > 0) {
      console.log(`Common Issues: ${history.common_issues.join(', ')}`);
    }
    if (history.success_patterns.length > 0) {
      console.log(`Success Patterns: ${history.success_patterns.join(', ')}`);
    }
    console.log('');
  }

  // Confidence
  console.log('--- Confidence Metrics ---');
  info(`Overall: ${(data.confidence.overall * 100).toFixed(1)}%`);
  info(`Completeness: ${(data.confidence.completeness * 100).toFixed(1)}%`);
  info(`Certainty: ${(data.confidence.certainty * 100).toFixed(1)}%`);
  console.log('');

  // References
  console.log('--- References ---');
  info(`Telemetry: ${data.telemetry_ref}`);
  console.log('');
}

function displayChangeImpactHistory(assessments: Array<{
  id: string;
  change_request_id: string;
  subject_type: string;
  impact_level: string;
  risk_classification: string;
  risk_score: number;
  assessed_at: string;
}>): void {
  if (assessments.length === 0) {
    info('No change impact assessments found.');
    return;
  }

  console.log('');
  const table = new Table({
    head: ['Assessment ID', 'Subject Type', 'Impact', 'Risk', 'Score', 'Date'],
    colWidths: [20, 15, 12, 15, 10, 25],
  });

  assessments.forEach((assessment) => {
    table.push([
      assessment.id.substring(0, 17) + '...',
      assessment.subject_type,
      getImpactDisplay(assessment.impact_level),
      assessment.risk_classification.replace('_', ' '),
      `${(assessment.risk_score * 100).toFixed(0)}%`,
      new Date(assessment.assessed_at).toLocaleString(),
    ]);
  });

  console.log(table.toString());
  console.log('');
  info(`Total: ${assessments.length} assessment(s)`);
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
  console.log('     CHANGE IMPACT AGENT');
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

// Display helpers

function getImpactDisplay(level: string): string {
  switch (level.toLowerCase()) {
    case 'none': return 'NONE';
    case 'minimal': return 'MINIMAL';
    case 'low': return 'LOW';
    case 'moderate': return 'MODERATE';
    case 'high': return 'HIGH';
    case 'critical': return 'CRITICAL';
    default: return level.toUpperCase();
  }
}

function getSeverityDisplay(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'info': return 'INFO';
    case 'low': return 'LOW';
    case 'medium': return 'MEDIUM';
    case 'high': return 'HIGH';
    case 'critical': return 'CRITICAL';
    default: return severity.toUpperCase();
  }
}

function getComplianceDisplay(status: string): string {
  switch (status.toLowerCase()) {
    case 'compliant': return 'COMPLIANT';
    case 'partially_compliant': return 'PARTIAL';
    case 'non_compliant': return 'NON-COMPLIANT';
    case 'not_applicable': return 'N/A';
    case 'requires_review': return 'REVIEW NEEDED';
    default: return status.toUpperCase();
  }
}

function getPriorityDisplay(priority: string): string {
  switch (priority.toLowerCase()) {
    case 'low': return 'LOW';
    case 'medium': return 'MEDIUM';
    case 'high': return 'HIGH';
    case 'critical': return 'CRITICAL';
    default: return priority.toUpperCase();
  }
}

function getRiskColor(classification: string): (text: string) => string {
  // In a real implementation, this would use chalk or similar for colors
  // For now, just return identity function
  return (text: string) => text;
}
