// User & Authentication Types
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
  requires_mfa?: boolean;
  session_id?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  department?: string;
}

export interface MFASetupResponse {
  secret: string;
  qr_code: string;
  backup_codes: string[];
}

export interface MFAVerifyRequest {
  code: string;
  session_id?: string;
}

// Policy Types
export interface Policy {
  id: string;
  name: string;
  description: string;
  rules: PolicyRule[];
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  applies_to: string[];
}

export interface PolicyRule {
  id: string;
  type: RuleType;
  condition: string;
  action: RuleAction;
  parameters: Record<string, any>;
}

export enum RuleType {
  COST_LIMIT = 'cost_limit',
  RATE_LIMIT = 'rate_limit',
  CONTENT_FILTER = 'content_filter',
  MODEL_RESTRICTION = 'model_restriction',
  APPROVAL_REQUIRED = 'approval_required',
}

export enum RuleAction {
  BLOCK = 'block',
  WARN = 'warn',
  LOG = 'log',
  REQUIRE_APPROVAL = 'require_approval',
}

export interface PolicyViolation {
  id: string;
  policy_id: string;
  policy_name: string;
  user_id: string;
  user_email: string;
  rule_id: string;
  violation_type: string;
  severity: ViolationSeverity;
  details: Record<string, any>;
  timestamp: string;
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
}

export enum ViolationSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// LLM Usage Types
export interface LLMUsage {
  id: string;
  user_id: string;
  user_email: string;
  model: string;
  provider: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost: number;
  latency_ms: number;
  timestamp: string;
  request_id: string;
  metadata?: Record<string, any>;
}

export interface UsageStats {
  total_requests: number;
  total_tokens: number;
  total_cost: number;
  average_latency: number;
  unique_users: number;
  by_model: Record<string, ModelStats>;
  by_user: Record<string, UserStats>;
  time_range: {
    start: string;
    end: string;
  };
}

export interface ModelStats {
  model: string;
  provider: string;
  requests: number;
  tokens: number;
  cost: number;
  average_latency: number;
}

export interface UserStats {
  user_id: string;
  user_email: string;
  requests: number;
  tokens: number;
  cost: number;
}

// Audit Types
export interface AuditLog {
  id: string;
  user_id: string;
  user_email: string;
  action: AuditAction;
  resource_type: string;
  resource_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  status: AuditStatus;
}

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',
  EXPORT = 'export',
  LOGIN = 'login',
  LOGOUT = 'logout',
  APPROVE = 'approve',
  REJECT = 'reject',
}

export enum AuditStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PENDING = 'pending',
}

// Organization & Multi-Tenancy Types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  settings: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  joined_at: string;
}

export enum OrganizationRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

