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
};

// ── Series API ──────────────────────────────────────
export const seriesAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/series', { params }),
  getById: (id: string) => api.get(`/series/${id}`),
  create: (data: FormData | Record<string, unknown>) => api.post('/series', data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined),
  submit: (id: string, data?: Record<string, unknown>) => api.post(`/series/${id}/submit`, data || {}),
  review: (id: string, data: Record<string, unknown>) => api.patch(`/series/${id}/review`, data),
  update: (id: string, data: FormData | Record<string, unknown>) => api.put(`/series/${id}`, data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined),
  delete: (id: string) => api.delete(`/series/${id}`),
};

// ── Chapters API ────────────────────────────────────
export const chaptersAPI = {
  getBySeries: (seriesId: string) => api.get(`/chapters/series/${seriesId}`),
  create: (seriesId: string, data: unknown) => api.post(`/chapters/series/${seriesId}`, data),
  update: (id: string, data: unknown) => api.put(`/chapters/${id}`, data),
  delete: (id: string) => api.delete(`/chapters/${id}`),
  updateStatus: (id: string, status: string) => api.patch(`/chapters/${id}/status`, { status }),
};

// ── Tasks API ───────────────────────────────────────
export const tasksAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/tasks', { params }),
  getById: (id: string) => api.get(`/tasks/${id}`),
  create: (data: unknown) => api.post('/tasks', data),
  update: (id: string, data: unknown) => api.put(`/tasks/${id}`, data),
  accept: (id: string) => api.patch(`/tasks/${id}/accept`),
  updateStatus: (id: string, status: string) => api.patch(`/tasks/${id}/status`, { status }),
  submit: (id: string, formData: FormData) =>
    api.post(`/tasks/${id}/submit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// ── Dashboard API ───────────────────────────────────
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getWorkflow: () => api.get('/dashboard/workflow'),
  getRankings: () => api.get('/dashboard/rankings'),
};

// ── Pages API ───────────────────────────────────────
export const pagesAPI = {
  getByChapter: (chapterId: string) => api.get(`/pages/chapter/${chapterId}`),
  upload: (chapterId: string, formData: FormData) =>
    api.post(`/pages/chapter/${chapterId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: string) => api.delete(`/pages/${id}`),
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

