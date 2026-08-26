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

// ── Session-expiry listeners ──────────────────────────────────────────────────
// Fired when token refresh definitively fails. The auth store subscribes to
// flip isAuthenticated; client.ts itself must not import the store (the
// store's services use this client — that would be a circular import).
type SessionExpiredListener = () => void;
const sessionExpiredListeners = new Set<SessionExpiredListener>();

export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

/**
 * Endpoints where a 401 is the *answer*, not a stale-session symptom.
 *
 * `jwt/create` returns 401 for a wrong username or password. Routing that
 * through the refresh path made a fresh install report the wrong thing: with
 * no stored refresh token the interceptor threw «No refresh token available»,
 * which `errorHandler` maps to «نشستِ قبلی معتبر نیست. دوباره وارد شو.» — a
 * previous session the user never had. The correct mapping for bad
 * credentials already exists and was simply never reached, because the
 * interceptor rejected with its own error before the original 401 surfaced.
 *
 * `jwt/refresh` and `jwt/verify` are here for the same reason: a 401 from them
 * means the refresh token itself is finished, so refreshing again cannot help.
 *
 * Deliberately narrow — `auth/users/me/` is NOT in this list. A 401 there is a
 * genuinely expired access token and must still trigger a refresh.
 */
const AUTH_VERDICT_ENDPOINTS: readonly string[] = [
  API_ENDPOINTS.AUTH_LOGIN,
  API_ENDPOINTS.AUTH_REFRESH,
  API_ENDPOINTS.AUTH_VERIFY,
];

function isAuthVerdictRequest(config?: { url?: string }): boolean {
  const url = config?.url;
  if (!url) {return false;}
  return AUTH_VERDICT_ENDPOINTS.some((endpoint) => url.includes(endpoint));
}

function processQueue(error: unknown, token: string | null): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {reject(error);}
    else if (token) {resolve(token);}
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

    // A 401 from the credential endpoints is a verdict, not an expired
    // session. Reject with the server's own error so the Persian message the
    // user sees describes what actually happened.
    if (isAuthVerdictRequest(originalRequest)) {
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
      if (!tokens?.refreshToken) {throw new Error('No refresh token available');}

      const { data } = await axios.post<RefreshTokenResponse>(
        `${API_BASE_URL}${API_ENDPOINTS.AUTH_REFRESH}`,
        { refresh: tokens.refreshToken },
        { timeout: API_TIMEOUT_MS },
      );

      // Persist the ROTATED refresh token, not just the new access token.
      //
      // The server runs simple-jwt with ROTATE_REFRESH_TOKENS and
      // BLACKLIST_AFTER_ROTATION, so this response carries a fresh refresh
      // token and the one we just presented is now blacklisted. Saving only
      // `data.access` left the old, dead refresh token in the keychain — so
      // the first refresh succeeded and the *second* one, about half an hour
      // later, got «Token is blacklisted» and signed the user out. A 30-day
      // refresh lifetime was in practice a ~1-hour session.
      //
      // `data.refresh` is optional so that a server with rotation turned off
      // keeps working: without it we simply keep the existing token.
      const newTokens = {
        ...tokens,
        accessToken: data.access,
        refreshToken: data.refresh ?? tokens.refreshToken,
      };
      await secureStorage.saveTokens(newTokens);

      apiClient.defaults.headers.common.Authorization = `Bearer ${data.access}`;
      originalRequest.headers.Authorization = `Bearer ${data.access}`;

      processQueue(null, data.access);
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      // Clear tokens AND flip the auth store so the navigator redirects to
      // login. Previously only the tokens were cleared while isAuthenticated
      // stayed true — a permanent soft-lock (audit 2026-08-20, finding F5).
      await secureStorage.clearTokens();
      sessionExpiredListeners.forEach((listener) => {
        try {
          listener();
        } catch (listenerError) {
          // listener errors must not break the reject path
        }
      });
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
