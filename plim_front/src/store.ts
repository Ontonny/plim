import { create } from 'zustand';
import { type TreeNodeInfo } from "@blueprintjs/core";
import Cookies from 'js-cookie';
import { createJSONStorage, persist } from 'zustand/middleware';

const back_url = import.meta.env.VITE_PLIM_BACKEND_URL // TODO make build variable

type Headers = Record<string, string>;

const baseHeaders: Headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

const getHeaders = (includeAuth = false): Headers => {
  const headers = { ...baseHeaders };
  if (includeAuth) {
    headers['Authorization'] = `Bearer ${Cookies.get('token')}`;
  }
  return headers;
};

// API Response Types
interface LoginResponse {
  access_token: string;
}

interface UserInfo {
  username: string;
  email: string;
  groups: string[];
}

interface Plan {
  planName: string;
  gitlab: {
    projectId: string;
    ref: string;
    execute_api_type: string;
  };
  [key: string]: any;
}

interface User {
  username: string;
  [key: string]: any;
}

interface PipelineLog {
  planName: string;
  json: Record<string, any>;
  pipelineUrl: string;
  date: string;
}

// Ansible Types
type AnsibleHostValue = null;  // All hosts must have null values
type AnsibleHosts = Record<string, AnsibleHostValue>;
type AnsibleGroup = {
  hosts: AnsibleHosts;
};
type AnsibleInventory = Record<string, AnsibleGroup>;

interface AnsibleHost {
  name: string;
  vars: Record<string, any>;
}

interface AnsibleGroupData {
  name: string;
  hosts: AnsibleHost[];
}

// Tree Node Types
interface RecursiveTreeNodeInfo extends Omit<TreeNodeInfo, 'childNodes'> {
  childNodes?: RecursiveTreeNodeInfo[];
}
type TreeNodeOrArray = RecursiveTreeNodeInfo | RecursiveTreeNodeInfo[];

// Store State Types
interface StoreState {
  data: TreeNodeOrArray[];
  loading: boolean;
  loading_plan: boolean;
  error: string | null;
  count: number;
  fetchData: () => Promise<void>;
}

interface AuthenticationStoreState {
  data: UserInfo | null;
  authenticated: boolean;
  tokenBearer: string | undefined;
  loading: boolean;
  error: string | null;
  loginUser: (username: string, password: string) => Promise<void>;
  setToken: (newToken: string) => void;
  clearToken: () => void;
  logoutUser: () => void;
  checkLogin: () => void;
}

interface MenuStoreState {
  data: UserInfo;
  isAdmin: boolean;
  searchingPlanName: string;
  loading: boolean;
  error: string | null;
  getUserInfo: () => Promise<void>;
  setSearchingPlanName: (name: string) => void;
}

interface GenPassStoreState {
  passwordHash: string;
  loading: boolean;
  error: string | null;
  getUserPasswordHash: (userPassword: string) => Promise<void>;
}

interface PipelineData {
  url: string;
  ref: string;
  status: string;
  tag: string;
  yaml_errors: string | null;
  created_at: string;
  user: {
    id: number;
    name: string;
    username: string;
    state: string;
    locked: boolean;
  }
}

interface PlansStoreState {
  planList: Plan[];
  userList: User[];
  errorMessage: string;
  statusOk: boolean;
  logList: PipelineLog[];
  activePlanData: Plan | undefined;
  activePipelineName: string;
  activeProjectId: string;
  loading: boolean;
  ref: string;
  triggerFormat: string;
  planType: string;
  error: string | null;
  executedPipelineData: PipelineData | undefined;
  getPlanList: () => Promise<void>;
  getUserList: () => Promise<void>;
  getPlan: (pipelineName: string) => Promise<void>;
  triggerPipeline: (planValues: Record<string, any>, planName: string, ansibleValues?: Record<string, any>, gitlabRef?: string) => Promise<void>;
  setActivePlan: (pipelineName: string) => void;
  copyPlanLinkToClipboard: () => Promise<void>;
  cleanLogs: () => Promise<void>;
}

interface AnsibleStoreState {
  ansibleData: AnsibleGroupData[];
  ansibleCmd: string;
  selectedGroups: string[];
  selectedHosts: string[];
  loading: boolean;
  error: string | null;
  cleanAllSelected: () => void;
  getAnsibleGroups: (selectedPlanName: string | null) => Promise<void>;
  getAnsibleCmd: (planValues: Record<string, any>, ansibleValues?: Record<string, any>) => Promise<void>;
  selectHost: (hostName: string) => void;
  selectGroup: (groupName: string) => void;
  getAllUniqHosts: () => string[];
  getAllUniqGroups: () => string[];
}

interface EtcdControlStoreState {
  etcdData: any[];
  loading: boolean;
  error: string | null;
  getEtcdDataViewsKeys: () => Promise<void>;
  getEtcdDataView: (etcdName: string, keyPath: string) => Promise<Object>;
  getEtcdDataInventoriesKeys: () => Promise<void>;
  getEtcdDataUsers: () => Promise<void>;
  setEtcdDataView: (etcdName: string, keyPath: string, keyValue: any) => Promise<void>;
  setEtcdDataInventory: (etcdName: string, keyPath: string, keyValue: any) => Promise<void>;
  getEtcdDataInventory: (etcdName: string, keyPath: string) => Promise<string | undefined>;
}

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

interface SettingsStoreState {
  settings: Record<string, any>;
  loading: boolean;
  error: string | null;
  setSettings: (settings: Record<string, any>) => Promise<void>;
  getHealthcheckUrl: () => string;
}

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
      const responseData = await response.json() as LoginResponse;
      set({ tokenBearer: responseData.access_token, loading: false });

      Cookies.set('token', responseData.access_token, { expires: 7, secure: true });
      console.log("Logged!");
      set({ authenticated: true });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  }
}));

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

interface GitlabStoreState {
  refs: { key: string; tag: string }[];
  loading: boolean;
  error: string | null;
  getRefs: (planName: string) => Promise<void>;
}
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
          
          set({ executedPipelineData: { url: "FAIL: No pipeline url", status: data.status } });
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
//
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

// @ts-ignore
window.store = usePlansStore;
