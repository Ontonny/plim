import { create } from 'zustand';
import Cookies from 'js-cookie';
import type { AuthenticationStoreState } from '../types';
import { back_url, getHeaders } from '../utils';

export const useAuthenticationStore = create<AuthenticationStoreState>((set) => ({
  data: null,
  loading: true,
  authenticated: false,
  tokenBearer: Cookies.get('token'),
  error: null,

  setToken: (newToken: string) => {
    Cookies.set('token', newToken, { expires: 7, secure: true });
    set({ tokenBearer: newToken });
  },
  clearToken: () => {
    Cookies.remove('token');
    set({ tokenBearer: undefined });
  },
  logoutUser: () => {
    Cookies.remove('token');
    set({ authenticated: false });
  },
  checkLogin: () => {
    if (Cookies.get('token')) {
      set({ authenticated: true });
    }
  },
  loginUser: async (username: string, password: string) => {
    set({ loading: true, error: null });
    const data = { password, username };
    try {
      const response = await fetch(`${back_url}/login`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      console.log(response);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.detail}`);
      }
      const responseData = await response.json() as { access_token: string };
      set({ tokenBearer: responseData.access_token, loading: false });

      Cookies.set('token', responseData.access_token, { expires: 7, secure: true });
      console.log("Logged!");
      set({ authenticated: true });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  }
}));
