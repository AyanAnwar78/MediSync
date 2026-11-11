import axiosClient from './axiosClient';

export const appointmentsApi = {
  getAll: (params = {}) => axiosClient.get('/appointments', { params }).then((r) => r.data),
  getById: (id) => axiosClient.get(`/appointments/${id}`).then((r) => r.data),
  book: (payload) => axiosClient.post('/appointments', payload).then((r) => r.data),
  updateStatus: (id, payload) => axiosClient.patch(`/appointments/${id}/status`, payload).then((r) => r.data),
  cancel: (id, cancellationReason) =>
    axiosClient.post(`/appointments/${id}/cancel`, { cancellationReason }).then((r) => r.data),
};

