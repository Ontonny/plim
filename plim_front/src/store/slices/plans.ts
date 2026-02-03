import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { PlansStoreState, Plan, User, PipelineData } from '../types';
import { back_url, getHeaders } from '../utils';
import { useAuthenticationStore } from './authentication';
import { useAnsibleStore } from './ansible';
import { useSettingsStore } from './settings';

export const usePlansStore = create<PlansStoreState>()(
  persist(
    (set) => ({
      planList: [],
      userList: [],
      logList: [],
      ref: "",
      triggerFormat: "",
      planType: "",
      activePlanData: undefined,
      activePipelineName: "",
      activeProjectId: "",
      executedPipelineData: undefined,
      loading: true,
      error: null,
      errorMessage: "",
      statusOk: false,
      getPlan: async (pipelineName: string) => {
        set({ loading: true, error: null });
        set({ activePlanData: undefined });
        try {
          const response = await fetch(`${back_url}/plans/${pipelineName}`, {
            headers: getHeaders(true)
          });
          if (!response.ok) {
            if (response.status === 401) {
              useAuthenticationStore.getState().logoutUser();
              throw new Error('Unauthorized');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json() as Plan;
          set({ activePlanData: data });
          set({ 
            activeProjectId: data.gitlab.projectId, 
            ref: data.gitlab.ref, 
            triggerFormat: data.gitlab.execute_api_type,
            planType: data.type
          });
          
        } catch (error) {
          set({ error: (error as Error).message });
        }
      },

      copyPlanLinkToClipboard: async () => { 
        const url = window.location.href;
        navigator.clipboard.writeText(`${url}/${usePlansStore.getState().activePipelineName}`);
      },

      setActivePlan: (pipelineName: string) => {
        set({ activePipelineName: pipelineName });
      },

      triggerPipeline: async (planValues: Record<string, any>, planName: string, ansibleValues?: Record<string, any>, gitlabRef?: string) => {
        try {
          let triggerPayload: { ansible_data?: Record<string, any>, gitlab_data?: Record<string, any>, json_data: Record<string, any> } = { json_data: planValues };
          if (ansibleValues !== undefined) {
            ansibleValues["limit"] = [...useAnsibleStore.getState().selectedHosts, ...useAnsibleStore.getState().selectedGroups];
            triggerPayload = { ansible_data: ansibleValues, json_data: planValues };
          }
          console.log("gitlabRef: " + gitlabRef);
          if (gitlabRef !== undefined) {
            triggerPayload.gitlab_data = { selected_ref: gitlabRef };
          }
          console.log("triggerPayload: " + JSON.stringify(triggerPayload));
          
          const response = await fetch(`${back_url}/trigger-pipeline/${planName}`, {
            method: 'POST',
            headers: getHeaders(true),
            body: JSON.stringify(triggerPayload)
          });
          if (!response.ok) {
            if (response.status === 401) {
              useAuthenticationStore.getState().logoutUser();
              throw new Error('Unauthorized');
            }
            const errorMessage = await response.json();
            set({ errorMessage: errorMessage.error, statusOk: false });
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          console.log("data: " + JSON.stringify(data));
          set({ executedPipelineData: { url: data.url, 
            ref: data.ref, 
            status: data.status, 
            tag: data.tag, 
            yaml_errors: data.yaml_errors, 
            created_at: data.created_at, 
            user: data.user 
          }, statusOk: true });
          const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          };
          set((state) => ({
            ...state,
            logList: [...state.logList, { planName, json: planValues, pipelineUrl: data.url, date: new Date().toLocaleDateString(useSettingsStore.getState().settings?.dateFormat ?? 'en-US', options) }]
          }));
          console.log(data);
        } catch (error) {
          set({ error: (error as Error).message });
          
          set({ executedPipelineData: { url: "FAIL: No pipeline url", status: (error as any).status } });
        }
      },

      getPlanList: async () => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`${back_url}/plans-list`, {
            headers: getHeaders(true)
          });
          if (!response.ok) {
            if (response.status === 401) {
              useAuthenticationStore.getState().logoutUser();
              throw new Error('Unauthorized');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json() as Record<string, Omit<Plan, 'planName'>>;
          const list = Object.entries(data).map(([key, value]) => ({
            planName: key,
            ...value
          })) as Plan[];
          console.log(list);
          set({ planList: list, loading: false });
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
        }
      },

      getUserList: async () => {
        set({ loading: true, error: null });
        try {
          const response = await fetch(`${back_url}/user-list`, {
            headers: getHeaders(true)
          });
          if (!response.ok) {
            if (response.status === 401) {
              useAuthenticationStore.getState().logoutUser();
              throw new Error('Unauthorized');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json() as Record<string, Omit<User, 'username'>>;
          const userList = Object.entries(data).map(([key, value]) => ({
            username: key,
            ...value
          }));
          console.log(userList);
          set({ userList, loading: false });
        } catch (error) {
          set({ error: (error as Error).message, loading: false });
        }
      },
      cleanLogs: async () =>{
        set(() => ({logList: []}));
      },
    }),
    {
      name: "logs-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ logList: state.logList }),
    }
  )
);

// @ts-ignore
window.store = usePlansStore;
