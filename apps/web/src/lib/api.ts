import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // envia cookie JWT
});

// Anexa o token do cookie/storage em cada requisição (fallback para Bearer)
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token =
    typeof document !== 'undefined' ? document.cookie.match(/(?:^|; )token=([^;]+)/)?.[1] : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export type ApiError = {
  status: number;
  code?: string;
  message: string;
};

export const isApiError = (err: unknown): err is AxiosError<ApiError> =>
  axios.isAxiosError(err);
