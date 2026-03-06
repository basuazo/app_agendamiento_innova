import api from './api';
import { BusinessHours } from '../types';

export const settingsService = {
  getBusinessHours: async (): Promise<BusinessHours[]> => {
    const res = await api.get<BusinessHours[]>('/settings/business-hours');
    return res.data;
  },

  updateBusinessHours: async (
    days: Pick<BusinessHours, 'dayOfWeek' | 'isOpen' | 'openTime' | 'closeTime'>[]
  ): Promise<BusinessHours[]> => {
    const res = await api.put<BusinessHours[]>('/settings/business-hours', days);
    return res.data;
  },
};
