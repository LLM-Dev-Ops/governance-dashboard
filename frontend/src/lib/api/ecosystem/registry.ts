/**
 * Registry Consumer Adapter
 *
 * Consumes model metadata, versioning information, and registry states
 * from the LLM-Registry upstream service.
 */

import type { UpstreamConfig } from './types';

/** Model status in the registry */
export type ModelStatus = 'active' | 'deprecated' | 'preview' | 'retired';

/** Registry health status */
export type RegistryHealth = 'healthy' | 'degraded' | 'unavailable';

/** Model parameters specification */
export interface ModelParameters {
  context_window: number;
  max_output_tokens: number;
  supports_streaming: boolean;
  supports_functions: boolean;
  supports_vision: boolean;
  input_modalities: string[];
  output_modalities: string[];
}

/** Model metadata from the registry */
export interface ModelMetadata {
  model_id: string;
  model_name: string;
  provider: string;
  version: string;
  description?: string;
  capabilities: string[];
  parameters: ModelParameters;
  created_at: string;
  updated_at: string;
  status: ModelStatus;
  tags: Record<string, string>;
}

/** Model version information */
export interface ModelVersion {
  version_id: string;
  version_number: string;
  model_id: string;
  release_date: string;
  changelog?: string;
  is_latest: boolean;
  is_stable: boolean;
  deprecation_date?: string;
}

/** Registry state summary */
export interface RegistryState {
  total_models: number;
  active_models: number;
  deprecated_models: number;
  total_providers: number;
  last_sync: string;
  health_status: RegistryHealth;
}

/** Create a Registry consumer adapter */
export function createRegistryConsumer(config: UpstreamConfig) {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const fetchJson = async <T>(url: string): Promise<T> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs || 30000);

    try {
      const response = await fetch(url, {
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Registry returned status: ${response.status}`);
      }

      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  };

  return {
    /** Service identifier */
    serviceName: 'LLM-Registry' as const,

    /** Check service health */
    async healthCheck(): Promise<boolean> {
      try {
        const response = await fetch(`${baseUrl}/health`);
        return response.ok;
      } catch {
        return false;
      }
    },

    /** Consume model metadata for a specific model */
    async getModelMetadata(modelId: string): Promise<ModelMetadata> {
      const url = `${baseUrl}/api/v1/models/${modelId}`;
      return fetchJson<ModelMetadata>(url);
    },

    /** Consume all models with optional filters */
    async listModels(
      provider?: string,
      status?: ModelStatus
    ): Promise<ModelMetadata[]> {
      const params = new URLSearchParams();
      if (provider) params.set('provider', provider);
      if (status) params.set('status', status);

      const queryString = params.toString();
      const url = `${baseUrl}/api/v1/models${queryString ? `?${queryString}` : ''}`;
      return fetchJson<ModelMetadata[]>(url);
    },

    /** Consume version history for a model */
    async getModelVersions(modelId: string): Promise<ModelVersion[]> {
      const url = `${baseUrl}/api/v1/models/${modelId}/versions`;
      return fetchJson<ModelVersion[]>(url);
    },

    /** Consume registry state summary */
    async getRegistryState(): Promise<RegistryState> {
      const url = `${baseUrl}/api/v1/registry/state`;
      return fetchJson<RegistryState>(url);
    },
  };
}

/** Registry consumer type */
export type RegistryConsumer = ReturnType<typeof createRegistryConsumer>;
