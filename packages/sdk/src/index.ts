import { ApiClient, type ApiClientConfig } from './client';
import { AuthApi } from './auth';
import { OrganizationsApi } from './organizations';

export * from './client';
export * from './auth';
export * from './organizations';

/**
 * LLM Governance Dashboard SDK
 *
 * Provides a TypeScript/JavaScript client for interacting with the
 * LLM Governance Dashboard API.
 *
 * @example
 * ```typescript
 * import { LLMGovernanceSDK } from '@llm-dev-ops/llm-governance';
 *
 * const sdk = new LLMGovernanceSDK({
 *   baseUrl: 'https://api.example.com/v1',
 *   token: 'your-access-token'
 * });
 *
 * // Use the SDK
 * const user = await sdk.auth.getCurrentUser();
 * const orgs = await sdk.organizations.listOrganizations();
 * ```
 */
export class LLMGovernanceSDK {
  public readonly client: ApiClient;
  public readonly auth: AuthApi;
  public readonly organizations: OrganizationsApi;

  constructor(config: ApiClientConfig = {}) {
    this.client = new ApiClient(config);
    this.auth = new AuthApi(this.client);
    this.organizations = new OrganizationsApi(this.client);
  }

  /**
   * Set the authentication token
   */
  setToken(token: string | null) {
    this.client.setToken(token);
  }

  /**
   * Get the current authentication token
   */
  getToken(): string | null {
    return this.client.getToken();
  }

  /**
   * Set the base URL for API requests
   */
  setBaseUrl(baseUrl: string) {
    this.client.setBaseUrl(baseUrl);
  }

  /**
   * Get the current base URL
   */
  getBaseUrl(): string {
    return this.client.getBaseUrl();
  }
}

/**
 * Create a new SDK instance
 *
 * @param config - Configuration options
 * @returns SDK instance
 */
export function createSDK(config: ApiClientConfig = {}): LLMGovernanceSDK {
  return new LLMGovernanceSDK(config);
}

// Default export
export default LLMGovernanceSDK;
