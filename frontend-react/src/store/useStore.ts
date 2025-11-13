import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Profile, Tab } from '../types';

interface AppState {
  // Auth state
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  
  // Profiles state
  profiles: Profile[];
  selectedProfileId: string | null;
  
  // UI state
  isLoading: boolean;
  isSidebarOpen: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setProfiles: (profiles: Profile[]) => void;
  setSelectedProfileId: (id: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  
  // Computed
  getCurrentProfile: () => Profile | null;
  getCurrentTab: () => Tab | null;
  
  // Profile actions
  addProfile: (profile: Profile) => void;
  updateProfile: (id: string, updates: Partial<Profile>) => void;
  removeProfile: (id: string) => void;
  
  // Tab actions
  addTab: (profileId: string, tab: Tab) => void;
  updateTab: (profileId: string, tabId: string, updates: Partial<Tab>) => void;
  removeTab: (profileId: string, tabId: string) => void;
  reorderTabs: (profileId: string, tabs: Tab[]) => void;
  
  // Reset
  logout: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      profiles: [],
      selectedProfileId: null,
      isLoading: false,
      isSidebarOpen: true,
      
      // Actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      setToken: (token) => {
        if (token) {
          localStorage.setItem('token', token);
        } else {
          localStorage.removeItem('token');
        }
        set({ token, isAuthenticated: !!token });
      },
      
      setProfiles: (profiles) => set({ profiles }),
      
      setSelectedProfileId: (id) => set({ selectedProfileId: id }),
      
      setIsLoading: (loading) => set({ isLoading: loading }),
      
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),
      
      // Computed
      getCurrentProfile: () => {
        const { profiles, selectedProfileId } = get();
        if (!selectedProfileId) return null;
        return profiles.find((p) => p._id === selectedProfileId) || null;
      },
      
      getCurrentTab: () => {
        const profile = get().getCurrentProfile();
        if (!profile || !profile.activeTabId) return null;
        return profile.tabs.find((t) => t.id === profile.activeTabId) || null;
      },
      
      // Profile actions
      addProfile: (profile) =>
        set((state) => ({
          profiles: [...state.profiles, profile],
        })),
      
      updateProfile: (id, updates) =>
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p._id === id ? { ...p, ...updates } : p
          ),
        })),
      
      removeProfile: (id) =>
        set((state) => ({
          profiles: state.profiles.filter((p) => p._id !== id),
          selectedProfileId:
            state.selectedProfileId === id ? null : state.selectedProfileId,
        })),
      
      // Tab actions
      addTab: (profileId, tab) =>
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p._id === profileId
              ? { ...p, tabs: [...p.tabs, tab] }
              : p
          ),
        })),
      
      updateTab: (profileId, tabId, updates) =>
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p._id === profileId
              ? {
                  ...p,
                  tabs: p.tabs.map((t) =>
                    t.id === tabId ? { ...t, ...updates } : t
                  ),
                }
              : p
          ),
        })),
      
      removeTab: (profileId, tabId) =>
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p._id === profileId
              ? { ...p, tabs: p.tabs.filter((t) => t.id !== tabId) }
              : p
          ),
        })),
      
      reorderTabs: (profileId, tabs) =>
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p._id === profileId ? { ...p, tabs } : p
          ),
        })),
      
      // Reset
      logout: () => {
        localStorage.removeItem('token');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          profiles: [],
          selectedProfileId: null,
        });
      },
    }),
    {
      name: 'latex-proxy-storage',
      partialize: (state) => ({
        token: state.token,
        selectedProfileId: state.selectedProfileId,
        isSidebarOpen: state.isSidebarOpen,
      }),
    }
  )
);