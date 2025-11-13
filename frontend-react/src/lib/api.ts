import type {
  AuthResponse,
  ProfileResponse,
  ProfilesResponse,
  UserResponse,
  LogsResponse,
  Profile,
  Tab,
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
}

export const api = new ApiClient();