import { apiClient } from './client';
import type { AuditLog, PaginatedResponse, AuditFilters } from '$types';

export const auditApi = {
  async list(filters?: AuditFilters): Promise<PaginatedResponse<AuditLog>> {
    const result = await apiClient.get<PaginatedResponse<AuditLog>>('/audit', filters);
    return result.data;
  },

  async get(id: string): Promise<AuditLog> {
    const result = await apiClient.get<AuditLog>(`/audit/${id}`);
    return result.data;
  },

  async export(filters?: AuditFilters): Promise<Blob> {
    const params = new URLSearchParams(filters as any);
    const response = await fetch(
      `${apiClient['baseUrl']}/audit/export?${params}`,
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
