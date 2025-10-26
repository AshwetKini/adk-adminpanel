// src/lib/axios.ts
import axios from 'axios';
import { getLocalAccess, getLocalRefresh, setLocalTokens, clearLocalTokens } from './tokens';

const apiBase = process.env.NEXT_PUBLIC_API_URL;
const axiosInstance = axios.create({
  baseURL: apiBase,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // include cookies for refresh endpoint
});

// Attach access token
axiosInstance.interceptors.request.use((config) => {
  const token = getLocalAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto refresh on 401
let isRefreshing = false;
let queue: Array<(t: string) => void> = [];

function onRefreshed(token: string) {
  queue.forEach((cb) => cb(token));
  queue = [];
}

axiosInstance.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        // Wait until refresh finishes
        return new Promise((resolve) => {
          queue.push((token: string) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(axiosInstance(original));
          });
        });
      }

      try {
        isRefreshing = true;
        const refreshLocal = getLocalRefresh();
        // Call backend refresh (cookie also present via withCredentials)
        const { data } = await axios.post(
          `${apiBase}/auth/refresh`,
          {},
          {
            headers: refreshLocal ? { Authorization: `Bearer ${refreshLocal}` } : {},
            withCredentials: true,
          },
        );
        const newAccess = data.access_token;
        setLocalTokens(newAccess, refreshLocal || '');
        onRefreshed(newAccess);
        original.headers.Authorization = `Bearer ${newAccess}`;
        return axiosInstance(original);
      } catch (_e) {
        clearLocalTokens();
        // Clear cookies via our session API
        await fetch('/api/session', { method: 'DELETE' });
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(_e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
