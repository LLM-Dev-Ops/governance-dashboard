import { apiClient } from './client';
import type { User, PaginatedResponse } from '$types';

export const usersApi = {
  async list(params?: { page?: number; page_size?: number }): Promise<PaginatedResponse<User>> {
    const result = await apiClient.get<PaginatedResponse<User>>('/users', params);
    return result.data;
  },

  async get(id: string): Promise<User> {
    const result = await apiClient.get<User>(`/users/${id}`);
    return result.data;
  },

  async create(user: Partial<User>): Promise<User> {
    const result = await apiClient.post<User>('/users', user);
    return result.data;
  },

  async update(id: string, user: Partial<User>): Promise<User> {
    const result = await apiClient.put<User>(`/users/${id}`, user);
    return result.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  },

  async deactivate(id: string): Promise<User> {
    const result = await apiClient.post<User>(`/users/${id}/deactivate`);
    return result.data;
  },

  async activate(id: string): Promise<User> {
    const result = await apiClient.post<User>(`/users/${id}/activate`);
    return result.data;
  },
};
