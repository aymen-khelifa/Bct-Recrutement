import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';
import { register as apiRegister, verifyOtp as apiVerify } from '../services/authService';

// Instance Axios dédiée aux requêtes de refresh/logout (sans intercepteur)
const refreshAxios = axios.create();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async (skipApi = false) => {
    if (!skipApi) {
      try {
        await axios.post('/api/auth/logout');
      } catch (error) {
        console.error('Erreur lors de la déconnexion', error);
      }
    }
    setUser(null);
  }, []);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;
        // Éviter de réintercepter la requête de refresh elle-même
        if (originalRequest.url === '/api/auth/refresh') {
          return Promise.reject(error);
        }
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            // Utiliser l'instance dédiée pour le refresh
            await refreshAxios.post('/api/auth/refresh');
            return axios(originalRequest);
          } catch (refreshError) {
            // ✅ logout via refreshAxios (pas d'intercepteur → pas de boucle)
           await refreshAxios.post('/api/auth/logout'); 
            setUser(null);
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const response = await axios.get('/api/auth/whoami');
      setUser(response.data);
    } catch (error) {
      console.error('Non authentifié', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!user) return;
    let inactivityTimer;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        axios.post('/api/auth/logout')
          .finally(() => {
            window.location.href = '/';
          });
      }, 60 * 60 * 1000);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();
    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      clearTimeout(inactivityTimer);
    };
  }, [user]);

  const login = async (email, password) => {
    const response = await axios.post('/api/auth/login', { email, password });
    await fetchUser();
    return response.data;
  };

  const register = async (userData) => apiRegister(userData);
  const verifyOtp = async (email, code) => apiVerify(email, code);

  const value = { user, loading, login, register, verifyOtp, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};