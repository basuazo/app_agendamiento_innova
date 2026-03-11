import api from './api';
import { User, Role } from '../types';

export const userService = {
  getAll: () => api.get<{ data: User[] }>('/users').then((r) => r.data.data),

  create: (data: { name: string; email: string; organization?: string; password: string; role?: Role; spaceId?: string }) =>
    api.post<User>('/users', data).then((r) => r.data),

  update: (id: string, data: { name?: string; email?: string; organization?: string; password?: string; spaceId?: string }) =>
    api.patch<User>(`/users/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/users/${id}`).then((r) => r.data),

  changeRole: (id: string, role: Role) =>
    api.patch<User>(`/users/${id}/role`, { role }).then((r) => r.data),

  verify: (id: string) =>
    api.patch<User>(`/users/${id}/verify`).then((r) => r.data),
};
