import { api } from '../lib/api';

export const authApi = {
  register: (data) => api.post('/api/v1/auth/register', data).then((r) => r.data),
  login: (data) => api.post('/api/v1/auth/login', data).then((r) => r.data),
  logout: () => api.post('/api/v1/auth/logout').then((r) => r.data),
  refresh: () => api.post('/api/v1/auth/refresh').then((r) => r.data),
  me: () => api.get('/api/v1/auth/me').then((r) => r.data),
  forgot: (email) => api.post('/api/v1/auth/forgot-password', { email }).then((r) => r.data),
  reset: (token, password) =>
    api.post(`/api/v1/auth/reset-password/${token}`, { password }).then((r) => r.data),
  verifyEmail: (token) => api.get(`/api/v1/auth/verify-email/${token}`).then((r) => r.data),
  resendVerification: (email) =>
    api.post('/api/v1/auth/resend-verification', { email }).then((r) => r.data),
  changePassword: (data) => api.post('/api/v1/auth/change-password', data).then((r) => r.data),
  updateProfile: (data) => api.patch('/api/v1/auth/me', data).then((r) => r.data),
  setupTwoFactor: (currentPassword) =>
    api.post('/api/v1/auth/2fa/setup', { currentPassword }).then((r) => r.data),
  enableTwoFactor: (secret, token) =>
    api.post('/api/v1/auth/2fa/enable', { secret, token }).then((r) => r.data),
  disableTwoFactor: (token) => api.post('/api/v1/auth/2fa/disable', { token }).then((r) => r.data),
  sessions: () => api.get('/api/v1/auth/sessions').then((r) => r.data),
  revokeSession: (id) => api.delete(`/api/v1/auth/sessions/${id}`).then((r) => r.data),
};
