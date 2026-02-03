import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { SettingsStoreState } from '../types';
import { back_url } from '../utils';

export const useSettingsStore = create<SettingsStoreState>()(
  persist(
    (set) => ({
      settings: {
        dateFormat: "en-US",
        healthcheckInterval: 30_000,
      },
      loading: true,
      error: null,
      setSettings: async (settings: Record<string, any>) => {
        set((state) => ({ settings: { ...state.settings, ...settings } }));
      },
      getHealthcheckUrl: () => {
        return `${back_url}/healthz`;
      },
    }),
    {
      name: "settings-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
