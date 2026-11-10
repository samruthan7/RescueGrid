import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach appropriate JWT token automatically
api.interceptors.request.use((config) => {
  // Authority Admin routes use authority token
  if (config.url && config.url.startsWith('/admin')) {
    const adminToken = localStorage.getItem('rescuegrid_auth_token');
    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    }
  } else {
    // Citizen routes and protected reporting use citizen token
    const citizenToken = localStorage.getItem('rescuegrid_citizen_token');
    if (citizenToken) {
      config.headers.Authorization = `Bearer ${citizenToken}`;
    }
  }
  return config;
});

// Intercept 401s to handle session expiration gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Authority session expired
      if (window.location.pathname.startsWith('/authority') && window.location.pathname !== '/authority/login') {
        localStorage.removeItem('rescuegrid_auth_token');
        localStorage.removeItem('rescuegrid_auth_user');
        window.location.href = '/authority/login?sessionExpired=true';
      }
      // Citizen session expired
      if (window.location.pathname.startsWith('/citizen') && window.location.pathname !== '/citizen/login') {
        localStorage.removeItem('rescuegrid_citizen_token');
        localStorage.removeItem('rescuegrid_citizen_user');
        window.location.href = `/citizen/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
    }
    return Promise.reject(error);
  }
);

// Authority Auth storage helpers
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

// Citizen Auth storage helpers (strictly isolated from authority)
export const citizenAuthService = {
  getToken: () => localStorage.getItem('rescuegrid_citizen_token'),
  getUser: () => {
    try {
      const u = localStorage.getItem('rescuegrid_citizen_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },
  setAuth: (token, citizen) => {
    localStorage.setItem('rescuegrid_citizen_token', token);
    localStorage.setItem('rescuegrid_citizen_user', JSON.stringify(citizen));
  },
  clearAuth: () => {
    localStorage.removeItem('rescuegrid_citizen_token');
    localStorage.removeItem('rescuegrid_citizen_user');
  },
  isAuthenticated: () => {
    return !!localStorage.getItem('rescuegrid_citizen_token');
  }
};

// Citizen API calls
export const citizenApi = {
  login: async (name, phone) => {
    const res = await api.post('/citizen/login', { name, phone });
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/citizen/me');
    return res.data;
  },
  getMyIncidents: async () => {
    const res = await api.get('/citizen/incidents');
    return res.data;
  }
};

// Incident API calls
export const incidentApi = {
  // Public & Citizen Reporting
  submitIncident: async (payload) => {
    const res = await api.post('/incidents', payload);
    return res.data;
  },
  trackIncident: async (id) => {
    const res = await api.get(`/incidents/${id}`);
    return res.data;
  },
  getPublicMap: async () => {
    const res = await api.get('/incidents/public-map');
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

// Hotspot API calls
export const hotspotApi = {
  getAll: async () => {
    const res = await api.get('/admin/hotspots');
    return res.data;
  },
  updateStatus: async (id, status) => {
    const res = await api.patch(`/admin/hotspots/${id}`, { status });
    return res.data;
  },
  getNearby: async (lat, lng, radius = 1000) => {
    const res = await api.get(`/hotspots/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
    return res.data;
  }
};

// AI Assistant API calls
export const assistantApi = {
  citizenChat: async (message, history = []) => {
    const res = await api.post('/citizen/assistant/chat', { message, history });
    return res.data;
  },
  authorityChat: async (message, history = []) => {
    const res = await api.post('/admin/assistant/chat', { message, history });
    return res.data;
  }
};

// Analytics API calls
export const analyticsApi = {
  getAnalytics: async () => {
    const res = await api.get('/admin/analytics');
    return res.data;
  },
  exportCsv: async (includeContact = false) => {
    const res = await api.get(`/admin/export/csv?includeContact=${includeContact}`, {
      responseType: 'blob'
    });
    return res.data;
  },
  getVideoUrl: async (id) => {
    const res = await api.get(`/admin/incidents/${id}/video-url`);
    return res.data;
  }
};

export default api;
