import axiosClient from './axiosClient';

export const leavesApi = {
  getAll: (params = {}) => axiosClient.get('/leaves', { params }).then((r) => r.data),
  getApprovedByDoctor: (doctorId) =>
    axiosClient.get(`/leaves/doctor/${doctorId}/approved`).then((r) => r.data),
  create: (payload) => axiosClient.post('/leaves', payload).then((r) => r.data),
  updateStatus: (leaveId, status) =>
    axiosClient.patch(`/leaves/${leaveId}/status`, { status }).then((r) => r.data),
  remove: (leaveId) => axiosClient.delete(`/leaves/${leaveId}`),
};

