import { apiClient } from './client';
import type { LLMUsage, UsageStats, PaginatedResponse, UsageFilters } from '$types';

export const usageApi = {
  async list(filters?: UsageFilters): Promise<PaginatedResponse<LLMUsage>> {
    const result = await apiClient.get<PaginatedResponse<LLMUsage>>('/usage', filters);
    return result.data;
  },

  async get(id: string): Promise<LLMUsage> {
    const result = await apiClient.get<LLMUsage>(`/usage/${id}`);
    return result.data;
  },

  async getStats(filters?: UsageFilters): Promise<UsageStats> {
    const result = await apiClient.get<UsageStats>('/usage/stats', filters);
    return result.data;
  },

  async export(filters?: UsageFilters): Promise<Blob> {
    const params = new URLSearchParams(filters as any);
    const response = await fetch(
      `${apiClient['baseUrl']}/usage/export?${params}`,
      {
        headers: {
          Authorization: `Bearer ${apiClient.getToken()}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return response.blob();
  },
};
