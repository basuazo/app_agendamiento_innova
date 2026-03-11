import { format, addHours, startOfDay, setHours } from 'date-fns';
import { es } from 'date-fns/locale';

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

export const PURPOSE_LABELS: Record<string, string> = {
  LEARN: 'Aprender',
  PRODUCE: 'Producir',
  DESIGN: 'Diseñar',
  REUNION: 'Reunión',
};
