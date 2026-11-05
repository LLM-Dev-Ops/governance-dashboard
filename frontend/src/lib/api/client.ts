import { browser } from '$app/environment';
import type { ApiError, ApiResponse } from '$types';

const API_BASE_URL = browser
  ? import.meta.env.PUBLIC_API_URL || 'http://localhost:8000/api/v1'
  : 'http://localhost:8000/api/v1';

export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    if (browser) {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (browser) {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Empty successes are not network failures. Error gateways may return
      // HTML or no body; preserve status without exposing arbitrary text.
      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : undefined;
      } catch (error) {
        if (response.ok) throw error;
      }

      if (!response.ok) {
        const body = data !== null && typeof data === 'object' ? data : {};
        const error: ApiError = {
          detail: typeof body.detail === 'string' && body.detail ? body.detail : 'An error occurred',
          status_code: response.status,
          error_code: typeof body.error_code === 'string' ? body.error_code : undefined,
        };
        throw error;
      }

      return {
        data,
        success: true,
      };
    } catch (error) {
      if (error !== null && typeof error === 'object' && (error as ApiError).status_code) {
        throw error;
      }

      throw {
        detail: 'Network error occurred',
        status_code: 0,
      } as ApiError;
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      url += `?${searchParams.toString()}`;
    }
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
