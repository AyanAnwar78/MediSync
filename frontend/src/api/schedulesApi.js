import axiosClient from './axiosClient';

export const schedulesApi = {
  getByDoctor: (doctorId) => axiosClient.get(`/doctors/${doctorId}/schedules`).then((r) => r.data),
  upsert: (doctorId, schedules) =>
    axiosClient.put(`/doctors/${doctorId}/schedules`, { schedules }).then((r) => r.data),
  remove: (doctorId, scheduleId) => axiosClient.delete(`/doctors/${doctorId}/schedules/${scheduleId}`),
};

