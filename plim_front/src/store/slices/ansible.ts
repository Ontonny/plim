import { create } from 'zustand';
import type { AnsibleStoreState, AnsibleGroup, AnsibleGroupData } from '../types';
import { back_url, getHeaders } from '../utils';
import { useAuthenticationStore } from './authentication';

export const useAnsibleStore = create<AnsibleStoreState>((set) => ({
  ansibleData: [],
  ansibleCmd: "",
  selectedGroups: [],
  selectedHosts: [],
  loading: true,
  error: null,

  cleanAllSelected: () => {
    set({ selectedGroups: [], selectedHosts: [] });
  },

  selectGroup: (groupName: string) => {
    if (useAnsibleStore.getState().selectedGroups.includes(groupName)) {
      set((state) => ({ selectedGroups: state.selectedGroups.filter(item => item !== groupName) }));
    } else {
      set((state) => ({ selectedGroups: [...state.selectedGroups, groupName] }));
    }
  },

  selectHost: (hostName: string) => {
    if (useAnsibleStore.getState().selectedHosts.includes(hostName)) {
      set((state) => ({ selectedHosts: state.selectedHosts.filter(item => item !== hostName) }));
    } else {
      set((state) => ({ selectedHosts: [...state.selectedHosts, hostName] }));
    }
  },

  getAllUniqHosts: (): string[] => {
    const allHosts = useAnsibleStore.getState().ansibleData.flatMap((group) => 
      group.hosts.map((host) => host.name)
    );
    return [...new Set(allHosts)];
  },

  getAllUniqGroups: (): string[] => {
    const allGroupNames = useAnsibleStore.getState().ansibleData.map((group) => group.name);
    return [...new Set(allGroupNames)];
  },

  getAnsibleCmd: async (planValues: Record<string, any>, ansibleValues?: Record<string, any>) => {
    let cmdPayload = { ansible_data: ansibleValues, json_data: planValues };

    // console.log("cmdPayload: " + JSON.stringify(cmdPayload));
    set({ loading: true, error: null });
    
    try {
      const response = await fetch(`${back_url}/ansible/get-cmd`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify(cmdPayload)
      });

      if (!response.ok) {
        if (response.status === 401) {
          useAuthenticationStore.getState().logoutUser();
          throw new Error('Unauthorized');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("Ansible response: " + data);
      set({ ansibleCmd: data });
      navigator.clipboard.writeText(data);
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  getAnsibleGroups: async (selectedPlanName: string | null) => {
    set({ loading: true, error: null });
    console.log("getAnsibleGroups: " + selectedPlanName);
    if (!selectedPlanName) { return; }
    
    try {
      const response = await fetch(`${back_url}/ansible/inventory`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ plan_name: selectedPlanName })
      });

      if (!response.ok) {
        if (response.status === 401) {
          useAuthenticationStore.getState().logoutUser();
          throw new Error('Unauthorized');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      console.log("getAnsibleGroups: " + JSON.stringify(response));
      const data = await response.json() as Record<string, AnsibleGroup>;
      console.log(data);
      const responseMap = new Map(Object.entries(data));
      const responseArray = Array.from(responseMap, ([name, value]) => {
        const entity: AnsibleGroupData = { 
          name, 
          hosts: Object.entries(value.hosts).map(([hostName, vars]) => ({ 
            name: hostName, 
            vars: vars as unknown as Record<string, any> 
          }))
        };
        return entity;
      });
      set({ ansibleData: responseArray, loading: false });
      console.log(responseArray);
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  }
}));
