import axiosClient from './axiosClient';

export const analyticsApi = {
  getAdminSummary: () => axiosClient.get('/analytics/admin-summary').then((r) => r.data),
  getDoctorWorkload: () => axiosClient.get('/analytics/doctor-workload').then((r) => r.data),
};

