import axios from 'axios';

const API_URL = '/api/auth'; // Utilise le proxy Vite (ou l'URL complète si nécessaire)

export const register = (userData) => {
  return axios.post(`${API_URL}/register`, userData)
    .then(response => response.data);
};

export const verifyOtp = (email, code) => {
  return axios.post(`${API_URL}/verify`, { email, code })
    .then(response => response.data);
};

export const login = (email, password) => {
  return axios.post(`${API_URL}/login`, { email, password })
    .then(response => response.data);
};

export const resendOtp = (email) => {
  return axios.post(`${API_URL}/resend-otp?email=${encodeURIComponent(email)}`)
    .then(response => response.data);
};