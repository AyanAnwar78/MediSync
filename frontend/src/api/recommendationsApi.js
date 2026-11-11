import axiosClient from './axiosClient';

export const recommendationsApi = {
  getSlots: (payload) => axiosClient.post('/recommendations/slots', payload).then((r) => r.data),
};

