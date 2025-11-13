// Content Filter types
export interface ContentFilter {
  id: string;
  pattern: string;
  replacement?: string | null; // null = block, string = replace
  caseSensitive: boolean;
  enabled: boolean;
  group?: string | null; // null = "General" group
  createdAt: string;
}

export interface FilterGroup {
  id: string;
  name: string;
  createdAt: string;
}

export interface LastRequestData {
  placeholders: LogPlaceholders;
  timestamp: string;
}

export interface AISuggestion {
  type: 'block' | 'replace';
  pattern: string;
  replacement?: string;
}

// User types
export interface User {
  _id: string;
  login: string;
  apiKey: string;
  activeProfileId?: string;
  profileOrder?: string[];
  isLoggingEnabled: boolean;
  globalProviderType?: ProviderType;
  globalProviders?: ProviderConfig;
  globalRequestParams?: Record<string, any>;
  contentFilters?: ContentFilter[];
  filterGroups?: FilterGroup[];
  lastRequestData?: LastRequestData;
  createdAt: string;
}

// Tab types
export interface Tab {
  id: string;
  role: 'system' | 'user';
  title: string;
  content: string;
  enabled: boolean;
  isPinned?: boolean;
}

// Provider types
export type ProviderType = 'gorouter' | 'openrouter' | 'aistudio' | 'custom';

export interface ProviderConfig {
  gorouter?: {
    apiKey: string;
    model: string;
    thinkingEnabled?: boolean;
    effort?: 'low' | 'medium' | 'high';
    provider?: 'Google' | 'Anthropic' | '';
  };
  openrouter?: {
    apiKey: string;
    model: string;
  };
  aistudio?: {
    apiKey: string;
    model: string;
  };
  custom?: {
    endpoint: string;
    apiKey: string;
    model: string;
  };
}

// Profile types
export interface Profile {
  _id: string;
  userId: string;
  name: string;
  tabs: Tab[];
  activeTabId?: string;
  useGlobalProvider?: boolean;
  providerType: ProviderType;
  providers: ProviderConfig;
  proxyEndpoint?: string;
  proxyApiKey?: string;
  model?: string;
  extraParams?: string;
  mergeConsecutiveRoles: boolean;
  createdAt: string;
  updatedAt: string;
}

// Log types
export interface LogUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface LogPlaceholders {
  user?: string;
  char?: string;
  bot_persona?: string;
  scenario?: string;
  user_persona?: string;
  summary?: string;
  lorebooks?: string;
  example_dialogs?: string;
}

export interface Log {
  _id: string;
  userId: string;
  profileId: string;
  statusCode: number;
  responseBody: any;
  usage?: LogUsage;
  placeholders?: LogPlaceholders;
  createdAt: string;
}

export interface LogsResponse {
  logs: Log[];
  totalPages: number;
  currentPage: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  msg?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ProfileResponse {
  profile: Profile;
}

export interface ProfilesResponse {
  profiles: Profile[];
}

export interface UserResponse {
  user: User;
}

// Model types for OpenRouter
export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
}