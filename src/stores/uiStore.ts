import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light';

const THEME_KEY = 'loadlink-theme';

const readInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(THEME_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'dark';
};

type UiState = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};

export const useUiStore = create<UiState>((set, get) => ({
  theme: readInitialTheme(),
  setTheme: (theme) => {
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore storage failures (privacy mode, etc.)
    }
    set({ theme });
  },
  toggleTheme: () => {
    const next: ThemeMode = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },
}));

