import type {
  AuthResponse,
  ProfileResponse,
  ProfilesResponse,
  UserResponse,
  LogsResponse,
  Profile,
  Tab,
  ContentFilter,
  FilterGroup,
  LastRequestData,
  AISuggestion,
  WorkshopListResponse,
  WorkshopDetailResponse,
  WorkshopImportResponse,
  WorkshopProfile as WorkshopProfileType,
  WorkshopVersion as WorkshopVersionType,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

class ApiClient {
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.msg || 'API request failed');
      } catch (e) {
        throw new Error(errorText || 'API request failed');
      }
    }

    if (
      response.status === 204 ||
      (response.status === 200 &&
        response.headers.get('content-length') === '0')
    ) {
      return null as T;
    }

    return response.json();
  }

  // Auth endpoints
  async login(login: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    });
  }

  async register(login: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    });
  }

  // User endpoints
  async getUser(): Promise<UserResponse> {
    return this.request<UserResponse>('/api/users/me');
  }

  async updateUserLogging(isLoggingEnabled: boolean): Promise<void> {
    return this.request<void>('/api/users/me/logging', {
      method: 'PUT',
      body: JSON.stringify({ isLoggingEnabled }),
    });
  }

  async updateActiveProfile(profileId: string): Promise<{ activeProfileId: string }> {
    return this.request<{ activeProfileId: string }>('/api/users/me/active-profile', {
      method: 'PUT',
      body: JSON.stringify({ profileId }),
    });
  }

  async updateProfileOrder(profileOrder: string[]): Promise<void> {
    return this.request<void>('/api/users/me/profile-order', {
      method: 'PUT',
      body: JSON.stringify({ profileOrder }),
    });
  }

  async updateGlobalProvider(data: {
    globalProviderType?: string;
    globalProviders?: any;
  }): Promise<any> {
    return this.request<any>('/api/users/me/global-provider', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Profile endpoints
  async getProfiles(): Promise<ProfilesResponse> {
    return this.request<ProfilesResponse>('/api/profiles');
  }

  async createProfile(data: Partial<Profile>): Promise<ProfileResponse> {
    return this.request<ProfileResponse>('/api/profiles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProfile(
    id: string,
    data: Partial<Profile>
  ): Promise<ProfileResponse> {
    return this.request<ProfileResponse>(`/api/profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProfile(id: string): Promise<void> {
    return this.request<void>(`/api/profiles/${id}`, {
      method: 'DELETE',
    });
  }

  async cloneProfile(id: string): Promise<ProfileResponse> {
    return this.request<ProfileResponse>(`/api/profiles/${id}/clone`, {
      method: 'POST',
    });
  }

  // Tab endpoints
  async createTab(profileId: string, tab: Partial<Tab>): Promise<{ tab: Tab }> {
    return this.request<{ tab: Tab }>(`/api/profiles/${profileId}/tabs`, {
      method: 'POST',
      body: JSON.stringify(tab),
    });
  }

  async updateTab(
    profileId: string,
    tabId: string,
    data: Partial<Tab>
  ): Promise<{ tab: Tab }> {
    return this.request<{ tab: Tab }>(
      `/api/profiles/${profileId}/tabs/${tabId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  }

  async deleteTab(profileId: string, tabId: string): Promise<void> {
    return this.request<void>(`/api/profiles/${profileId}/tabs/${tabId}`, {
      method: 'DELETE',
    });
  }

  async moveTabs(profileId: string, tabs: Tab[]): Promise<{ tabs: Tab[] }> {
    return this.request<{ tabs: Tab[] }>(
      `/api/profiles/${profileId}/tabs/move`,
      {
        method: 'PUT',
        body: JSON.stringify({ tabs }),
      }
    );
  }

  // Logs endpoints
  async getLogs(page: number = 1): Promise<LogsResponse> {
    return this.request<LogsResponse>(`/api/logs?page=${page}`);
  }

  // Content Filters endpoints
  async getContentFilters(): Promise<{
    contentFilters: ContentFilter[];
    filterGroups: FilterGroup[];
    lastRequestData: LastRequestData | null;
  }> {
    return this.request<{
      contentFilters: ContentFilter[];
      filterGroups: FilterGroup[];
      lastRequestData: LastRequestData | null;
    }>('/api/users/me/content-filters');
  }

  async createContentFilter(data: {
    pattern: string;
    replacement?: string | null;
    caseSensitive?: boolean;
    group?: string | null;
  }): Promise<{ filter: ContentFilter }> {
    return this.request<{ filter: ContentFilter }>(
      '/api/users/me/content-filters',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async createContentFiltersBulk(filters: Array<{
    pattern: string;
    replacement?: string | null;
    caseSensitive?: boolean;
    group?: string | null;
  }>): Promise<{ filters: ContentFilter[] }> {
    return this.request<{ filters: ContentFilter[] }>(
      '/api/users/me/content-filters/bulk',
      {
        method: 'POST',
        body: JSON.stringify({ filters }),
      }
    );
  }

  async toggleGroupFilters(group: string, enabled: boolean): Promise<{ count: number }> {
    return this.request<{ count: number }>(
      '/api/users/me/content-filters/group/toggle',
      {
        method: 'PUT',
        body: JSON.stringify({ group, enabled }),
      }
    );
  }

  async deleteGroupFilters(group: string): Promise<{ count: number }> {
    return this.request<{ count: number }>(
      `/api/users/me/content-filters/group/${encodeURIComponent(group)}`,
      {
        method: 'DELETE',
      }
    );
  }

  async updateContentFilter(
    filterId: string,
    data: Partial<ContentFilter>
  ): Promise<{ filter: ContentFilter }> {
    return this.request<{ filter: ContentFilter }>(
      `/api/users/me/content-filters/${filterId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  }

  async deleteContentFilter(filterId: string): Promise<void> {
    return this.request<void>(`/api/users/me/content-filters/${filterId}`, {
      method: 'DELETE',
    });
  }

  async renameFilterGroup(groupId: string, name: string): Promise<{ group: FilterGroup }> {
    return this.request<{ group: FilterGroup }>(
      `/api/users/me/filter-groups/${encodeURIComponent(groupId)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ name }),
      }
    );
  }

  async analyzePrompt(question: string): Promise<{
    analysis: string;
    suggestions: AISuggestion[];
    usage?: any;
  }> {
    return this.request<{
      analysis: string;
      suggestions: AISuggestion[];
      usage?: any;
    }>('/api/users/me/analyze-prompt', {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  }
  // ===== Workshop (Catalog) =====

  async getWorkshopList(
    q: string = '',
    page: number = 1,
    limit: number = 20,
    visibility?: 'public' | 'hidden' | 'deleted'
  ): Promise<WorkshopListResponse> {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));
    if (visibility) params.set('visibility', visibility);
    const qs = params.toString();
    return this.request<WorkshopListResponse>(`/api/workshop${qs ? `?${qs}` : ''}`);
  }

  async getWorkshopDetail(
    id: string,
    options?: { includeAllVersions?: boolean; versionsLimit?: number }
  ): Promise<WorkshopDetailResponse> {
    const params = new URLSearchParams();
    if (options?.includeAllVersions) params.set('includeAllVersions', 'true');
    if (options?.versionsLimit) params.set('versionsLimit', String(options.versionsLimit));
    const qs = params.toString();
    return this.request<WorkshopDetailResponse>(`/api/workshop/${id}${qs ? `?${qs}` : ''}`);
  }

  async publishWorkshop(payload: {
    profileId: string;
    title: string;
    description?: string;
    preferredModels?: string[];
    preferredProviderType?: string; // advisory
    includeAllTabs?: boolean;       // user can choose all vs enabled only
  }): Promise<{ profile: WorkshopProfileType; version: WorkshopVersionType }> {
    return this.request<{ profile: WorkshopProfileType; version: WorkshopVersionType }>(
      `/api/workshop/publish`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async updateWorkshop(
    id: string,
    payload: {
      profileId: string;
      changelog: string;
      title?: string;
      description?: string;
      preferredModels?: string[];
      preferredProviderType?: string;
      includeAllTabs?: boolean;
    }
  ): Promise<{ profile: WorkshopProfileType; version: WorkshopVersionType }> {
    return this.request<{ profile: WorkshopProfileType; version: WorkshopVersionType }>(
      `/api/workshop/${id}/update`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );
  }

  async importWorkshop(
    id: string,
    mode: 'link' | 'copy' = 'copy'
  ): Promise<WorkshopImportResponse> {
    return this.request<WorkshopImportResponse>(`/api/workshop/${id}/import`, {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
  }

  // Sync linked profile with latest Workshop version
  async syncLinkedProfile(profileId: string): Promise<ProfileResponse> {
    return this.request<ProfileResponse>(`/api/workshop/sync-linked/${profileId}`, {
      method: 'POST',
    });
  }

  // Admin: Hide/Unhide Workshop profile
  async hideWorkshopProfile(id: string): Promise<{ profile: WorkshopProfileType }> {
    return this.request<{ profile: WorkshopProfileType }>(`/api/workshop/${id}/hide`, {
      method: 'POST',
    });
  }

  async unhideWorkshopProfile(id: string): Promise<{ profile: WorkshopProfileType }> {
    return this.request<{ profile: WorkshopProfileType }>(`/api/workshop/${id}/unhide`, {
      method: 'POST',
    });
  }

  // Admin: Delete Workshop profile (soft delete)
  async deleteWorkshopProfile(id: string): Promise<void> {
    return this.request<void>(`/api/workshop/${id}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();