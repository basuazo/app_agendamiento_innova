import api from './api';
import { Training } from '../types';

export interface CreateTrainingDto {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  exemptResourceIds?: string[];
}

export const trainingService = {
  getAll: () => api.get<Training[]>('/trainings').then((r) => r.data),

  create: (data: CreateTrainingDto) =>
    api.post<Training>('/admin/trainings', data).then((r) => r.data),

  remove: (id: string) => api.delete(`/admin/trainings/${id}`),

  updateExemptions: (id: string, exemptResourceIds: string[]) =>
    api.patch<Training>(`/admin/trainings/${id}/exemptions`, { exemptResourceIds }).then((r) => r.data),
};
