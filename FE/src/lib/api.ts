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
  updateProfile: (data: any) => api.put('/auth/profile', data),
};

// ── Series API ──────────────────────────────────────
export const seriesAPI = {
  getAll: (params?: any) => api.get('/series', { params }),
  getById: (id: string) => api.get(`/series/${id}`),
  create: (data: any) => api.post('/series', data),
  update: (id: string, data: any) => api.put(`/series/${id}`, data),
  delete: (id: string) => api.delete(`/series/${id}`),
};

// ── Chapters API ────────────────────────────────────
export const chaptersAPI = {
  getBySeries: (seriesId: string) => api.get(`/chapters/series/${seriesId}`),
  create: (seriesId: string, data: any) => api.post(`/chapters/series/${seriesId}`, data),
  update: (id: string, data: any) => api.put(`/chapters/${id}`, data),
  updateStatus: (id: string, status: string) => api.patch(`/chapters/${id}/status`, { status }),
};

// ── Tasks API ───────────────────────────────────────
export const tasksAPI = {
  getAll: (params?: any) => api.get('/tasks', { params }),
  create: (data: any) => api.post('/tasks', data),
  accept: (id: string) => api.patch(`/tasks/${id}/accept`),
  updateStatus: (id: string, status: string) => api.patch(`/tasks/${id}/status`, { status }),
};

// ── Dashboard API ───────────────────────────────────
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getWorkflow: () => api.get('/dashboard/workflow'),
  getRankings: () => api.get('/dashboard/rankings'),
};
