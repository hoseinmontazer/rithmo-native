/**
 * Axios client with:
 *  - Bearer token auto-attachment
 *  - Transparent access-token refresh on 401
 *  - Request retry after refresh
 *  - Global timeout
 */
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { API_BASE_URL, API_TIMEOUT_MS, API_ENDPOINTS } from '@constants/config';
import { secureStorage } from '@utils/secureStorage';
import type { RefreshTokenResponse } from '@types/auth.types';

// Extend config to carry retry flag
interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else if (token) resolve(token);
  });
  failedQueue = [];
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach access token ──────────────────────────────────
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const tokens = await secureStorage.getTokens();
    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// ── Response interceptor: handle 401 → refresh → retry ───────────────────────
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableConfig;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request until the ongoing refresh completes
      return new Promise<AxiosResponse>((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          },
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const tokens = await secureStorage.getTokens();
      if (!tokens?.refreshToken) throw new Error('No refresh token available');

      const { data } = await axios.post<RefreshTokenResponse>(
        `${API_BASE_URL}${API_ENDPOINTS.AUTH_REFRESH}`,
        { refresh: tokens.refreshToken },
        { timeout: API_TIMEOUT_MS },
      );

      const newTokens = { ...tokens, accessToken: data.access };
      await secureStorage.saveTokens(newTokens);

      apiClient.defaults.headers.common.Authorization = `Bearer ${data.access}`;
      originalRequest.headers.Authorization = `Bearer ${data.access}`;

      processQueue(null, data.access);
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      // Clear tokens and let the auth store handle logout
      await secureStorage.clearTokens();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
