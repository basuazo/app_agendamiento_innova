import api from './api';
import { BusinessHours, SpaceSettings } from '../types';

export const settingsService = {
  getBusinessHours: async (): Promise<SpaceSettings> => {
    const res = await api.get<SpaceSettings>('/settings/business-hours');
    return res.data;
  },

  updateBusinessHours: async (
    days: Pick<BusinessHours, 'dayOfWeek' | 'isOpen' | 'openTime' | 'closeTime'>[],
    maxCapacity: number,
    maxCapacityReunion: number,
  ): Promise<SpaceSettings> => {
    const res = await api.put<SpaceSettings>('/settings/business-hours', { days, maxCapacity, maxCapacityReunion });
    return res.data;
  },
};
