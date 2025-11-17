import { apiClient } from './client';
import type { Policy, PolicyViolation, PaginatedResponse, PolicyFilters } from '$types';

export const policiesApi = {
  async list(filters?: PolicyFilters): Promise<PaginatedResponse<Policy>> {
    const result = await apiClient.get<PaginatedResponse<Policy>>('/policies', filters);
    return result.data;
  },

  async get(id: string): Promise<Policy> {
    const result = await apiClient.get<Policy>(`/policies/${id}`);
    return result.data;
  },

  async create(policy: Partial<Policy>): Promise<Policy> {
    const result = await apiClient.post<Policy>('/policies', policy);
    return result.data;
  },

  async update(id: string, policy: Partial<Policy>): Promise<Policy> {
    const result = await apiClient.put<Policy>(`/policies/${id}`, policy);
    return result.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/policies/${id}`);
  },

  async activate(id: string): Promise<Policy> {
    const result = await apiClient.post<Policy>(`/policies/${id}/activate`);
    return result.data;
  },

  async deactivate(id: string): Promise<Policy> {
    const result = await apiClient.post<Policy>(`/policies/${id}/deactivate`);
    return result.data;
  },

  async getViolations(params?: {
    policy_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<PolicyViolation>> {
    const result = await apiClient.get<PaginatedResponse<PolicyViolation>>(
      '/policies/violations',
      params
    );
    return result.data;
  },

  async resolveViolation(violationId: string): Promise<PolicyViolation> {
    const result = await apiClient.post<PolicyViolation>(
      `/policies/violations/${violationId}/resolve`
    );
    return result.data;
  },
};
