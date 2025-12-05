/**
 * Common types for ecosystem consumer adapters
 */

/** Configuration for upstream service connections */
export interface UpstreamConfig {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
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
