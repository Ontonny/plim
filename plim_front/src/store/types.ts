import { type TreeNodeInfo } from "@blueprintjs/core";

// API Response Types
export interface LoginResponse {
  access_token: string;
}

export interface UserInfo {
  username: string;
  email: string;
  groups: string[];
}

export interface Plan {
  planName: string;
  gitlab: {
    projectId: string;
    ref: string;
    execute_api_type: string;
  };
  [key: string]: any;
}

export interface User {
  username: string;
  [key: string]: any;
}

export interface PipelineLog {
  planName: string;
  json: Record<string, any>;
  pipelineUrl: string;
  date: string;
}

// Ansible Types
export type AnsibleHostValue = null;  // All hosts must have null values
export type AnsibleHosts = Record<string, AnsibleHostValue>;
export type AnsibleGroup = {
  hosts: AnsibleHosts;
};
export type AnsibleInventory = Record<string, AnsibleGroup>;

export interface AnsibleHost {
  name: string;
  vars: Record<string, any>;
}

export interface AnsibleGroupData {
  name: string;
  hosts: AnsibleHost[];
}

// Tree Node Types
export interface RecursiveTreeNodeInfo extends Omit<TreeNodeInfo, 'childNodes'> {
  childNodes?: RecursiveTreeNodeInfo[];
}
export type TreeNodeOrArray = RecursiveTreeNodeInfo | RecursiveTreeNodeInfo[];

// Store State Types
export interface StoreState {
  data: TreeNodeOrArray[];
  loading: boolean;
  loading_plan: boolean;
  error: string | null;
  count: number;
  fetchData: () => Promise<void>;
}

export interface AuthenticationStoreState {
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

export interface MenuStoreState {
  data: UserInfo;
  isAdmin: boolean;
  searchingPlanName: string;
  loading: boolean;
  error: string | null;
  getUserInfo: () => Promise<void>;
  setSearchingPlanName: (name: string) => void;
}

export interface GenPassStoreState {
  passwordHash: string;
  loading: boolean;
  error: string | null;
  getUserPasswordHash: (userPassword: string) => Promise<void>;
}

export interface PipelineData {
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

export interface PlansStoreState {
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
  cleanLogs: () => void;
}

export interface AnsibleStoreState {
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

export interface EtcdControlStoreState {
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

export interface SettingsStoreState {
  settings: Record<string, any>;
  loading: boolean;
  error: string | null;
  setSettings: (settings: Record<string, any>) => Promise<void>;
  getHealthcheckUrl: () => string;
}

export interface GitlabStoreState {
  refs: { key: string; tag: string }[];
  loading: boolean;
  error: string | null;
  getRefs: (planName: string) => Promise<void>;
}
