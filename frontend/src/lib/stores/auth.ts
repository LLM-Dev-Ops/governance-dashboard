import { writable } from 'svelte/store';
import type { User } from '$types';

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthStore>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  return {
    subscribe,
    setUser: (user: User | null) => {
      update((state) => ({
        ...state,
        user,
        isAuthenticated: !!user,
        isLoading: false,
      }));
    },
    setLoading: (isLoading: boolean) => {
      update((state) => ({ ...state, isLoading }));
    },
    logout: () => {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    },
  };
}

export const authStore = createAuthStore();
