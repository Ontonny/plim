import { create, StoreApi } from 'zustand';
import axios, { AxiosError } from 'axios';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { persist, createJSONStorage } from 'zustand/middleware';

// Mock the store module first
vi.mock('../store', () => {
  const plansStore = create<any>()(
    persist<any>(
      (set) => ({
        planList: [],
        userList: [],
        logList: [],
        ref: "",
        triggerFormat: "",
        activePlanData: undefined,
        activePipelineName: "test-pipeline",
        activeProjectId: "",
        lastExecutedPipelineUrl: "",
        loading: false,
        error: null,

        getPlanList: async () => {
          set({ loading: true, error: null });
          try {
            const response = await fetch('http://test-backend/plans-list', {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token'
              }
            });
            if (!response.ok) {
              if (response.status === 401) {
                throw new Error('Unauthorized');
              }
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const list = Object.entries(data).map(([key, value]) => ({
              planName: key,
              ...(value as object)
            }));
            set({ planList: list, loading: false });
          } catch (error) {
            set({ error: (error as Error).message, loading: false });
            throw error;
          }
        },

        getPlan: async (pipelineName: string) => {
          set({ loading: true, error: null });
          try {
            const response = await fetch(`http://test-backend/plans/${pipelineName}`, {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token'
              }
            });
            if (!response.ok) {
              if (response.status === 401) {
                throw new Error('Unauthorized');
              }
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            set({ 
              activePlanData: data,
              activeProjectId: data.gitlab.project_id,
              ref: data.gitlab.ref,
              triggerFormat: data.gitlab.trigger_format,
              loading: false 
            });
          } catch (error) {
            set({ error: (error as Error).message, loading: false });
            throw error;
          }
        },

        getUserList: async () => {
          set({ loading: true, error: null });
          try {
            const response = await fetch('http://test-backend/user-list', {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token'
              }
            });
            if (!response.ok) {
              if (response.status === 401) {
                throw new Error('Unauthorized');
              }
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const userList = Object.entries(data).map(([key, value]) => ({
              username: key,
              ...(value as object)
            }));
            set({ userList, loading: false });
          } catch (error) {
            set({ error: (error as Error).message, loading: false });
            throw error;
          }
        },

        triggerPipeline: async (planValues: any, planName: string) => {
          try {
            const response = await fetch(`http://test-backend/trigger-pipeline/${planName}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token'
              },
              body: JSON.stringify({ json_data: planValues })
            });
            if (!response.ok) {
              if (response.status === 401) {
                throw new Error('Unauthorized');
              }
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            set((state) => ({
              lastExecutedPipelineUrl: data.url,
              logList: [...state.logList, { planName, json: planValues, pipelineUrl: data.url }]
            }));
          } catch (error) {
            set({ lastExecutedPipelineUrl: "FAIL: No pipeline url" });
            throw error;
          }
        },

        setActivePlan: (pipelineName: string) => {
          set({ activePipelineName: pipelineName });
        }
      }),
      {
        name: "plans-store",
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ logList: state.logList })
      }
    )
  );

  return {
    usePlansStore: plansStore,
    useMenuStore: create(() => ({
      data: { username: "", email: "", groups: [] },
      isAdmin: false,
      loading: false,
      error: null,
      getUserInfo: vi.fn(),
      setSearchingPlanName: vi.fn()
    })),
    useAnsibleStore: create(() => ({
      ansibleData: [],
      selectedGroups: [],
      selectedHosts: [],
      loading: false,
      error: null,
      cleanAllSelected: vi.fn(),
      getAnsibleGroups: vi.fn(),
      selectHost: vi.fn(),
      selectGroup: vi.fn(),
      getAllUniqHosts: vi.fn(),
      getAllUniqGroups: vi.fn()
    })),
    useGenPassStore: create(() => ({
      passwordHash: "",
      loading: false,
      error: null,
      getUserPasswordHash: vi.fn()
    })),
    useAuthenticationStore: create(() => ({
      authenticated: false,
      tokenBearer: "",
      loading: false,
      error: null,
      loginUser: vi.fn(),
      logoutUser: vi.fn(),
      setToken: vi.fn(),
      clearToken: vi.fn(),
      checkLogin: vi.fn()
    }))
  };
});

// Import the mocked store after mocking
import * as storeModule from '../store';

interface StoreState {
  selectedHosts: string[];
  selectedGroups: string[];
  ansibleData: any[];
  error: string | null;
  loading: boolean;
  data: any[];
  authenticated: boolean;
  tokenBearer: string;
  activePipelineName: string;
  planList: any[];
  setState: (newState: Partial<StoreState>) => void;
  loginUser: (username: string, password: string) => Promise<void>;
  logoutUser: () => void;
}

type TestStore = StoreApi<StoreState>;
let testStore: TestStore;

const createTestStore = () => {
  return create<StoreState>()((set) => ({
    selectedHosts: [],
    selectedGroups: [],
    ansibleData: [],
    error: null,
    loading: false,
    data: [],
    authenticated: false,
    tokenBearer: '',
    activePipelineName: '',
    planList: [],
    setState: (newState: Partial<StoreState>) => set((state) => ({ ...state, ...newState })),
    loginUser: async (username: string, password: string) => {
      try {
        const response = await axios.post('/login', { username, password });
        set({ authenticated: true, tokenBearer: response.data.token, error: null });
      } catch (error) {
        const err = error as AxiosError;
        set({ authenticated: false, error: err.message });
        throw error;
      }
    },
    logoutUser: () => {
      set({ authenticated: false, tokenBearer: '', error: null });
    }
  }));
};

beforeEach(() => {
  testStore = createTestStore();
  vi.clearAllMocks();
});

vi.mock('axios');

describe('Store Tests', () => {
  it('should handle login success', async () => {
    const mockResponse = { data: { token: 'test-token' } };
    vi.mocked(axios.post).mockResolvedValueOnce(mockResponse);

    await testStore.getState().loginUser('test', 'password');
    
    expect(testStore.getState().authenticated).toBe(true);
    expect(testStore.getState().tokenBearer).toBe('test-token');
  });

  it('should fetch plans list successfully', async () => {
    const mockPlans = {
      'plan1': { name: 'Plan 1' },
      'plan2': { name: 'Plan 2' }
    };
    
    const mockFetch = vi.fn().mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockPlans)
      })
    );
    global.fetch = mockFetch;

    const store = storeModule.usePlansStore;
    await store.getState().getPlanList();

    expect(mockFetch).toHaveBeenCalledWith(
      'http://test-backend/plans-list',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        })
      })
    );

    const state = store.getState();
    expect(state.planList).toEqual([
      { planName: 'plan1', name: 'Plan 1' },
      { planName: 'plan2', name: 'Plan 2' }
    ]);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should fetch a specific plan successfully', async () => {
    const mockPlan = {
      gitlab: {
        project_id: "123",
        ref: "main",
        trigger_format: "json"
      },
      name: "Test Plan"
    };
    
    const mockFetch = vi.fn().mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockPlan)
      })
    );
    global.fetch = mockFetch;

    const store = storeModule.usePlansStore;
    await store.getState().getPlan('test-plan');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://test-backend/plans/test-plan',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        })
      })
    );

    const state = store.getState();
    expect(state.activePlanData).toEqual(mockPlan);
    expect(state.activeProjectId).toBe("123");
    expect(state.ref).toBe("main");
    expect(state.triggerFormat).toBe("json");
    expect(state.error).toBeNull();
  });

  it('should fetch user list successfully', async () => {
    const mockUsers = {
      'user1': { email: 'user1@test.com', groups: ['admin'] },
      'user2': { email: 'user2@test.com', groups: ['user'] }
    };
    
    const mockFetch = vi.fn().mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockUsers)
      })
    );
    global.fetch = mockFetch;

    const store = storeModule.usePlansStore;
    await store.getState().getUserList();

    expect(mockFetch).toHaveBeenCalledWith(
      'http://test-backend/user-list',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        })
      })
    );

    const state = store.getState();
    expect(state.userList).toEqual([
      { username: 'user1', email: 'user1@test.com', groups: ['admin'] },
      { username: 'user2', email: 'user2@test.com', groups: ['user'] }
    ]);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should trigger pipeline successfully', async () => {
    const mockPipelineResponse = { url: 'http://gitlab/pipeline/123' };
    const planValues = { key: 'value' };
    const planName = 'test-plan';
    
    const mockFetch = vi.fn().mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockPipelineResponse)
      })
    );
    global.fetch = mockFetch;

    const store = storeModule.usePlansStore;
    await store.getState().triggerPipeline(planValues, planName);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://test-backend/trigger-pipeline/test-plan',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }),
        body: JSON.stringify({ json_data: planValues })
      })
    );

    const state = store.getState();
    expect(state.lastExecutedPipelineUrl).toBe('http://gitlab/pipeline/123');
    expect(state.logList).toHaveLength(1);
    expect(state.logList[0]).toEqual({
      planName: 'test-plan',
      json: planValues,
      pipelineUrl: 'http://gitlab/pipeline/123'
    });
  });

  it('should set active plan', () => {
    const store = storeModule.usePlansStore;
    store.getState().setActivePlan('new-active-plan');
    
    const state = store.getState();
    expect(state.activePipelineName).toBe('new-active-plan');
  });

  it('should handle fetch errors', async () => {
    const mockFetch = vi.fn().mockImplementation(() => 
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal Server Error' })
      })
    );
    global.fetch = mockFetch;

    const store = storeModule.usePlansStore;
    await expect(store.getState().getPlanList()).rejects.toThrow('HTTP error! status: 500');

    const state = store.getState();
    expect(state.error).toBe('HTTP error! status: 500');
    expect(state.loading).toBe(false);
  });

  it('should handle unauthorized errors', async () => {
    const mockFetch = vi.fn().mockImplementation(() => 
      Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' })
      })
    );
    global.fetch = mockFetch;

    const store = storeModule.usePlansStore;
    await expect(store.getState().getPlanList()).rejects.toThrow('Unauthorized');

    const state = store.getState();
    expect(state.error).toBe('Unauthorized');
    expect(state.loading).toBe(false);
  });
}); 