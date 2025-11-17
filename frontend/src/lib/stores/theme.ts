import { writable } from 'svelte/store';
import { browser } from '$app/environment';

type Theme = 'light' | 'dark';

const THEME_KEY = 'theme';

function createThemeStore() {
  const getInitialTheme = (): Theme => {
    if (!browser) return 'light';

    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const { subscribe, set } = writable<Theme>(getInitialTheme());

  return {
    subscribe,
    toggle: () => {
      let currentTheme: Theme = 'light';
      const unsubscribe = subscribe((value) => (currentTheme = value));
      unsubscribe();
      const newTheme: Theme = currentTheme === 'light' ? 'dark' : 'light';
      set(newTheme);
      if (browser) {
        localStorage.setItem(THEME_KEY, newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
      }
    },
    set: (theme: Theme) => {
      set(theme);
      if (browser) {
        localStorage.setItem(THEME_KEY, theme);
        document.documentElement.classList.toggle('dark', theme === 'dark');
      }
    },
  };
}

export const theme = createThemeStore();
