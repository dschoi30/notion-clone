import api from './api';

export const getNotifications = async () => {
  const res = await api.get('/api/notifications');
  return res.data;
};

export const acceptNotification = async (id) => {
  await api.post(`/api/notifications/${id}/accept`);
};

export const rejectNotification = async (id) => {
  await api.post(`/api/notifications/${id}/reject`);
}; 