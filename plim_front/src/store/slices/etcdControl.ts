import { create } from 'zustand';
import type { EtcdControlStoreState } from '../types';
import { back_url, getHeaders } from '../utils';
import { useAuthenticationStore } from './authentication';

export const useEtcdControlStore = create<EtcdControlStoreState>((set) => ({
  etcdData: [],
  loading: true,
  error: null,
  setEtcdDataView: async (etcdName: string, keyPath: string, keyValue: any) => {
    set({ loading: true, error: null });
    console.log(etcdName, keyPath, keyValue);
    
    try {
      const response = await fetch(`${back_url}/etcd/plan-view/update-key`, {
        method: 'PATCH',
        headers: getHeaders(true),
        body: JSON.stringify({ etcd_name: etcdName, key_path: keyPath, key_value: keyValue })
      });

      if (!response.ok) {
        if (response.status === 401) {
          useAuthenticationStore.getState().logoutUser();
          throw new Error('Unauthorized');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log(data);

    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
  getEtcdDataViewsKeys: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${back_url}/etcd/plans-views`, {
        headers: getHeaders(true),
      });
      if (!response.ok) {
        if (response.status === 401) {
          useAuthenticationStore.getState().logoutUser();
          throw new Error('Unauthorized');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      set({ etcdData: data });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
  getEtcdDataView: async (etcdName: string, keyPath: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${back_url}/etcd/plan-view/read-key`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ etcd_name: etcdName, key_path: keyPath })
      });
      if (!response.ok) {
        if (response.status === 401) {
          useAuthenticationStore.getState().logoutUser();
          throw new Error('Unauthorized');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
  getEtcdDataInventory: async (etcdName: string, keyPath: string): Promise<any | undefined> => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${back_url}/etcd/inventory/read-key`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ etcd_name: etcdName, key_path: keyPath })
      });
      if (!response.ok) {
        if (response.status === 401) {
          useAuthenticationStore.getState().logoutUser();
          throw new Error('Unauthorized');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log(data);
      const decodedData = atob(data);
      console.log(decodedData);
      return decodedData;
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
  setEtcdDataInventory: async (etcdName: string, keyPath: string, keyValue: any) => {
    set({ loading: true, error: null });
    try {
      const base64Data = btoa(keyValue);
      console.log({ etcd_name: etcdName, key_path: keyPath, key_value: base64Data });
      const response = await fetch(`${back_url}/etcd/inventory/update-key`, {
        method: 'PATCH',
        headers: getHeaders(true),
        body: JSON.stringify({ etcd_name: etcdName, key_path: keyPath, key_value: base64Data })
      });
      if (!response.ok) {
        if (response.status === 401) {
          useAuthenticationStore.getState().logoutUser();
          throw new Error('Unauthorized');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.log(error);
      set({ error: (error as Error).message });
    }
  },
  getEtcdDataInventoriesKeys: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${back_url}/etcd/inventories`, {
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
      set({ etcdData: data });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
  getEtcdDataUsers: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${back_url}/etcd/users`, {
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
      set({ etcdData: data });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  }
}));
