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
