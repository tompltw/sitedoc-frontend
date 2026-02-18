import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000',
  // Do NOT set Content-Type here — axios auto-detects per request.
  // Setting application/json globally breaks FormData (multipart) uploads
  // because the hardcoded header overrides the boundary-bearing Content-Type
  // that the browser must set for multipart/form-data.
});

// Request interceptor — attach Bearer token
api.interceptors.request.use(
  (config) => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('sitedoc_token')
        : null;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — auto-logout on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sitedoc_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
