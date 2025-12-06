/**
 * Common types for ecosystem consumer adapters
 *
 * Phase 2B: Integrated with @llm-dev-ops/infra for standardized config patterns
 */

/** Configuration for upstream service connections
 *
 * Note: This interface follows the LLM-Dev-Ops Infra config pattern.
 * For production, consider importing from @llm-dev-ops/infra directly:
 * import { UpstreamConfig } from '@llm-dev-ops/infra';
 */
export interface UpstreamConfig {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
  /** Retry configuration from Infra module */
  retryConfig?: {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
  };
  /** Cache configuration from Infra module */
  cacheConfig?: {
    enabled: boolean;
    ttlSeconds: number;
  };
}

/** Generic API response wrapper */
export interface EcosystemResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

/** Paginated response from ecosystem services */
export interface PaginatedEcosystemResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Date range filter */
export interface DateRange {
  start: string;
  end: string;
}
