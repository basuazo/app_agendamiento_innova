import { format, addHours, startOfDay, setHours } from 'date-fns';
import { es } from 'date-fns/locale';
import { ResourceCategory } from '../types';

export const OPEN_HOUR = 9;
export const CLOSE_HOUR = 17;

export function generateDaySlots(date: Date): Date[] {
  const slots: Date[] = [];
  const base = startOfDay(date);
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
    slots.push(setHours(base, h));
  }
  return slots;
}

export function formatDateTime(dateStr: string): string {
  return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: es });
}

export function formatDate(dateStr: string): string {
  return format(new Date(dateStr), "EEEE d 'de' MMMM", { locale: es });
}

export function formatHour(dateStr: string): string {
  return format(new Date(dateStr), 'HH:mm');
}

export function toEndTime(startTime: Date): Date {
  return addHours(startTime, 1);
}

export const RESOURCE_CATEGORY_LABELS: Record<ResourceCategory, string> = {
  RECTA_CASERA: 'Recta Casera',
  OVERLOCK_CASERA: 'Overlock Casera',
  COLLERETERA: 'Collaretera',
  BORDADORA: 'Bordadora',
  IMPRESORA_SUBLIMACION: 'Impresora Sublimación',
  PLOTTER_CORTE: 'Plotter de Corte',
  PLANCHA_SUBLIMACION: 'Plancha Sublimación',
  INDUSTRIAL: 'Industrial',
  PLANCHA_VAPOR: 'Plancha de Vapor',
  MESON_CORTE: 'Mesón de Corte',
  ESPACIO_REUNION: 'Espacio de Reuniones',
};

export const RESOURCE_CATEGORY_COLORS: Record<ResourceCategory, string> = {
  RECTA_CASERA: '#3b82f6',
  OVERLOCK_CASERA: '#8b5cf6',
  COLLERETERA: '#ec4899',
  BORDADORA: '#f59e0b',
  IMPRESORA_SUBLIMACION: '#10b981',
  PLOTTER_CORTE: '#ef4444',
  PLANCHA_SUBLIMACION: '#f97316',
  INDUSTRIAL: '#6b7280',
  PLANCHA_VAPOR: '#06b6d4',
  MESON_CORTE: '#84cc16',
  ESPACIO_REUNION: '#0ea5e9',
};

export const PURPOSE_LABELS: Record<string, string> = {
  LEARN: 'Aprender',
  PRODUCE: 'Producir',
  DESIGN: 'Diseñar',
  REUNION: 'Reunión',
};
