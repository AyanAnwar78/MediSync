import axiosClient from './axiosClient';

export const authApi = {
  login: (payload) => axiosClient.post('/auth/login', payload).then((r) => r.data),
  register: (payload) => axiosClient.post('/auth/register', payload).then((r) => r.data),
  me: () => axiosClient.get('/auth/me').then((r) => r.data),
  getUsers: (role) => axiosClient.get('/auth/users', { params: role ? { role } : {} }).then((r) => r.data),
  updateUserStatus: (userId, isActive) =>
    axiosClient.patch(`/auth/users/${userId}/status`, { isActive }).then((r) => r.data),
};

