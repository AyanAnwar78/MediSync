import axiosClient from './axiosClient';

export const patientsApi = {
  getAll: (search = '') =>
    axiosClient.get('/patients', { params: search ? { search } : {} }).then((r) => r.data),
  getById: (id) => axiosClient.get(`/patients/${id}`).then((r) => r.data),
  update: (id, payload) => axiosClient.put(`/patients/${id}`, payload).then((r) => r.data),
};

