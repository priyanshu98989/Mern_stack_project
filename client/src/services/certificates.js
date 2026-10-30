import { api } from '../lib/api';
export const certApi = {
  list: (params) => api.get('/api/v1/certificates', { params }).then((r) => r.data),
  get: (id) => api.get(`/api/v1/certificates/${id}`).then((r) => r.data),
  create: (data) => api.post('/api/v1/certificates', data).then((r) => r.data),
  update: (id, data) => api.patch(`/api/v1/certificates/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/api/v1/certificates/${id}`).then((r) => r.data),
  submit: (id) => api.post(`/api/v1/certificates/${id}/submit`).then((r) => r.data),
  transition: (id, data) =>
    api.post(`/api/v1/certificates/${id}/transition`, data).then((r) => r.data),
  uploadProof: (id, file) => {
    const fd = new FormData();
    fd.append('proof', file);
    return api.post(`/api/v1/certificates/${id}/proof`, fd).then((r) => r.data);
  },
  proof: (id) =>
    api.get(`/api/v1/certificates/${id}/proof`, { responseType: 'blob' }).then((r) => r.data),
  history: (id) => api.get(`/api/v1/certificates/${id}/history`).then((r) => r.data),
  platforms: () => api.get('/api/v1/certificates/platforms').then((r) => r.data),
};
