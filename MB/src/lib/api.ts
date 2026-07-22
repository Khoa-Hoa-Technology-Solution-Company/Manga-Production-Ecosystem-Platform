import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Base URL ────────────────────────────────────────
// On physical devices, set EXPO_PUBLIC_API_BASE_URL in .env to your machine's local IP
// e.g. EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:3000
const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.0.2.2:3000';
const API_BASE_URL = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

const STORAGE_TOKEN_KEY = 'mangaflow-token';

// ── Token helpers ───────────────────────────────────
let cachedToken: string | null = null;

export async function getToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  cachedToken = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
  return cachedToken;
}

export async function setToken(token: string): Promise<void> {
  cachedToken = token;
  await AsyncStorage.setItem(STORAGE_TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  cachedToken = null;
  await AsyncStorage.removeItem(STORAGE_TOKEN_KEY);
}

let unauthorizedCallback: (() => void) | null = null;

export function setUnauthorizedCallback(cb: () => void) {
  unauthorizedCallback = cb;
}

// ── Core fetch wrapper ──────────────────────────────
type FetchOptions = {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  isFormData?: boolean;
};

async function apiFetch<T = any>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, isFormData = false } = options;
  const token = await getToken();

  const reqHeaders: Record<string, string> = {
    ...headers,
  };

  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  if (!isFormData) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s connection timeout

  const config: RequestInit = {
    method,
    headers: reqHeaders,
    signal: controller.signal,
  };

  if (body) {
    config.body = isFormData ? body : JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api${path}`, config);
    clearTimeout(timeoutId);
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('Fetch network error:', error);
    throw {
      status: 0,
      message: `Không thể kết nối đến máy chủ (${API_BASE_URL}). Vui lòng kiểm tra địa chỉ EXPO_PUBLIC_API_BASE_URL trong file MB/.env hoặc kết nối mạng của bạn.`,
      response: { data: { error: 'Lỗi kết nối mạng nội bộ' }, status: 0 },
    };
  }

  let text = '';
  try {
    text = await response.text();
  } catch {
    // Ignore stream reading errors
  }

  let responseData: any = {};
  if (text) {
    try {
      responseData = JSON.parse(text);
    } catch {
      // Not valid JSON
    }
  }

  if (response.status === 401) {
    // Token expired or invalid — clear cached auth
    await clearToken();
    await AsyncStorage.removeItem('mangaflow-user');
    unauthorizedCallback?.();
  }

  if (!response.ok) {
    throw {
      status: response.status,
      message: responseData.error || `Yêu cầu thất bại với mã trạng thái ${response.status}`,
      response: { data: responseData, status: response.status },
    };
  }

  return responseData;
}

// ── Auth API ────────────────────────────────────────
export const authAPI = {
  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  register: (data: {
    email: string;
    password: string;
    displayName: string;
    role?: string;
  }) =>
    apiFetch<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: data,
    }),

  getMe: () => apiFetch<{ user: any }>('/auth/me'),

  updateProfile: (data: any) =>
    apiFetch<{ user: any }>('/auth/profile', { method: 'PUT', body: data }),

  search: (q: string) => 
    apiFetch<{ users: any[] }>(`/auth/search?q=${encodeURIComponent(q)}`),
};

// ── Series API ──────────────────────────────────────
export const seriesAPI = {
  getAll: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<{ series: any[]; total: number }>(`/series${qs}`);
  },

  getById: (id: string) => apiFetch<{ series: any }>(`/series/${id}`),

  create: (data: any) =>
    apiFetch<{ series: any }>('/series', { method: 'POST', body: data }),

  update: (id: string, data: any) =>
    apiFetch<{ series: any }>(`/series/${id}`, { method: 'PUT', body: data }),

  submitToEditor: (id: string) =>
    apiFetch<{ series: any }>(`/series/${id}/submit`, { method: 'POST' }),

  assignEditor: (id: string, editorId: string) =>
    apiFetch<{ series: any }>(`/series/${id}/editor-assignment`, { method: 'POST', body: { editorId } }),

  respondToHandshake: (id: string, action: 'accept' | 'decline') =>
    apiFetch<{ series: any }>(`/series/${id}/handshake`, { method: 'PUT', body: { action } }),

  editorDecision: (id: string, decision: 'approve' | 'request_changes', comments?: string) =>
    apiFetch<{ series: any }>(`/series/${id}/editor-decision`, { method: 'PATCH', body: { decision, comments } }),

  delete: (id: string) =>
    apiFetch(`/series/${id}`, { method: 'DELETE' }),

  subscribe: (id: string) =>
    apiFetch<{ series: any; subscribed: boolean }>(`/series/${id}/subscribe`, { method: 'POST' }),

  getEditors: () => apiFetch<{ editors: any[] }>('/series/editors'),

  getDedicatedAssistants: (seriesId: string) =>
    apiFetch<{ dedicatedAssistants: any[] }>(`/series/${seriesId}/dedicated-assistants`),

  addDedicatedAssistant: (seriesId: string, userId: string) =>
    apiFetch<{ dedicatedAssistants: any[] }>(`/series/${seriesId}/dedicated-assistants`, {
      method: 'POST',
      body: { userId },
    }),

  removeDedicatedAssistant: (seriesId: string, userId: string) =>
    apiFetch(`/series/${seriesId}/dedicated-assistants/${userId}`, { method: 'DELETE' }),
};

// ── Chapters API ────────────────────────────────────
export const chaptersAPI = {
  getBySeries: (seriesId: string) =>
    apiFetch<{ chapters: any[] }>(`/chapters/series/${seriesId}`),

  getById: (id: string) =>
    apiFetch<{ chapter: any }>(`/chapters/${id}`),

  incrementView: (id: string) =>
    apiFetch<{ message: string }>(`/chapters/${id}/view`, { method: 'POST' }),

  create: (seriesId: string, data: any) =>
    apiFetch<{ chapter: any }>(`/chapters/series/${seriesId}`, {
      method: 'POST',
      body: data,
    }),

  update: (id: string, data: any) =>
    apiFetch<{ chapter: any }>(`/chapters/${id}`, { method: 'PUT', body: data }),

  updateStatus: (id: string, status: string) =>
    apiFetch<{ chapter: any }>(`/chapters/${id}/status`, {
      method: 'PATCH',
      body: { status },
    }),

  submitForReview: (id: string) =>
    apiFetch<{ chapter: any; message: string }>(`/chapters/${id}/submit-review`, {
      method: 'POST',
      body: { selectedLayers: [] },
    }),

  delete: (id: string) =>
    apiFetch(`/chapters/${id}`, { method: 'DELETE' }),
};

// ── Tasks API ───────────────────────────────────────
export const tasksAPI = {
  getAll: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<{ tasks: any[]; total: number }>(`/tasks${qs}`);
  },

  getById: (id: string) => apiFetch<{ task: any }>(`/tasks/${id}`),

  create: (data: any) =>
    apiFetch<{ task: any }>('/tasks', { method: 'POST', body: data }),

  update: (id: string, data: any) =>
    apiFetch<{ task: any }>(`/tasks/${id}`, { method: 'PUT', body: data }),

  accept: (id: string) =>
    apiFetch<{ task: any; message: string }>(`/tasks/${id}/accept`, {
      method: 'PATCH',
    }),

  updateStatus: (id: string, status: string) =>
    apiFetch<{ task: any }>(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: { status },
    }),

  submit: (id: string, formData: FormData) =>
    apiFetch<{ task: any; message: string }>(`/tasks/${id}/submit`, {
      method: 'POST',
      body: formData,
      isFormData: true,
    }),
};

// ── Dashboard API ───────────────────────────────────
export const dashboardAPI = {
  getStats: () => apiFetch<{ stats: any }>('/dashboard/stats'),
  getWorkflow: () => apiFetch<{ workflow: any }>('/dashboard/workflow'),
  getRankings: (sortBy?: string) => {
    const qs = sortBy ? `?sortBy=${sortBy}` : '';
    return apiFetch<{ rankings: any[] }>(`/dashboard/rankings${qs}`);
  },
};

// ── Pages API ───────────────────────────────────────
export const pagesAPI = {
  getByChapter: (chapterId: string) =>
    apiFetch<{ pages: any[] }>(`/pages/chapter/${chapterId}`),

  upload: (chapterId: string, formData: FormData) =>
    apiFetch<{ page: any }>(`/pages/chapter/${chapterId}`, {
      method: 'POST',
      body: formData,
      isFormData: true,
    }),

  delete: (id: string) => apiFetch(`/pages/${id}`, { method: 'DELETE' }),
};

// ── Zones API ───────────────────────────────────────
export const zonesAPI = {
  getByPage: (pageId: string) =>
    apiFetch<{ zones: any[] }>(`/zones/page/${pageId}`),

  create: (pageId: string, data: any) =>
    apiFetch<{ zone: any }>(`/zones/page/${pageId}`, {
      method: 'POST',
      body: data,
    }),

  update: (id: string, data: any) =>
    apiFetch<{ zone: any }>(`/zones/${id}`, { method: 'PUT', body: data }),

  delete: (id: string) => apiFetch(`/zones/${id}`, { method: 'DELETE' }),
};

// ── Comments API ────────────────────────────────────
export const commentsAPI = {
  getByChapter: (chapterId: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<{ comments: any[] }>(
      `/chapters/${chapterId}/comments${qs}`
    );
  },

  create: (chapterId: string, data: { text: string; parentId?: string }) =>
    apiFetch<{ comment: any }>(`/chapters/${chapterId}/comments`, {
      method: 'POST',
      body: data,
    }),

  like: (commentId: string) =>
    apiFetch(`/comments/${commentId}/like`, { method: 'POST' }),
};

// ── Votes API ───────────────────────────────────────
export const votesAPI = {
  getByChapter: (chapterId: string) =>
    apiFetch<{ votes: any }>(`/chapters/${chapterId}/votes`),

  vote: (chapterId: string, data: any) =>
    apiFetch(`/chapters/${chapterId}/vote`, { method: 'POST', body: data }),
};

// ── Notifications API ───────────────────────────────
export const notificationsAPI = {
  getAll: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<{ notifications: any[]; unread: number }>(`/notifications${qs}`);
  },

  markRead: (id: string) =>
    apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }),

  markAllRead: () =>
    apiFetch('/notifications/read-all', { method: 'PATCH' }),
};



// ── Annotations API ─────────────────────────────────
export const annotationsAPI = {
  getByChapter: (chapterId: string, source?: 'review' | 'tracking') =>
    apiFetch<{ annotations: any[] }>(`/annotations/chapter/${chapterId}${source ? `?source=${source}` : ''}`),
  create: (data: { chapterId: string; pageId: string; x: number; y: number; note: string; source?: 'review' | 'tracking' }) =>
    apiFetch<{ annotation: any }>('/annotations', { method: 'POST', body: data }),
  resolve: (id: string) => apiFetch(`/annotations/${id}/resolve`, { method: 'PATCH' }),
  delete: (id: string) => apiFetch(`/annotations/${id}`, { method: 'DELETE' }),
};

export const editorAPI = {
  getPortfolio: () => apiFetch<{ portfolio: any[]; invites: any[] }>('/editor/portfolio'),
  getMilestones: (seriesId: string) => apiFetch<{ milestones: any[] }>(`/editor/milestones/${seriesId}`),
  getWarnings: () => apiFetch<{ warnings: any[] }>('/editor/warnings'),
  getAnalytics: (mangakaId: string) => apiFetch<{ analytics: any }>(`/editor/analytics/${mangakaId}`),
};

// ── Editorial Board API ─────────────────────────────
export const ebAPI = {
  getPending: () => apiFetch<{ series: any[] }>('/eb/pending'),
  getDashboard: () => apiFetch<{ dashboard: any }>('/eb/dashboard'),
  castVote: (seriesId: string, data: { decision: string; comments?: string; rubric?: Record<string, number> }) =>
    apiFetch(`/eb/vote/${seriesId}`, { method: 'POST', body: data }),
  makeFinalDecision: (seriesId: string, data: { decision: string; publicationSchedule?: string; comments?: string }) =>
    apiFetch(`/eb/decision/${seriesId}`, { method: 'PATCH', body: data }),
  inputReaderVotes: (seriesId: string, data: { weeklyVotes: number }) =>
    apiFetch(`/eb/reader-votes/${seriesId}`, { method: 'POST', body: data }),
  cancelSeries: (seriesId: string, data: { reason: string }) =>
    apiFetch(`/eb/cancel/${seriesId}`, { method: 'PATCH', body: data }),
};

// ── Helpers ─────────────────────────────────────────
export function getImageUrl(path?: string): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path}`;
}
