import api from './api';
import type { Notification } from '@/types';

export const getNotifications = async (): Promise<Notification[]> => {
  const res = await api.get<Notification[]>('/api/notifications');
  return res.data;
};

export const acceptNotification = async (id: number): Promise<void> => {
  await api.post(`/api/notifications/${id}/accept`);
};

export const rejectNotification = async (id: number): Promise<void> => {
  await api.post(`/api/notifications/${id}/reject`);
};

export const markAsRead = async (id: number): Promise<void> => {
  await api.post(`/api/notifications/${id}/read`);
};
