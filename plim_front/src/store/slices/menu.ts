import { create } from 'zustand';
import type { MenuStoreState, UserInfo } from '../types';
import { back_url, getHeaders } from '../utils';
import { useAuthenticationStore } from './authentication';

export const useMenuStore = create<MenuStoreState>((set) => ({
  data: { username: "", email: "", groups: [], full_name: "" },
  loading: true,
  isAdmin: false,
  searchingPlanName: "",
  error: null,

  setSearchingPlanName: (planName: string) => {
    set({ searchingPlanName: planName });
  },

  getUserInfo: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${back_url}/user-info`, {
        headers: getHeaders(true)
      });
      if (!response.ok) {
        if (response.status === 401) {
          useAuthenticationStore.getState().logoutUser();
          throw new Error('Unauthorized');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json() as UserInfo;
      set({ data, loading: false });
      if (data.groups.includes('admin')) {
        set({ isAdmin: true });
      }
      console.log(data);
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  }
}));
