import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30000, // 30 second timeout
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: unknown) => void; reject: (reason?: unknown) => void }> = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve(undefined);
  });
  failedQueue = [];
};

// Retry logic for network errors
async function retryRequest(error: AxiosError, retryCount: number): Promise<unknown> {
  const config = error.config as AxiosRequestConfig & { _retryCount?: number };

  if (retryCount >= MAX_RETRIES) {
    return Promise.reject(error);
  }

  // Only retry on network errors or 5xx errors
  if (error.response && error.response.status < 500) {
    return Promise.reject(error);
  }

  // Wait before retrying
  await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));

  config._retryCount = retryCount + 1;
  return api(config);
}

api.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean; _retryCount?: number };

    // Handle 401 - try to refresh session
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.get(`${API_URL}/auth/me`, { withCredentials: true });
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle rate limiting (429)
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const message = (error.response.data as any)?.error || 'Too many requests. Please try again later.';
      return Promise.reject({
        status: 429,
        error: message,
        retryAfter: retryAfter ? parseInt(retryAfter) : 60,
      });
    }

    // Retry on network errors
    if (!error.response && error.code === 'ERR_NETWORK') {
      return retryRequest(error, originalRequest._retryCount || 0);
    }

    // Retry on 5xx errors
    if (error.response?.status && error.response.status >= 500) {
      return retryRequest(error, originalRequest._retryCount || 0);
    }

    return Promise.reject(error.response?.data || { error: error.message });
  },
);