export interface Team {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

// LLM Provider Types
export interface LLMProvider {
  id: string;
  organization_id: string;
  provider_name: 'openai' | 'anthropic' | 'azure_openai' | 'cohere' | 'huggingface' | 'custom';
  display_name: string;
  api_key_encrypted?: string;
  endpoint_url?: string;
  configuration: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LLMModel {
  id: string;
  provider_id: string;
  model_name: string;
  display_name: string;
  cost_per_1k_prompt_tokens: number;
  cost_per_1k_completion_tokens: number;
  max_tokens?: number;
  context_window?: number;
  capabilities: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LLMRequest {
  id: string;
  organization_id: string;
  team_id?: string;
  user_id: string;
  model_id: string;
  request_id?: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  prompt_cost: number;
  completion_cost: number;
  total_cost: number;
  latency_ms?: number;
  status: 'success' | 'error' | 'rate_limited' | 'timeout';
  error_message?: string;
  metadata: Record<string, any>;
  timestamp: string;
}

// Cost Types
export interface CostBreakdown {
  total_cost: number;
  currency: string;
  period: {
    start: string;
    end: string;
  };
  by_model: Record<string, number>;
  by_user: Record<string, number>;
  by_department?: Record<string, number>;
  daily_costs: DailyCost[];
}

export interface DailyCost {
  date: string;
  cost: number;
  requests: number;
  tokens: number;
}

export interface Budget {
  id: string;
  organization_id: string;
  team_id?: string;
  user_id?: string;
  name: string;
  amount: number;
  period: BudgetPeriod;
  alert_threshold_percentage: number;
  hard_limit: boolean;
  current_spend: number;
  period_start: string;
  period_end: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export enum BudgetPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export interface Quota {
  id: string;
  organization_id: string;
  team_id?: string;
  user_id?: string;
  quota_type: QuotaType;
  limit_value: number;
  current_value: number;
  window_start: string;
  window_end: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export enum QuotaType {
  REQUESTS_PER_MINUTE = 'requests_per_minute',
  REQUESTS_PER_HOUR = 'requests_per_hour',
  REQUESTS_PER_DAY = 'requests_per_day',
  TOKENS_PER_MINUTE = 'tokens_per_minute',
  TOKENS_PER_HOUR = 'tokens_per_hour',
  TOKENS_PER_DAY = 'tokens_per_day',
  COST_PER_HOUR = 'cost_per_hour',
  COST_PER_DAY = 'cost_per_day',
}

export interface CostTag {
  id: string;
  organization_id: string;
  key: string;
  value: string;
  description?: string;
  created_at: string;
}

// Dashboard Types
export interface DashboardMetrics {
  total_requests_24h: number;
  total_cost_24h: number;
  active_users_24h: number;
  policy_violations_24h: number;
  average_latency_24h: number;
  cost_trend_7d: number[];
  requests_trend_7d: number[];
  top_models: TopModel[];
  recent_violations: PolicyViolation[];
  budget_alerts: BudgetAlert[];
}

export interface TopModel {
  model: string;
  provider: string;
  requests: number;
  cost: number;
  percentage: number;
}

export interface BudgetAlert {
  budget_id: string;
  budget_name: string;
  amount: number;
  current_spend: number;
  percentage_used: number;
  severity: AlertSeverity;
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiError {
  detail: string;
  status_code: number;
  error_code?: string;
}

// Filter & Query Types
export interface DateRange {
  start: string;
  end: string;
}

export interface UsageFilters {
  user_id?: string;
  model?: string;
  provider?: string;
  date_range?: DateRange;
  min_cost?: number;
  max_cost?: number;
}

export interface AuditFilters {
  user_id?: string;
  action?: AuditAction;
  resource_type?: string;
  date_range?: DateRange;
  status?: AuditStatus;
}

export interface PolicyFilters {
  is_active?: boolean;
  created_by?: string;
  rule_type?: RuleType;
}

// ============================================================================
// Governance Audit Agent Types (agentics-contracts compliant)
// ============================================================================

/**
 * DecisionEvent - Core schema for all agent decisions
 * Persisted to ruvector-service for audit trail
 *
 * Classification: GOVERNANCE / AUDIT / OVERSIGHT
 */
export interface DecisionEvent {
  /** Unique identifier for this decision event */
  id: string;
  /** Agent identifier (e.g., "governance-audit-agent") */
  agent_id: string;
  /** Semantic version of the agent (e.g., "1.0.0") */
  agent_version: string;
  /** Type of decision made */
  decision_type: GovernanceDecisionType;
  /** SHA-256 hash of inputs for reproducibility verification */
  inputs_hash: string;
  /** Structured output of the decision */
  outputs: DecisionOutputs;
  /** Confidence metrics for the decision */
  confidence: DecisionConfidence;
  /** Constraints/policies applied during decision */
  constraints_applied: ConstraintApplication[];
  /** Reference to execution context */
  execution_ref: ExecutionReference;
  /** UTC timestamp of decision */
  timestamp: string;
  /** Organization context */
  organization_id: string;
  /** Optional correlation ID for tracing across systems */
  correlation_id?: string;
}

/**
 * Types of governance decisions
 */
export enum GovernanceDecisionType {
  /** Summary of audit findings across systems */
  AUDIT_SUMMARY = 'audit_summary',
  /** Current compliance status assessment */
  COMPLIANCE_STATUS = 'compliance_status',
  /** Point-in-time governance state capture */
  GOVERNANCE_SNAPSHOT = 'governance_snapshot',
  /** Policy adherence analysis */
  POLICY_ADHERENCE = 'policy_adherence',
  /** Approval trail analysis */
  APPROVAL_TRAIL = 'approval_trail',
  /** Change impact assessment */
  CHANGE_IMPACT = 'change_impact',
  /** Risk indicator aggregation */
  RISK_AGGREGATION = 'risk_aggregation',
}

/**
 * Structured outputs from governance decisions
 */
export interface DecisionOutputs {
  /** Human-readable summary */
  summary: string;
  /** Detailed findings */
  findings: GovernanceFinding[];
  /** Aggregated metrics */
  metrics: GovernanceMetrics;
  /** Recommendations (read-only, informational) */
  recommendations: string[];
  /** Raw data references (not the data itself) */
  data_refs: DataReference[];
}

/**
 * Individual governance finding
 */
export interface GovernanceFinding {
  id: string;
  category: FindingCategory;
  severity: GovernanceSeverity;
  title: string;
  description: string;
  affected_resources: string[];
  evidence_refs: string[];
  first_detected: string;
  last_seen: string;
}

export enum FindingCategory {
  POLICY_VIOLATION = 'policy_violation',
  APPROVAL_GAP = 'approval_gap',
  CONFIGURATION_DRIFT = 'configuration_drift',
  ACCESS_ANOMALY = 'access_anomaly',
  COMPLIANCE_DEVIATION = 'compliance_deviation',
  AUDIT_GAP = 'audit_gap',
  COST_ANOMALY = 'cost_anomaly',
}

export enum GovernanceSeverity {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Aggregated governance metrics
 */
export interface GovernanceMetrics {
  /** Total events analyzed */
  events_analyzed: number;
  /** Time range of analysis */
  time_range: DateRange;
  /** Coverage percentage (0-100) */
  coverage_percentage: number;
  /** Policies evaluated */
  policies_evaluated: number;
  /** Compliance rate (0-100) */
  compliance_rate: number;
  /** Open findings count by severity */
  findings_by_severity: Record<GovernanceSeverity, number>;
  /** Trend direction */
  trend: TrendDirection;
}

export enum TrendDirection {
  IMPROVING = 'improving',
  STABLE = 'stable',
  DEGRADING = 'degrading',
  UNKNOWN = 'unknown',
}

/**
 * Reference to source data (never stores actual data)
 */
export interface DataReference {
  /** Type of referenced data */
  ref_type: DataReferenceType;
  /** Source system identifier */
  source_system: string;
  /** Reference ID in source system */
  ref_id: string;
  /** Timestamp of referenced data */
  ref_timestamp: string;
}

export enum DataReferenceType {
  DECISION_EVENT = 'decision_event',
  POLICY_EVALUATION = 'policy_evaluation',
  INCIDENT = 'incident',
  APPROVAL = 'approval',
  COST_RECORD = 'cost_record',
  TELEMETRY = 'telemetry',
}

/**
 * Confidence metrics for decision assessment
 */
export interface DecisionConfidence {
  /** Overall confidence score (0.0-1.0) */
  overall: number;
  /** Data completeness (0.0-1.0) */
  completeness: number;
  /** Assessment certainty (0.0-1.0) */
  certainty: number;
  /** Confidence bands for different aspects */
  bands: ConfidenceBand[];
  /** Factors affecting confidence */
  factors: ConfidenceFactor[];
}

export interface ConfidenceBand {
  aspect: string;
  lower: number;
  upper: number;
  median: number;
}

export interface ConfidenceFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  description: string;
}

/**
 * Constraints applied during decision-making
 */
export interface ConstraintApplication {
  /** Constraint/policy identifier */
  constraint_id: string;
  /** Human-readable name */
  constraint_name: string;
  /** Type of constraint */
  constraint_type: ConstraintType;
  /** Scope of application */
  scope: ConstraintScope;
  /** Whether constraint was satisfied */
  satisfied: boolean;
  /** Details of application */
  details: string;
}

export enum ConstraintType {
  POLICY_RULE = 'policy_rule',
  COMPLIANCE_REQUIREMENT = 'compliance_requirement',
  ORGANIZATIONAL_BOUNDARY = 'organizational_boundary',
  DATA_RETENTION = 'data_retention',
  ACCESS_CONTROL = 'access_control',
}

export interface ConstraintScope {
  /** Organizations in scope */
  organizations: string[];
  /** Teams in scope */
  teams: string[];
  /** Resource types in scope */
  resource_types: string[];
  /** Time range in scope */
  time_range?: DateRange;
}

/**
 * Reference to execution context
 */
export interface ExecutionReference {
  /** Unique execution ID */
  execution_id: string;
  /** Request ID (for HTTP requests) */
  request_id?: string;
  /** Trace ID (for distributed tracing) */
  trace_id?: string;
  /** Span ID */
  span_id?: string;
  /** Invocation source */
  source: InvocationSource;
  /** Invoker identity */
  invoker?: string;
}

export enum InvocationSource {
  CLI = 'cli',
  API = 'api',
  SCHEDULED = 'scheduled',
  WEBHOOK = 'webhook',
  INTERNAL = 'internal',
}

// ============================================================================
// Governance Audit Agent Input/Output Contracts
// ============================================================================

/**
 * Input for Governance Audit Agent
 */
export interface GovernanceAuditInput {
  /** Organization to audit */
  organization_id: string;
  /** Type of audit to perform */
  audit_type: GovernanceDecisionType;
  /** Time range for audit */
  time_range: DateRange;
  /** Specific scope constraints */
  scope?: AuditScope;
  /** Include detailed findings */
  include_details?: boolean;
  /** Comparison baseline (for trend analysis) */
  baseline_ref?: string;
}

export interface AuditScope {
  /** Specific teams to include (empty = all) */
  teams?: string[];
  /** Specific users to include (empty = all) */
  users?: string[];
  /** Policy types to evaluate */
  policy_types?: RuleType[];
  /** Resource types to include */
  resource_types?: string[];
}

/**
 * Output from Governance Audit Agent
 */
export interface GovernanceAuditOutput {
  /** The decision event (persisted to ruvector-service) */
  decision_event: DecisionEvent;
  /** Audit-ready artifact */
  artifact: AuditArtifact;
  /** Telemetry emitted to LLM-Observatory */
  telemetry_ref: string;
}

/**
 * Audit-ready artifact for compliance systems
 */
export interface AuditArtifact {
  /** Artifact identifier */
  id: string;
  /** Artifact type */
  type: AuditArtifactType;
  /** Generation timestamp */
  generated_at: string;
  /** Artifact format */
  format: ArtifactFormat;
  /** Cryptographic hash of content */
  content_hash: string;
  /** Signature (if signed) */
  signature?: string;
  /** Expiration (if applicable) */
  expires_at?: string;
}

export enum AuditArtifactType {
  SUMMARY_REPORT = 'summary_report',
  COMPLIANCE_CERTIFICATE = 'compliance_certificate',
  FINDING_DETAIL = 'finding_detail',
  TREND_ANALYSIS = 'trend_analysis',
  APPROVAL_TRAIL = 'approval_trail',
}

export enum ArtifactFormat {
  JSON = 'json',
  PDF = 'pdf',
  CSV = 'csv',
  HTML = 'html',
}

// ============================================================================
// Governance Audit Agent CLI Contract
// ============================================================================

/**
 * CLI invocation shape for Governance Audit Agent
 */
export interface GovernanceAuditCLIArgs {
  /** Subcommand */
  command: 'audit' | 'inspect' | 'summarize';
  /** Organization ID */
  org: string;
  /** Audit type */
  type?: GovernanceDecisionType;
  /** Start date (ISO 8601) */
  from?: string;
  /** End date (ISO 8601) */
  to?: string;
  /** Output format */
  format?: 'json' | 'table' | 'yaml';
  /** Include detailed findings */
  detailed?: boolean;
  /** Output file path */
  output?: string;
  /** Quiet mode (only errors) */
  quiet?: boolean;
}

// ============================================================================
// ruvector-service Client Types
// ============================================================================

/**
 * Configuration for ruvector-service client
 */
export interface RuVectorClientConfig {
  /** Base URL of ruvector-service */
  base_url: string;
  /** API key for authentication */
  api_key?: string;
  /** Timeout in milliseconds */
  timeout_ms: number;
  /** Retry configuration */
  retry: RetryConfig;
}

export interface RetryConfig {
  max_retries: number;
  initial_delay_ms: number;
  max_delay_ms: number;
  backoff_multiplier: number;
}

/**
 * Request to persist DecisionEvent
 */
export interface PersistDecisionRequest {
  event: DecisionEvent;
  /** Idempotency key */
  idempotency_key: string;
  /** TTL in days (for data retention) */
  ttl_days?: number;
}

/**
 * Response from persist operation
 */
export interface PersistDecisionResponse {
  success: boolean;
  event_id: string;
  persisted_at: string;
  storage_ref: string;
}

/**
 * Query for retrieving DecisionEvents
 */
export interface DecisionEventQuery {
  organization_id: string;
  agent_id?: string;
  decision_type?: GovernanceDecisionType;
  time_range?: DateRange;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Agent Registration Metadata
// ============================================================================

/**
 * Agent registration for agentics-contracts
 */
export interface AgentRegistration {
  /** Agent identifier */
  agent_id: string;
  /** Agent display name */
  name: string;
  /** Agent description */
  description: string;
  /** Agent version */
  version: string;
  /** Agent classification */
  classification: AgentClassification;
  /** Input schema reference */
  input_schema: string;
  /** Output schema reference */
  output_schema: string;
  /** Supported decision types */
  decision_types: GovernanceDecisionType[];
  /** CLI endpoint */
  cli_endpoint: string;
  /** API endpoint */
  api_endpoint: string;
  /** Capabilities */
  capabilities: string[];
  /** Non-responsibilities (explicit boundaries) */
  non_responsibilities: string[];
}

export enum AgentClassification {
  GOVERNANCE = 'governance',
  AUDIT = 'audit',
  OVERSIGHT = 'oversight',
  COMPLIANCE_VISIBILITY = 'compliance_visibility',
}

/**
 * Governance Audit Agent registration constant
 */
export const GOVERNANCE_AUDIT_AGENT_REGISTRATION: AgentRegistration = {
  agent_id: 'governance-audit-agent',
  name: 'Governance Audit Agent',
  description: 'Generate authoritative audit summaries across workflows, incidents, approvals, and decisions',
  version: '1.0.0',
  classification: AgentClassification.AUDIT,
  input_schema: 'GovernanceAuditInput',
  output_schema: 'GovernanceAuditOutput',
  decision_types: [
    GovernanceDecisionType.AUDIT_SUMMARY,
    GovernanceDecisionType.COMPLIANCE_STATUS,
    GovernanceDecisionType.GOVERNANCE_SNAPSHOT,
    GovernanceDecisionType.POLICY_ADHERENCE,
    GovernanceDecisionType.APPROVAL_TRAIL,
  ],
  cli_endpoint: 'llm-gov audit',
  api_endpoint: '/api/v1/governance/audit',
  capabilities: [
    'aggregate_decision_events',
    'analyze_policy_adherence',
    'trace_approval_trails',
    'compute_governance_coverage',
    'produce_audit_artifacts',
    'surface_change_history',
    'provide_oversight_signals',
  ],
  non_responsibilities: [
    'intercept_execution',
    'trigger_retries_or_workflows',
    'enforce_policies',
    'modify_configurations',
    'emit_anomaly_detections',
    'apply_optimizations',
    'execute_sql_directly',
    'connect_to_google_sql_directly',
  ],
};

// ============================================================================
// Change Impact Agent Types (agentics-contracts compliant)
// ============================================================================

/**
 * Change Impact Agent - Classification: GOVERNANCE ANALYSIS
 *
 * Purpose: Assess downstream governance and compliance impact of configuration
 * or policy changes.
 *
 * Scope:
 * - Analyze historical changes
 * - Evaluate affected systems and policies
 * - Surface governance risk indicators
 *
 * decision_type: "change_impact_assessment"
 */

/**
 * Input for Change Impact Agent
 */
export interface ChangeImpactInput {
  /** Organization to analyze */
  organization_id: string;
  /** Change request or configuration change to assess */
  change_request: ChangeRequest;
  /** Analysis scope constraints */
  scope?: ChangeImpactScope;
  /** Time range for historical analysis */
  historical_range?: DateRange;
  /** Include detailed downstream impact analysis */
  include_downstream?: boolean;
  /** Include risk projection */
  include_risk_projection?: boolean;
  /** Baseline comparison reference */
  baseline_ref?: string;
}

/**
 * Describes the change being assessed
 */
export interface ChangeRequest {
  /** Unique identifier for the change */
  change_id: string;
  /** Type of change being made */
  change_type: ChangeType;
  /** Subject of the change (policy, config, model, etc.) */
  subject_type: ChangeSubjectType;
  /** ID of the subject being changed */
  subject_id: string;
  /** Human-readable description of the change */
  description: string;
  /** Timestamp when change was proposed/made */
  timestamp: string;
  /** User or system that initiated the change */
  initiator: string;
  /** Previous state (if available) */
  previous_state?: Record<string, any>;
  /** Proposed/new state */
  new_state?: Record<string, any>;
  /** Change metadata */
  metadata?: Record<string, any>;
}

/**
 * Type of change being assessed
 */
export enum ChangeType {
  /** New resource creation */
  CREATE = 'create',
  /** Modification of existing resource */
  UPDATE = 'update',
  /** Resource deletion */
  DELETE = 'delete',
  /** Enable/disable toggle */
  TOGGLE = 'toggle',
  /** Configuration parameter change */
  CONFIGURE = 'configure',
  /** Policy rule modification */
  POLICY_MODIFY = 'policy_modify',
  /** Access control change */
  ACCESS_CHANGE = 'access_change',
  /** Model version change */
  MODEL_VERSION = 'model_version',
  /** Cost/budget adjustment */
  BUDGET_ADJUST = 'budget_adjust',
  /** Quota modification */
  QUOTA_MODIFY = 'quota_modify',
}

/**
 * Subject type being changed
 */
export enum ChangeSubjectType {
  POLICY = 'policy',
  POLICY_RULE = 'policy_rule',
  CONFIGURATION = 'configuration',
  LLM_MODEL = 'llm_model',
  LLM_PROVIDER = 'llm_provider',
  BUDGET = 'budget',
  QUOTA = 'quota',
  ACCESS_CONTROL = 'access_control',
  TEAM = 'team',
  USER = 'user',
  ORGANIZATION = 'organization',
  INTEGRATION = 'integration',
  WEBHOOK = 'webhook',
}

/**
 * Scope constraints for change impact analysis
 */
export interface ChangeImpactScope {
  /** Teams to include in analysis (empty = all) */
  teams?: string[];
  /** Users to include (empty = all) */
  users?: string[];
  /** Policy types to evaluate */
  policy_types?: RuleType[];
  /** Resource types to consider */
  resource_types?: ChangeSubjectType[];
  /** Depth of downstream analysis (1-5, default 3) */
  analysis_depth?: number;
  /** Include cost impact */
  include_cost_impact?: boolean;
  /** Include compliance impact */
  include_compliance_impact?: boolean;
}

/**
 * Output from Change Impact Agent
 */
export interface ChangeImpactOutput {
  /** The decision event (persisted to ruvector-service) */
  decision_event: DecisionEvent;
  /** Detailed impact assessment */
  assessment: ChangeImpactAssessment;
  /** Telemetry reference for LLM-Observatory */
  telemetry_ref: string;
}

/**
 * Comprehensive change impact assessment
 */
export interface ChangeImpactAssessment {
  /** Assessment identifier */
  id: string;
  /** Change request that was assessed */
  change_request_id: string;
  /** Overall impact level */
  impact_level: ImpactLevel;
  /** Overall risk score (0.0-1.0) */
  risk_score: number;
  /** Risk classification */
  risk_classification: RiskClassification;
  /** Summary of impact assessment */
  summary: string;
  /** Detailed impact breakdown */
  impacts: ImpactDetail[];
  /** Affected downstream systems */
  affected_systems: AffectedSystem[];
  /** Policy implications */
  policy_implications: PolicyImplication[];
  /** Compliance implications */
  compliance_implications: ComplianceImplication[];
  /** Cost implications (if analyzed) */
  cost_implications?: CostImplication;
  /** Risk indicators surfaced */
  risk_indicators: RiskIndicator[];
  /** Recommendations (read-only, informational) */
  recommendations: ImpactRecommendation[];
  /** Historical context from similar changes */
  historical_context?: HistoricalContext;
  /** Assessment timestamp */
  assessed_at: string;
}

/**
 * Impact severity level
 */
export enum ImpactLevel {
  NONE = 'none',
  MINIMAL = 'minimal',
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Risk classification
 */
export enum RiskClassification {
  /** Acceptable risk, proceed with change */
  ACCEPTABLE = 'acceptable',
  /** Low risk, standard review recommended */
  LOW_RISK = 'low_risk',
  /** Medium risk, enhanced review required */
  MEDIUM_RISK = 'medium_risk',
  /** High risk, approval chain required */
  HIGH_RISK = 'high_risk',
  /** Critical risk, executive approval required */
  CRITICAL_RISK = 'critical_risk',
  /** Unacceptable risk, change should be blocked */
  UNACCEPTABLE = 'unacceptable',
}

/**
 * Detailed impact for a specific area
 */
export interface ImpactDetail {
  /** Impact area */
  area: ImpactArea;
  /** Impact level for this area */
  level: ImpactLevel;
  /** Description of impact */
  description: string;
  /** Affected entities in this area */
  affected_entities: string[];
  /** Quantified metrics (if available) */
  metrics?: Record<string, number>;
}

/**
 * Areas that can be impacted
 */
export enum ImpactArea {
  POLICY_ENFORCEMENT = 'policy_enforcement',
  COMPLIANCE = 'compliance',
  COST = 'cost',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  AVAILABILITY = 'availability',
  USER_EXPERIENCE = 'user_experience',
  DATA_GOVERNANCE = 'data_governance',
  AUDIT_TRAIL = 'audit_trail',
  ACCESS_CONTROL = 'access_control',
  RATE_LIMITING = 'rate_limiting',
  MODEL_BEHAVIOR = 'model_behavior',
}

/**
 * Affected downstream system
 */
export interface AffectedSystem {
  /** System identifier */
  system_id: string;
  /** System name */
  system_name: string;
  /** Type of system */
  system_type: string;
  /** How the system is affected */
  impact_description: string;
  /** Severity of impact on this system */
  severity: GovernanceSeverity;
  /** Dependencies on the changed resource */
  dependencies: string[];
}

/**
 * Policy implication from change
 */
export interface PolicyImplication {
  /** Policy ID affected */
  policy_id: string;
  /** Policy name */
  policy_name: string;
  /** Type of implication */
  implication_type: PolicyImplicationType;
  /** Description of implication */
  description: string;
  /** Rules affected within the policy */
  affected_rules: string[];
  /** Whether policy will remain valid */
  policy_remains_valid: boolean;
}

/**
 * Types of policy implications
 */
export enum PolicyImplicationType {
  /** Policy may become ineffective */
  EFFECTIVENESS_REDUCED = 'effectiveness_reduced',
  /** Policy rules will be violated */
  RULES_VIOLATED = 'rules_violated',
  /** Policy scope changes */
  SCOPE_CHANGED = 'scope_changed',
  /** Policy becomes redundant */
  REDUNDANCY_CREATED = 'redundancy_created',
  /** Policy conflict introduced */
  CONFLICT_INTRODUCED = 'conflict_introduced',
  /** Policy coverage gap */
  COVERAGE_GAP = 'coverage_gap',
  /** No significant impact */
  NO_IMPACT = 'no_impact',
}

/**
 * Compliance implication from change
 */
export interface ComplianceImplication {
  /** Compliance framework affected */
  framework: string;
  /** Requirement ID */
  requirement_id: string;
  /** Requirement description */
  requirement_description: string;
  /** Current compliance status */
  current_status: ComplianceImpactStatus;
  /** Projected status after change */
  projected_status: ComplianceImpactStatus;
  /** Gap description if applicable */
  gap_description?: string;
}

/**
 * Compliance status for impact assessment
 */
export enum ComplianceImpactStatus {
  COMPLIANT = 'compliant',
  PARTIALLY_COMPLIANT = 'partially_compliant',
  NON_COMPLIANT = 'non_compliant',
  NOT_APPLICABLE = 'not_applicable',
  REQUIRES_REVIEW = 'requires_review',
}

/**
 * Cost implication from change
 */
export interface CostImplication {
  /** Estimated cost delta (positive = increase) */
  estimated_delta: number;
  /** Currency */
  currency: string;
  /** Time period for estimate */
  period: BudgetPeriod;
  /** Confidence in estimate (0.0-1.0) */
  confidence: number;
  /** Breakdown by category */
  breakdown: CostBreakdownItem[];
  /** Budget alerts that may trigger */
  budget_alerts_triggered: string[];
}

/**
 * Cost breakdown item
 */
export interface CostBreakdownItem {
  category: string;
  current_cost: number;
  projected_cost: number;
  delta: number;
}

/**
 * Risk indicator surfaced by analysis
 */
export interface RiskIndicator {
  /** Indicator ID */
  id: string;
  /** Indicator category */
  category: RiskIndicatorCategory;
  /** Severity */
  severity: GovernanceSeverity;
  /** Indicator description */
  description: string;
  /** Evidence supporting this indicator */
  evidence: string[];
  /** Mitigation suggestions (informational only) */
  mitigation_suggestions: string[];
}

/**
 * Risk indicator categories
 */
export enum RiskIndicatorCategory {
  SECURITY_RISK = 'security_risk',
  COMPLIANCE_RISK = 'compliance_risk',
  OPERATIONAL_RISK = 'operational_risk',
  FINANCIAL_RISK = 'financial_risk',
  REPUTATIONAL_RISK = 'reputational_risk',
  DEPENDENCY_RISK = 'dependency_risk',
  CONFIGURATION_RISK = 'configuration_risk',
  ACCESS_RISK = 'access_risk',
}

/**
 * Recommendation from impact analysis
 */
export interface ImpactRecommendation {
  /** Recommendation ID */
  id: string;
  /** Priority level */
  priority: RecommendationPriority;
  /** Recommendation type */
  type: RecommendationType;
  /** Recommendation text */
  recommendation: string;
  /** Rationale */
  rationale: string;
  /** Related risk indicators */
  related_risks: string[];
}

/**
 * Recommendation priority
 */
export enum RecommendationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Recommendation type
 */
export enum RecommendationType {
  /** Review required before proceeding */
  REVIEW_REQUIRED = 'review_required',
  /** Additional approval needed */
  APPROVAL_REQUIRED = 'approval_required',
  /** Testing recommended */
  TESTING_RECOMMENDED = 'testing_recommended',
  /** Staged rollout suggested */
  STAGED_ROLLOUT = 'staged_rollout',
  /** Documentation update needed */
  DOCUMENTATION_UPDATE = 'documentation_update',
  /** Monitoring enhancement suggested */
  MONITORING_ENHANCEMENT = 'monitoring_enhancement',
  /** Rollback plan required */
  ROLLBACK_PLAN = 'rollback_plan',
  /** Stakeholder notification suggested */
  STAKEHOLDER_NOTIFICATION = 'stakeholder_notification',
}

/**
 * Historical context from similar changes
 */
export interface HistoricalContext {
  /** Number of similar changes found */
  similar_changes_count: number;
  /** Average outcome of similar changes */
  average_outcome: HistoricalOutcome;
  /** Common issues encountered */
  common_issues: string[];
  /** Success patterns observed */
  success_patterns: string[];
  /** References to similar past changes */
  change_refs: DataReference[];
}

/**
 * Historical outcome classification
 */
export enum HistoricalOutcome {
  SUCCESSFUL = 'successful',
  PARTIALLY_SUCCESSFUL = 'partially_successful',
  REQUIRED_ROLLBACK = 'required_rollback',
  CAUSED_INCIDENT = 'caused_incident',
  INSUFFICIENT_DATA = 'insufficient_data',
}

/**
 * CLI invocation shape for Change Impact Agent
 */
export interface ChangeImpactCLIArgs {
  /** Subcommand */
  command: 'assess' | 'compare' | 'history' | 'simulate';
  /** Organization ID */
  org: string;
  /** Change ID or path to change definition */
  change?: string;
  /** Subject type */
  subject?: ChangeSubjectType;
  /** Subject ID */
  subjectId?: string;
  /** Historical analysis start date */
  from?: string;
  /** Historical analysis end date */
  to?: string;
  /** Analysis depth (1-5) */
  depth?: number;
  /** Include cost analysis */
  cost?: boolean;
  /** Include compliance analysis */
  compliance?: boolean;
  /** Output format */
  format?: 'json' | 'table' | 'yaml' | 'summary';
  /** Output file path */
  output?: string;
  /** Quiet mode */
  quiet?: boolean;
}

/**
 * Change Impact Agent registration constant
 */
export const CHANGE_IMPACT_AGENT_REGISTRATION: AgentRegistration = {
  agent_id: 'change-impact-agent',
  name: 'Change Impact Agent',
  description: 'Assess downstream governance and compliance impact of configuration or policy changes',
  version: '1.0.0',
  classification: AgentClassification.GOVERNANCE,
  input_schema: 'ChangeImpactInput',
  output_schema: 'ChangeImpactOutput',
  decision_types: [
    GovernanceDecisionType.CHANGE_IMPACT,
    GovernanceDecisionType.RISK_AGGREGATION,
  ],
  cli_endpoint: 'llm-gov change-impact',
  api_endpoint: '/api/v1/governance/change-impact',
  capabilities: [
    'analyze_historical_changes',
    'evaluate_affected_systems',
    'surface_risk_indicators',
    'assess_policy_implications',
    'assess_compliance_implications',
    'estimate_cost_impact',
    'provide_historical_context',
    'generate_recommendations',
  ],
  non_responsibilities: [
    'intercept_execution',
    'trigger_retries_or_workflows',
    'enforce_policies',
    'modify_configurations',
    'emit_anomaly_detections',
    'apply_optimizations',
    'execute_sql_directly',
    'connect_to_google_sql_directly',
    'block_or_approve_changes',
    'execute_changes',
  ],
};
