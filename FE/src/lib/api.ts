import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach JWT ─────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mangaflow-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: handle 401 ────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('mangaflow-token');
      localStorage.removeItem('mangaflow-user');
      // Optionally redirect to login
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    return Promise.reject(error);
  }
);

export default api;

// ── Auth API ────────────────────────────────────────
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; displayName: string; role?: string }) =>
    api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: unknown) => api.put('/auth/profile', data),
  search: (q: string, params?: Record<string, unknown>) => api.get('/auth/search', { params: { q, ...params } }),
  recommendAssistants: (params?: { skills?: string; limit?: number }) => api.get('/auth/assistants/recommend', { params }),
};

// ── Series API ──────────────────────────────────────
export const seriesAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/series', { params }),
  getById: (id: string) => api.get(`/series/${id}`),
  create: (data: FormData | unknown) => {
    if (data instanceof FormData) {
      return api.post('/series', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.post('/series', data);
  },
  update: (id: string, data: FormData | unknown) => {
    if (data instanceof FormData) {
      return api.put(`/series/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.put(`/series/${id}`, data);
  },
  delete: (id: string) => api.delete(`/series/${id}`),
  subscribe: (id: string) => api.post(`/series/${id}/subscribe`),
  // Approval workflow
  submitToEditor: (id: string) => api.patch(`/series/${id}/submit-to-editor`),
  getPendingReview: (params?: Record<string, unknown>) => api.get('/series/pending-review', { params }),
  getApprovalHistory: (id: string) => api.get(`/series/${id}/approval-history`),
  getEditors: () => api.get('/series/editors'),
  respondToHandshake: (id: string, action: 'accept' | 'decline') =>
    api.put(`/series/${id}/handshake`, { action }),
  // Dedicated Assistants
  getDedicatedAssistants: (seriesId: string) =>
    api.get(`/series/${seriesId}/dedicated-assistants`),
  addDedicatedAssistant: (seriesId: string, userId: string) =>
    api.post(`/series/${seriesId}/dedicated-assistants`, { userId }),
  removeDedicatedAssistant: (seriesId: string, userId: string) =>
    api.delete(`/series/${seriesId}/dedicated-assistants/${userId}`),
};

// ── Approval API ────────────────────────────────────
export const approvalAPI = {
  editorDecision: (seriesId: string, data: { decision: string; comments?: string; annotations?: unknown[] }) =>
    api.patch(`/series/${seriesId}/editor-decision`, data),
};

// ── Editorial Board API ─────────────────────────────
export const ebAPI = {
  getPending: () => api.get('/eb/pending'),
  getDashboard: () => api.get('/eb/dashboard'),
  castVote: (seriesId: string, data: { decision: string; comments?: string; rubric?: Record<string, number> }) =>
    api.post(`/eb/vote/${seriesId}`, data),
  makeFinalDecision: (seriesId: string, data: { decision: string; publicationSchedule?: string; comments?: string }) =>
    api.patch(`/eb/decision/${seriesId}`, data),
  inputReaderVotes: (seriesId: string, data: { weeklyVotes: number }) =>
    api.post(`/eb/reader-votes/${seriesId}`, data),
  cancelSeries: (seriesId: string, data: { reason: string }) =>
    api.patch(`/eb/cancel/${seriesId}`, data),
};

// ── Meeting API ─────────────────────────────────────
export const meetingAPI = {
  getAll: () => api.get('/meetings'),
  create: (data: { title: string; description?: string; dateTime: string; location?: string; seriesId?: string; participants: string[] }) =>
    api.post('/meetings', data),
  delete: (id: string) => api.delete(`/meetings/${id}`),
};

// ── Chapters API ────────────────────────────────────
export const chaptersAPI = {
  getBySeries: (seriesId: string) => api.get(`/chapters/series/${seriesId}`),
  getById: (id: string) => api.get(`/chapters/${id}`),
  create: (seriesId: string, data: unknown) => api.post(`/chapters/series/${seriesId}`, data),
  update: (id: string, data: unknown) => api.put(`/chapters/${id}`, data),
  delete: (id: string) => api.delete(`/chapters/${id}`),
  updateStatus: (id: string, status: string) => api.patch(`/chapters/${id}/status`, { status }),
  submitForReview: (chapterId: string, selectedLayers: { pageId: string; taskIds: string[] }[]) =>
    api.post(`/chapters/${chapterId}/submit-review`, { selectedLayers }),
  shareAccess: (id: string, data: { userId: string; role?: string; canEdit?: boolean; canComment?: boolean; canInvite?: boolean }) =>
    api.post(`/chapters/${id}/access`, data),
  removeAccess: (id: string, userId: string) => api.delete(`/chapters/${id}/access/${userId}`),
  incrementView: (id: string) => api.post(`/chapters/${id}/view`),
};

// ── Tasks API ───────────────────────────────────────
export const tasksAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/tasks', { params }),
  getById: (id: string) => api.get(`/tasks/${id}`),
  create: (data: unknown) => api.post('/tasks', data),
  update: (id: string, data: unknown) => api.put(`/tasks/${id}`, data),
  accept: (id: string) => api.patch(`/tasks/${id}/accept`),
  decline: (id: string) => api.patch(`/tasks/${id}/decline`),
  cancel: (id: string) => api.delete(`/tasks/${id}`),
  updateStatus: (id: string, status: string) => api.patch(`/tasks/${id}/status`, { status }),
  submit: (id: string, formData: FormData) =>
    api.post(`/tasks/${id}/submit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// ── Dashboard API ───────────────────────────────────
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getWorkflow: (page?: number, limit?: number) => api.get('/dashboard/workflow', { params: { page, limit } }),
  getRankings: (sortBy?: string) => api.get('/dashboard/rankings', { params: { sortBy } }),
  getActivity: () => api.get('/dashboard/activity'),
  getTeamOverview: () => api.get('/dashboard/team'),
  getReaderData: () => api.get('/dashboard/reader'),
};

// ── Pages API ───────────────────────────────────────
export const pagesAPI = {
  getByChapter: (chapterId: string) => api.get(`/pages/chapter/${chapterId}`),
  upload: (chapterId: string, formData: FormData) =>
    api.post(`/pages/chapter/${chapterId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: string) => api.delete(`/pages/${id}`),
  updateLayerOrder: (pageId: string, layerOrder: { taskId: string; position: number }[]) =>
    api.patch(`/pages/${pageId}/layer-order`, { layerOrder }),
  downloadLayer: (pageId: string, taskId: string, asPng = false) =>
    api.get(`/pages/${pageId}/download-layer/${taskId}${asPng ? '?png=true' : ''}`, { responseType: 'blob' }),
};

// ── Zones API ───────────────────────────────────────
export const zonesAPI = {
  getByPage: (pageId: string) => api.get(`/zones/page/${pageId}`),
  create: (pageId: string, data: unknown) => api.post(`/zones/page/${pageId}`, data),
  update: (id: string, data: unknown) => api.put(`/zones/${id}`, data),
  delete: (id: string) => api.delete(`/zones/${id}`),
};

// ── Comments API ────────────────────────────────────
export const commentsAPI = {
  getByChapter: (chapterId: string, params?: Record<string, unknown>) => api.get(`/chapters/${chapterId}/comments`, { params }),
  create: (chapterId: string, data: unknown) => api.post(`/chapters/${chapterId}/comments`, data),
  like: (commentId: string) => api.post(`/comments/${commentId}/like`),
};

// ── Votes API ───────────────────────────────────────
export const votesAPI = {
  getByChapter: (chapterId: string) => api.get(`/chapters/${chapterId}/votes`),
  vote: (chapterId: string, data: unknown) => api.post(`/chapters/${chapterId}/vote`, data),
};

// ── Notifications API ───────────────────────────────
export const notificationsAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/notifications', { params }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};



// ── Annotations API ─────────────────────────────────
export const annotationsAPI = {
  getByChapter: (chapterId: string, source?: 'review' | 'tracking') =>
    api.get(`/annotations/chapter/${chapterId}${source ? `?source=${source}` : ''}`),
  create: (data: { chapterId: string; pageId: string; x: number; y: number; note: string; source?: 'review' | 'tracking' }) =>
    api.post('/annotations', data),
  resolve: (id: string) => api.patch(`/annotations/${id}/resolve`),
  delete: (id: string) => api.delete(`/annotations/${id}`),
};

// ── Editor Analytics API ────────────────────────────
export const editorAPI = {
  getPortfolio: () => api.get('/editor/portfolio'),
  getPendingChapters: () => api.get('/editor/pending-chapters'),
  getMilestones: (seriesId: string) => api.get(`/editor/milestones/${seriesId}`),
  getWarnings: () => api.get('/editor/warnings'),
  getAnalytics: (mangakaId: string) => api.get(`/editor/analytics/${mangakaId}`),
};

// ── Upload API ──────────────────────────────────────
export const uploadAPI = {
  uploadFile: (file: File, folder?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) formData.append('folder', folder);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};


