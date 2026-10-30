import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

let accessToken = null;
export const setAccessToken = (t) => {
  accessToken = t;
};
export const getAccessToken = () => accessToken;

function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((row) => row.startsWith(name + '='));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  const csrf = readCookie('csrfToken');
  if (csrf) config.headers['x-csrf-token'] = csrf;
  return config;
});

let refreshing = null;
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/refresh')
    ) {
      original._retry = true;
      if (!refreshing) {
        refreshing = api
          .post('/api/v1/auth/refresh')
          .then((res) => {
            const t = res.data?.data?.accessToken;
            setAccessToken(t);
            return t;
          })
          .finally(() => {
            refreshing = null;
          });
      }
      try {
        await refreshing;
        return api(original);
      } catch (e) {
        setAccessToken(null);
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);
