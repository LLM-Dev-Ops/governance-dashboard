import { apiClient } from './client';
import type { CostBreakdown, Budget, PaginatedResponse, DateRange } from '$types';

export const costsApi = {
  async getBreakdown(dateRange?: DateRange): Promise<CostBreakdown> {
    const result = await apiClient.get<CostBreakdown>('/costs/breakdown', dateRange);
    return result.data;
  },

  async listBudgets(): Promise<PaginatedResponse<Budget>> {
    const result = await apiClient.get<PaginatedResponse<Budget>>('/costs/budgets');
    return result.data;
  },

  async getBudget(id: string): Promise<Budget> {
    const result = await apiClient.get<Budget>(`/costs/budgets/${id}`);
    return result.data;
  },

  async createBudget(budget: Partial<Budget>): Promise<Budget> {
    const result = await apiClient.post<Budget>('/costs/budgets', budget);
    return result.data;
  },

  async updateBudget(id: string, budget: Partial<Budget>): Promise<Budget> {
    const result = await apiClient.put<Budget>(`/costs/budgets/${id}`, budget);
    return result.data;
  },

  async deleteBudget(id: string): Promise<void> {
    await apiClient.delete(`/costs/budgets/${id}`);
  },
};
