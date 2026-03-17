import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Training } from '../../types';
import { trainingService } from '../../services/training.service';
import TrainingModal from '../../components/admin/TrainingModal';
import ConfirmModal from '../../components/shared/ConfirmModal';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import toast from 'react-hot-toast';

export default function TrainingsPage() {
  const { currentSpaceId } = useAuthStore();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Training | null>(null);
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');

  const load = async () => {
    try {
      setIsLoading(true);
      const data = await trainingService.getAll();
      setTrainings(data);
    } catch {
      toast.error('Error al cargar capacitaciones');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [currentSpaceId]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await trainingService.remove(confirmDelete.id);
      toast.success('Capacitación eliminada');
      setConfirmDelete(null);
      setExpanded(null);
      load();
    } catch {
      toast.error('Error al eliminar la capacitación');
    }
  };

  const now = new Date();
  const filtered = trainings.filter((t) => {
    const end = new Date(t.endTime);
    if (filter === 'upcoming') return end >= now;
    if (filter === 'past') return end < now;
    return true;
  });

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Capacitaciones</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Gestión de sesiones y listado de inscritas
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Capacitación
        </button>
      </div>

      {/* Filtro */}
      <div className="flex gap-2 mb-5">
        {(['upcoming', 'past', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-amber-500 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f === 'upcoming' ? 'Próximas' : f === 'past' ? 'Pasadas' : 'Todas'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-sm">No hay capacitaciones {filter === 'upcoming' ? 'próximas' : filter === 'past' ? 'pasadas' : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const confirmedCount = t.enrollments.filter((e) => e.status === 'CONFIRMED').length;
            const waitlistCount = t.enrollments.filter((e) => e.status === 'WAITLIST').length;
            const isPast = new Date(t.endTime) < now;
            const isExpanded = expanded === t.id;

            return (
              <div key={t.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Cabecera */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-gray-900 text-sm">{t.title}</h3>
                        {isPast && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Pasada</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 capitalize">{fmtDate(t.startTime)}</p>
                      <p className="text-xs text-gray-500">
                        {fmtTime(t.startTime)} – {fmtTime(t.endTime)}
                      </p>
                      {t.description && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{t.description}</p>
                      )}
                    </div>

                    {/* Cupos */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-800">
                        {confirmedCount}/{t.capacity}
                      </p>
                      <p className="text-xs text-gray-400">cupos</p>
                      {waitlistCount > 0 && (
                        <p className="text-xs text-amber-600 mt-0.5">{waitlistCount} en espera</p>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => setExpanded(isExpanded ? null : t.id)}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                    >
                      {isExpanded ? 'Ocultar inscritas' : `Ver inscritas (${t.enrollments.length})`}
                    </button>
                    <span className="text-gray-200">|</span>
                    <button
                      onClick={() => setConfirmDelete(t)}
                      className="text-xs text-red-400 hover:text-red-600 font-medium"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                {/* Lista de inscritas expandible */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                    {t.enrollments.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-2">Sin inscritas aún</p>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Inscritas ({t.enrollments.length})
                        </p>
                        {t.enrollments.map((e, idx) => (
                          <div key={e.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 w-5">{idx + 1}.</span>
                              <div>
                                <p className="text-sm text-gray-800">{e.user.name}</p>
                                <p className="text-xs text-gray-400">{e.user.email}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                e.status === 'CONFIRMED'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}>
                                {e.status === 'CONFIRMED' ? 'Confirmada' : 'En espera'}
                              </span>
                              <span className="text-xs text-gray-400">{fmt(e.createdAt)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <TrainingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
      />

      {confirmDelete && (
        <ConfirmModal
          title="Eliminar capacitación"
          message={`¿Eliminar "${confirmDelete.title}"? Se perderán todas las inscripciones. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
