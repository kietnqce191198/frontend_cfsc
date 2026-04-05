import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

export const AUTH_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || '/api-auth';

export const CUSTOMER_API_BASE_URL =
  import.meta.env.VITE_CUSTOMER_API_BASE_URL || '/api-customer';

export const ENGAGEMENT_API_BASE_URL =
  import.meta.env.VITE_ENGAGEMENT_API_BASE_URL || '/api-engagement';

export const PRODUCTION_API_BASE_URL =
  import.meta.env.VITE_PRODUCTION_API_BASE_URL || '/api-product';

type RefreshResponse = {
  accessToken?: string;
  refreshToken?: string;
};

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const getAccessToken = () => localStorage.getItem('accessToken');
const getRefreshToken = () => localStorage.getItem('refreshToken');

/** Tên sự kiện window — gọi {@link dispatchSessionChanged} sau login/logout để refetch API (promotions, v.v.). */
export const SESSION_CHANGED_EVENT = 'cfsc-session-changed';

export function dispatchSessionChanged(): void {
  if (typeof window === 'undefined') return;
  console.log('dispatchSessionChanged: Dispatching cfsc-session-changed event');
  window.dispatchEvent(new CustomEvent(SESSION_CHANGED_EVENT));
}

/** Xóa session và về trang chủ (yêu cầu đăng nhập lại). */
export const clearSessionAndRedirect = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('email');
  localStorage.removeItem('accountProfile');
  localStorage.removeItem('username');
  localStorage.removeItem('customerId');
  window.location.replace('/');
};

const normalizePath = (url: string | undefined): string => {
  if (!url) return '';
  const withoutHost = url.replace(/^https?:\/\/[^/]+/i, '');
  return withoutHost.split('?')[0] || '';
};

/** Không gọi refresh khi lỗi từ các API không dùng access token (login sai, v.v.). */
function shouldSkipAuthRefresh(url: string | undefined): boolean {
  const path = normalizePath(url);
  if (path.includes('/api/auth/login')) return true;
  if (path.includes('/api/auth/register')) return true;
  if (path.includes('/api/accounts/forgot-password')) return true;
  return false;
}

const refreshClient = axios.create({
  baseURL: AUTH_API_BASE_URL,
});

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

const notifyRefreshSubscribers = (token: string | null) => {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
};

const subscribeToRefresh = (cb: (token: string | null) => void) => {
  refreshQueue.push(cb);
};

function attachAuthRefreshInterceptor(instance: AxiosInstance) {
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as RetryableRequestConfig | undefined;
      const status = error.response?.status;

      if (!original) return Promise.reject(error);

      if (status !== 401 && status !== 403) {
        return Promise.reject(error);
      }

      const path = normalizePath(original.url);

      if (path.includes('/api/auth/refresh')) {
        clearSessionAndRedirect();
        return Promise.reject(error);
      }

      if (shouldSkipAuthRefresh(original.url)) {
        return Promise.reject(error);
      }

      if (original._retry) {
        if (status === 401) {
          clearSessionAndRedirect();
        }
        return Promise.reject(error);
      }
      original._retry = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearSessionAndRedirect();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeToRefresh((newToken) => {
            if (!newToken) {
              reject(error);
              return;
            }
            original.headers = original.headers ?? {};
            original.headers.Authorization = `Bearer ${newToken}`;
            resolve(instance(original));
          });
        });
      }

      isRefreshing = true;
      try {
        const resp = await refreshClient.post<RefreshResponse>('/api/auth/refresh', { refreshToken });
        const nextAccessToken = resp.data.accessToken;
        if (!nextAccessToken) {
          notifyRefreshSubscribers(null);
          clearSessionAndRedirect();
          return Promise.reject(error);
        }

        localStorage.setItem('accessToken', nextAccessToken);
        if (resp.data.refreshToken) {
          localStorage.setItem('refreshToken', resp.data.refreshToken);
        }

        notifyRefreshSubscribers(nextAccessToken);

        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${nextAccessToken}`;
        return instance(original);
      } catch (refreshErr) {
        notifyRefreshSubscribers(null);
        clearSessionAndRedirect();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
  );
}

function createAuthAwareClient(baseURL: string): AxiosInstance {
  const instance = axios.create({ baseURL });
  instance.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`createAuthAwareClient: Adding token to request ${config.method?.toUpperCase()} ${config.url}`);
    } else {
      console.log(`createAuthAwareClient: No token available for request ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  });
  attachAuthRefreshInterceptor(instance);
  return instance;
}

const apiClient = createAuthAwareClient(AUTH_API_BASE_URL);
/** Gọi customer-service (8082); cùng luồng refresh token với auth. */
export const customerHttp = createAuthAwareClient(CUSTOMER_API_BASE_URL);

export const engagementHttp = createAuthAwareClient(ENGAGEMENT_API_BASE_URL);

export default apiClient;
