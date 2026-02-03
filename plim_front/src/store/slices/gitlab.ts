import { create } from 'zustand';
import type { GitlabStoreState } from '../types';
import { back_url, getHeaders } from '../utils';
import { useAuthenticationStore } from './authentication';

export const useGitlabStore = create<GitlabStoreState>((set) => ({
  refs: [],
  loading: true,
  error: null,
  
  getRefs: async (planName: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${back_url}/gitlab-refs/${planName}`, {
        headers: getHeaders(true)
      });
      if (!response.ok) {
        if (response.status === 401) {
          useAuthenticationStore.getState().logoutUser();
          throw new Error('Unauthorized');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const refsWithIds = data.map((tag: string, index: number) => ({
        key: (index + 1).toString(),  // Create a unique ID based on index
        tag,
      }))
      console.log("refs: " + JSON.stringify(refsWithIds));
      set({ refs: refsWithIds });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  }
}));
