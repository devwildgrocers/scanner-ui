import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import notify from '@/lib/notifications';

import { APP_CONFIG } from '@/config/constants';

const baseURL = APP_CONFIG.API_URL;

const axiosInstance: AxiosInstance = axios.create({
  baseURL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const skipErrorToast = config.headers?.['x-skip-error-toast'];
    if (skipErrorToast) {
      (config as any).__skipErrorToast = true;
      delete config.headers['x-skip-error-toast'];
    }

    // Conditional Authorization
    if (APP_CONFIG.AUTH_ENABLED) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const message = error.response?.data?.message || error.message || 'An unexpected error occurred';

    const shouldSkipToast = Boolean((error.config as any)?.__skipErrorToast);
    if (!shouldSkipToast) {
      notify.error('API Error', {
        description: message,
      });
    }

    console.error('API Error:', message);
    return Promise.reject(error);
  }
);


/**
 * Core HTTP methods helper
 */
const apiClient = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return axiosInstance.get<T>(url, config);
  },
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return axiosInstance.post<T>(url, data, config);
  },
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return axiosInstance.put<T>(url, data, config);
  },
  patch: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return axiosInstance.patch<T>(url, data, config);
  },
  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return axiosInstance.delete<T>(url, config);
  },
};

export default apiClient;
