import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token automatically for protected admin endpoints
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rescuegrid_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept 401s to handle session expiration gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (window.location.pathname.startsWith('/authority') && window.location.pathname !== '/authority/login') {
        localStorage.removeItem('rescuegrid_auth_token');
        localStorage.removeItem('rescuegrid_auth_user');
        window.location.href = '/authority/login?sessionExpired=true';
      }
    }
    return Promise.reject(error);
  }
);

// Auth storage helpers
export const authService = {
  getToken: () => localStorage.getItem('rescuegrid_auth_token'),
  getUser: () => {
    try {
      const u = localStorage.getItem('rescuegrid_auth_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },
  setAuth: (token, user) => {
    localStorage.setItem('rescuegrid_auth_token', token);
    localStorage.setItem('rescuegrid_auth_user', JSON.stringify(user));
  },
  clearAuth: () => {
    localStorage.removeItem('rescuegrid_auth_token');
    localStorage.removeItem('rescuegrid_auth_user');
  },
  isAuthenticated: () => {
    return !!localStorage.getItem('rescuegrid_auth_token');
  }
};

// API calls
export const incidentApi = {
  // Public
  submitIncident: async (payload) => {
    const res = await api.post('/incidents', payload);
    return res.data;
  },
  trackIncident: async (id) => {
    const res = await api.get(`/incidents/${id}`);
    return res.data;
  },

  // Authority Admin
  login: async (username, password) => {
    const res = await api.post('/admin/login', { username, password });
    return res.data;
  },
  getIncidents: async (filters = {}) => {
    const query = new URLSearchParams();
    if (filters.search) query.append('search', filters.search);
    if (filters.category && filters.category !== 'All') query.append('category', filters.category);
    if (filters.severity && filters.severity !== 'All') query.append('severity', filters.severity);
    if (filters.status && filters.status !== 'All') query.append('status', filters.status);
    if (filters.sort) query.append('sort', filters.sort);

    const res = await api.get(`/admin/incidents?${query.toString()}`);
    return res.data;
  },
  getIncidentById: async (id) => {
    const res = await api.get(`/admin/incidents/${id}`);
    return res.data;
  },
  getStats: async () => {
    const res = await api.get('/admin/stats');
    return res.data;
  },
  updateStatus: async (id, status, note) => {
    const res = await api.patch(`/admin/incidents/${id}/status`, { status, note });
    return res.data;
  },
  overrideSeverity: async (id, severityOverride, reason) => {
    const res = await api.patch(`/admin/incidents/${id}/severity`, { severityOverride, reason });
    return res.data;
  },
  deleteIncident: async (id) => {
    const res = await api.delete(`/admin/incidents/${id}`);
    return res.data;
  }
};

export default api;
