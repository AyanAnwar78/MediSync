import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5054/api';

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

let onUnauthorizedCallback = null;

export function registerUnauthorizedHandler(callback) {
  onUnauthorizedCallback = callback;
}

axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('medisync_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error.response?.data;
    let friendly = 'Unable to connect to MediSync API. Verify the backend server is running.';

    if (error.response) {
      if (data?.detail) {
        friendly = data.detail;
      } else if (data?.errors && typeof data.errors === 'object') {
        const firstErr = Object.values(data.errors).flat()[0];
        friendly = firstErr || data.title || friendly;
      } else if (data?.title) {
        friendly = data.title;
      } else if (error.response.status === 401) {
        friendly = 'Your session has expired or credentials are invalid.';
      } else if (error.response.status === 403) {
        friendly = 'You do not have permission to perform this action.';
      }
    }

    error.friendlyMessage = friendly;

    const requestUrl = error.config?.url || '';
    const isAuthAttempt = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');

    if (error.response?.status === 401 && !isAuthAttempt && onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }

    return Promise.reject(error);
  }
);

export default axiosClient;

