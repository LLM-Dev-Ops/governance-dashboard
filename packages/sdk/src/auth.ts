import type { ApiClient } from './client';
import type {
  AuthResponse,
  LoginCredentials,
  RegisterData,
  User,
  MFASetupResponse,
  MFAVerifyRequest,
} from '@llm-dev-ops/types';

export class AuthApi {
  constructor(private client: ApiClient) {}

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const formData = new FormData();
    formData.append('username', credentials.email);
    formData.append('password', credentials.password);

    const response = await fetch(`${this.client.getBaseUrl()}/auth/login`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    this.client.setToken(data.access_token);
    return data;
  }

  async register(userData: RegisterData): Promise<AuthResponse> {
    const result = await this.client.post<AuthResponse>('/auth/register', userData);
    if (result.data.access_token) {
      this.client.setToken(result.data.access_token);
    }
    return result.data;
  }

  async getCurrentUser(): Promise<User> {
    const result = await this.client.get<User>('/auth/me');
    return result.data;
  }

  async logout(): Promise<void> {
    this.client.setToken(null);
  }

  async refreshToken(): Promise<AuthResponse> {
    const result = await this.client.post<AuthResponse>('/auth/refresh');
    if (result.data.access_token) {
      this.client.setToken(result.data.access_token);
    }
    return result.data;
  }

  async setupMFA(): Promise<MFASetupResponse> {
    const result = await this.client.post<MFASetupResponse>('/auth/mfa/setup');
    return result.data;
  }

  async verifyMFASetup(code: string): Promise<{ success: boolean; backup_codes: string[] }> {
    const result = await this.client.post<{ success: boolean; backup_codes: string[] }>(
      '/auth/mfa/verify-setup',
      { code }
    );
    return result.data;
  }

  async verifyMFA(request: MFAVerifyRequest): Promise<AuthResponse> {
    const result = await this.client.post<AuthResponse>('/auth/mfa/verify', request);
    if (result.data.access_token) {
      this.client.setToken(result.data.access_token);
    }
    return result.data;
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const result = await this.client.post<{ message: string }>(
      '/auth/password/request-reset',
      { email }
    );
    return result.data;
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const result = await this.client.post<{ message: string }>('/auth/password/reset', {
      token,
      password,
    });
    return result.data;
  }
}
