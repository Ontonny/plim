import { create } from 'zustand';
import type { GenPassStoreState } from '../types';
import { back_url, getHeaders } from '../utils';

export const useGenPassStore = create<GenPassStoreState>((set) => ({
  passwordHash: "",
  loading: true,
  error: null,

  getUserPasswordHash: async (userPassword: string) => {
    set({ loading: true, error: null });
    const data = { password: userPassword };
    try {
      const response = await fetch(`${back_url}/gen-password-hash`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const responseData = await response.json() as { passwordHash: string };
      set({ passwordHash: responseData.passwordHash, loading: false });
      console.log(responseData);
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  }
}));
