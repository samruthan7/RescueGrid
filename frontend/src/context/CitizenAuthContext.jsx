import React, { createContext, useContext, useState, useEffect } from 'react';
import { citizenAuthService, citizenApi } from '../services/api';

const CitizenAuthContext = createContext(null);

export function CitizenAuthProvider({ children }) {
  const [citizen, setCitizen] = useState(() => citizenAuthService.getUser());
  const [token, setToken] = useState(() => citizenAuthService.getToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verify session token on initial mount if available
    const existingToken = citizenAuthService.getToken();
    if (existingToken) {
      citizenApi.getMe()
        .then((res) => {
          if (res?.citizen) {
            setCitizen(res.citizen);
            citizenAuthService.setAuth(existingToken, res.citizen);
          }
        })
        .catch(() => {
          // Token expired or invalid
          citizenAuthService.clearAuth();
          setCitizen(null);
          setToken(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (name, phone) => {
    const res = await citizenApi.login(name, phone);
    if (res && res.token && res.citizen) {
      citizenAuthService.setAuth(res.token, res.citizen);
      setCitizen(res.citizen);
      setToken(res.token);
      return res.citizen;
    }
    throw new Error('Invalid response from citizen login service');
  };

  const logout = () => {
    citizenAuthService.clearAuth();
    setCitizen(null);
    setToken(null);
  };

  const value = {
    citizen,
    token,
    isAuthenticated: !!token && !!citizen,
    loading,
    login,
    logout
  };

  return (
    <CitizenAuthContext.Provider value={value}>
      {children}
    </CitizenAuthContext.Provider>
  );
}

export function useCitizenAuth() {
  const context = useContext(CitizenAuthContext);
  if (!context) {
    throw new Error('useCitizenAuth must be used within a CitizenAuthProvider');
  }
  return context;
}
