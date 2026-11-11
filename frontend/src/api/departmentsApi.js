import axiosClient from './axiosClient';

export const departmentsApi = {
  getAll: (activeOnly = false) =>
    axiosClient.get('/departments', { params: { activeOnly } }).then((r) => r.data),
  getById: (id) => axiosClient.get(`/departments/${id}`).then((r) => r.data),
  create: (payload) => axiosClient.post('/departments', payload).then((r) => r.data),
  update: (id, payload) => axiosClient.put(`/departments/${id}`, payload).then((r) => r.data),
  remove: (id) => axiosClient.delete(`/departments/${id}`),
};

