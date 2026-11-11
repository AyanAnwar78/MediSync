import axiosClient from './axiosClient';

export const doctorsApi = {
  getAll: (params = {}) => axiosClient.get('/doctors', { params }).then((r) => r.data),
  getById: (id) => axiosClient.get(`/doctors/${id}`).then((r) => r.data),
  create: (payload) => axiosClient.post('/doctors', payload).then((r) => r.data),
  update: (id, payload) => axiosClient.put(`/doctors/${id}`, payload).then((r) => r.data),
  updateAvailability: (id, isAvailableForBooking) =>
    axiosClient.patch(`/doctors/${id}/availability`, { isAvailableForBooking }).then((r) => r.data),
  remove: (id) => axiosClient.delete(`/doctors/${id}`).then((r) => r.data),
  getAvailableSlots: (doctorId, date) =>
    axiosClient.get(`/doctors/${doctorId}/slots`, { params: { date } }).then((r) => r.data),
};

