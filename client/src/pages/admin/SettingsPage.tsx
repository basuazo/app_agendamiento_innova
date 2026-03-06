import { useEffect, useState } from 'react';
import { settingsService } from '../../services/settings.service';
import { BusinessHours } from '../../types';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import toast from 'react-hot-toast';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const TIME_OPTIONS: string[] = [];
for (let h = 6; h <= 22; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`);
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:30`);
}

type DayState = Pick<BusinessHours, 'dayOfWeek' | 'isOpen' | 'openTime' | 'closeTime'>;

const DEFAULT_HOURS: DayState[] = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i,
  isOpen: i !== 0,
  openTime: '09:00',
  closeTime: '17:00',
}));

export default function SettingsPage() {
  const [days, setDays] = useState<DayState[]>(DEFAULT_HOURS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    settingsService.getBusinessHours().then((data) => {
      if (data.length === 7) {
        setDays(
          data
            .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
            .map(({ dayOfWeek, isOpen, openTime, closeTime }) => ({
              dayOfWeek, isOpen, openTime, closeTime,
            }))
        );
      }
    }).catch(() => {
      toast.error('Error al cargar horarios');
    }).finally(() => {
      setIsLoading(false);
    });
  }, []);

  const update = (dayOfWeek: number, patch: Partial<DayState>) => {
    setDays((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d))
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await settingsService.updateBusinessHours(days);
      toast.success('Horarios guardados correctamente');
    } catch {
      toast.error('Error al guardar horarios');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración de Horarios</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Define qué días están abiertos y en qué horario se pueden realizar reservas.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {days.map((day) => (
          <div key={day.dayOfWeek} className="px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              {/* Día + toggle */}
              <div className="flex items-center gap-3 min-w-[130px]">
                <button
                  type="button"
                  onClick={() => update(day.dayOfWeek, { isOpen: !day.isOpen })}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    day.isOpen ? 'bg-brand-600' : 'bg-gray-200'
                  }`}
                  role="switch"
                  aria-checked={day.isOpen}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ${
                      day.isOpen ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium ${day.isOpen ? 'text-gray-900' : 'text-gray-400'}`}>
                  {DAY_NAMES[day.dayOfWeek]}
                </span>
              </div>

              {/* Selectores de hora */}
              {day.isOpen ? (
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <label className="text-xs text-gray-500 whitespace-nowrap">Desde</label>
                  <select
                    value={day.openTime}
                    onChange={(e) => update(day.dayOfWeek, { openTime: e.target.value })}
                    className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <label className="text-xs text-gray-500 whitespace-nowrap">Hasta</label>
                  <select
                    value={day.closeTime}
                    onChange={(e) => update(day.dayOfWeek, { closeTime: e.target.value })}
                    className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    {TIME_OPTIONS.filter((t) => t > day.openTime).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-sm text-gray-400 italic">Cerrado</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Guardando...
            </>
          ) : (
            'Guardar horarios'
          )}
        </button>
      </div>
    </div>
  );
}
