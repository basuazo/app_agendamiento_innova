import { useEffect, useState } from 'react';
import { useBookingStore } from '../store/bookingStore';
import { useResourceStore } from '../store/resourceStore';
import { useAuthStore } from '../store/authStore';
import { Training, CertificationRequest, BusinessHours } from '../types';
import { trainingService } from '../services/training.service';
import { certificationService } from '../services/certification.service';
import { settingsService } from '../services/settings.service';
import CalendarView from '../components/calendar/CalendarView';
import BookingModal from '../components/booking/BookingModal';
import TrainingModal from '../components/admin/TrainingModal';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import toast from 'react-hot-toast';

export default function CalendarPage() {
  const { user, currentSpaceId } = useAuthStore();
  const { bookings, fetchAll, isLoading } = useBookingStore();
  const { resources, fetchAll: fetchResources } = useResourceStore();

  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [trainingModalOpen, setTrainingModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedHour, setSelectedHour] = useState<number | undefined>();
  const [actionChoice, setActionChoice] = useState<{ date: Date } | null>(null);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [certSessions, setCertSessions] = useState<CertificationRequest[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([]);
  const [hoursLoaded, setHoursLoaded] = useState(false);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'LIDER_TECNICA' || user?.role === 'LIDER_COMUNITARIA';

  const fetchTrainings = async () => {
    try {
      const data = await trainingService.getAll();
      setTrainings(data);
    } catch {
      // silent
    }
  };

  const fetchCertSessions = async () => {
    if (!isAdmin) return;
    try {
      const data = await certificationService.getAllRequests('SCHEDULED');
      setCertSessions(data);
    } catch {
      // silent
    }
  };

  const fetchBusinessHours = async () => {
    try {
      const data = await settingsService.getBusinessHours();
      setBusinessHours(data.days);
    } catch {
      // silent — el calendario usará horarios por defecto
    } finally {
      setHoursLoaded(true);
    }
  };

  useEffect(() => {
    setHoursLoaded(false);
    fetchAll();
    fetchResources();
    fetchTrainings();
    fetchCertSessions();
    fetchBusinessHours();
  }, [fetchAll, fetchResources, currentSpaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSlotClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedHour(date.getHours() >= 9 && date.getHours() <= 16 ? date.getHours() : 9);
    if (isAdmin) {
      setActionChoice({ date });
    } else {
      setBookingModalOpen(true);
    }
  };

  const handleChooseBooking = () => {
    setActionChoice(null);
    setBookingModalOpen(true);
  };

  const handleChooseTraining = () => {
    setActionChoice(null);
    setTrainingModalOpen(true);
  };

  const handleBookingModalClose = () => {
    setBookingModalOpen(false);
    setSelectedDate(undefined);
    setSelectedHour(undefined);
    fetchAll();
  };

  const handleTrainingModalClose = () => {
    setTrainingModalOpen(false);
    setSelectedDate(undefined);
    setSelectedHour(undefined);
  };

  const handleTrainingSaved = () => {
    fetchTrainings();
  };

  const handleTrainingClick = async (training: Training) => {
    if (!isAdmin) return;
    const confirmed = window.confirm(
      `¿Eliminar la capacitación "${training.title}"?\n\nEsta acción no se puede deshacer.`
    );
    if (!confirmed) return;
    try {
      await trainingService.remove(training.id);
      toast.success('Capacitación eliminada');
      fetchTrainings();
    } catch {
      toast.error('Error al eliminar la capacitación');
    }
  };

  const calendarReady = !isLoading && hoursLoaded;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendario de Reservas</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {isAdmin
              ? 'Haz click en un horario para reservar o bloquear para capacitación'
              : 'Haz click en un horario libre para reservar'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setBookingModalOpen(true)}
            className="inline-flex items-center gap-2 bg-brand-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Reserva
          </button>
          {isAdmin && (
            <button
              onClick={() => setTrainingModalOpen(true)}
              className="inline-flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Capacitación
            </button>
          )}
        </div>
      </div>

      {/* Leyenda de colores por categoría */}
      {resources.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4">
          {Array.from(
            new Map(resources.filter((r) => r.category).map((r) => [r.categoryId, r.category!])).values()
          ).map((cat) => (
            <div key={cat.id} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: cat.color ?? '#6b7280' }}
              />
              <span className="text-xs text-gray-600">{cat.name}</span>
            </div>
          ))}
          {trainings.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="text-xs text-gray-600">Capacitación</span>
            </div>
          )}
          {certSessions.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#7c3aed' }} />
              <span className="text-xs text-gray-600">Sesión Certificación</span>
            </div>
          )}
        </div>
      )}

      {!calendarReady ? (
        <LoadingSpinner size="lg" />
      ) : (
        <CalendarView
          bookings={bookings}
          trainings={trainings}
          certSessions={isAdmin ? certSessions : []}
          isAdmin={isAdmin}
          businessHours={businessHours}
          onSlotClick={handleSlotClick}
          onTrainingClick={handleTrainingClick}
        />
      )}

      {/* Mini-dialog de elección (solo admin) */}
      {actionChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">¿Qué deseas crear?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Horario:{' '}
              <span className="font-medium text-gray-700">
                {actionChoice.date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })}{' '}
                {String(actionChoice.date.getHours()).padStart(2, '0')}:{String(actionChoice.date.getMinutes()).padStart(2, '0')}
              </span>
            </p>
            <div className="space-y-2">
              <button
                onClick={handleChooseBooking}
                className="w-full py-3 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                Nueva Reserva
              </button>
              <button
                onClick={handleChooseTraining}
                className="w-full py-3 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors"
              >
                Bloquear para Capacitación
              </button>
              <button
                onClick={() => setActionChoice(null)}
                className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <BookingModal
        isOpen={bookingModalOpen}
        onClose={handleBookingModalClose}
        preselectedDate={selectedDate}
      />

      <TrainingModal
        isOpen={trainingModalOpen}
        onClose={handleTrainingModalClose}
        onSaved={handleTrainingSaved}
        preselectedDate={selectedDate}
        preselectedHour={selectedHour}
      />
    </div>
  );
}
