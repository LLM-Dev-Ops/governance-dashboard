/**
 * Auth Store (TypeScript-First)
 *
 * Svelte store that uses the TypeScript AuthService for state management.
 * All business logic is in the service layer, this just manages UI state.
 */

import { writable } from 'svelte/store';
import { authService } from '$lib/services';
import type { User, LoginCredentials, RegisterData } from '$lib/services';

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

class AuthStoreManager {
  private store = writable<AuthStore>({
    user: null,
    isAuthenticated: authService.isAuthenticated(),
    isLoading: false,
    error: null,
  });

  constructor() {
    // Initialize user on load if authenticated
    if (authService.isAuthenticated()) {
      this.loadUser();
    }
  }

  subscribe = this.store.subscribe;

  /**
   * Load current user from API
   */
  async loadUser(): Promise<void> {
    this.setLoading(true);
    try {
      const user = await authService.getCurrentUser();
      this.setUser(user);
    } catch (error) {
      this.setError(error instanceof Error ? error.message : 'Failed to load user');
      this.logout();
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Login with credentials
   */
  async login(credentials: LoginCredentials): Promise<void> {
    this.setLoading(true);
    this.setError(null);
    try {
      await authService.login(credentials);
      await this.loadUser();
    } catch (error) {
      this.setError(error instanceof Error ? error.message : 'Login failed');
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<void> {
    this.setLoading(true);
    this.setError(null);
    try {
      await authService.register(data);
      await this.loadUser();
    } catch (error) {
      this.setError(error instanceof Error ? error.message : 'Registration failed');
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.store.set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    this.setLoading(true);
    this.setError(null);
    try {
      await authService.requestPasswordReset(email);
    } catch (error) {
      this.setError(error instanceof Error ? error.message : 'Failed to request reset');
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Reset password
   */
  async resetPassword(token: string, password: string): Promise<void> {
    this.setLoading(true);
    this.setError(null);
    try {
      await authService.resetPassword(token, password);
    } catch (error) {
      this.setError(error instanceof Error ? error.message : 'Failed to reset password');
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  // ==================== Private Methods ====================

  public setUser(user: User | null): void {
    this.store.update((state) => ({
      ...state,
      user,
      isAuthenticated: !!user,
      error: null,
    }));
  }

  private setLoading(isLoading: boolean): void {
    this.store.update((state) => ({ ...state, isLoading }));
  }

  private setError(error: string | null): void {
    this.store.update((state) => ({ ...state, error }));
  }
}

export const authStore = new AuthStoreManager();
