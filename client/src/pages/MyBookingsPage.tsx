import { useEffect, useState } from 'react';
import { useBookingStore } from '../store/bookingStore';
import { Booking } from '../types';
import { formatDateTime, PURPOSE_LABELS } from '../utils/dateHelpers';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import toast from 'react-hot-toast';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  CONFIRMED:  { label: 'Confirmada',  className: 'bg-green-100 text-green-700' },
  PENDING:    { label: 'Pend. aprobación', className: 'bg-amber-100 text-amber-700' },
  CANCELLED:  { label: 'Cancelada',   className: 'bg-red-100 text-red-600' },
  REJECTED:   { label: 'Rechazada',   className: 'bg-red-100 text-red-700' },
};

export default function MyBookingsPage() {
  const { myBookings, fetchMine, cancel, isLoading } = useBookingStore();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [tab, setTab] = useState<'upcoming' | 'history'>('upcoming');

  useEffect(() => {
    fetchMine();
  }, [fetchMine]);

  const now = new Date();
  const upcoming = myBookings.filter(
    (b) => (b.status === 'CONFIRMED' || b.status === 'PENDING') && new Date(b.startTime) > now
  );
  const history = myBookings.filter(
    (b) => b.status === 'CANCELLED' || b.status === 'REJECTED' || new Date(b.startTime) <= now
  );

  const handleCancel = async (id: string) => {
    if (!confirm('¿Seguro que deseas cancelar esta reserva?')) return;
    setCancellingId(id);
    try {
      await cancel(id);
      toast.success('Reserva cancelada');
      fetchMine();
    } catch {
      toast.error('Error al cancelar la reserva');
    } finally {
      setCancellingId(null);
    }
  };

  const displayList = tab === 'upcoming' ? upcoming : history;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mis Reservas</h1>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
        <button
          onClick={() => setTab('upcoming')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'upcoming' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Próximas ({upcoming.length})
        </button>
        <button
          onClick={() => setTab('history')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Historial ({history.length})
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : displayList.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm">No hay reservas en esta sección</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayList.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              onCancel={tab === 'upcoming' ? handleCancel : undefined}
              isCancelling={cancellingId === b.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BookingCard({
  booking: b,
  onCancel,
  isCancelling,
}: {
  booking: Booking;
  onCancel?: (id: string) => void;
  isCancelling: boolean;
}) {
  const badge = STATUS_BADGE[b.status] ?? { label: b.status, className: 'bg-gray-100 text-gray-600' };

  return (
    <div className={`bg-white rounded-xl border p-4 flex items-start gap-4 ${
      b.status === 'CANCELLED' || b.status === 'REJECTED' ? 'opacity-60 border-gray-200' : 'border-gray-100 shadow-sm'
    }`}>
      <div
        className="w-3 h-full min-h-12 rounded-full flex-shrink-0 mt-1"
        style={{ backgroundColor: b.resource.category?.color ?? '#6b7280' }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-gray-900">{b.resource.name}</p>
            <p className="text-sm text-gray-500">{formatDateTime(b.startTime)} — {formatDateTime(b.endTime).split(' ')[1]}</p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${badge.className}`}>
            {badge.label}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap gap-2">
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {PURPOSE_LABELS[b.purpose]}
          </span>
          {b.purpose === 'PRODUCE' && b.produceItem && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
              {b.produceItem} x{b.produceQty}
            </span>
          )}
          {b.notes && (
            <span className="text-xs text-gray-400 italic truncate max-w-xs">{b.notes}</span>
          )}
        </div>
      </div>
      {onCancel && (b.status === 'CONFIRMED' || b.status === 'PENDING') && (
        <button
          onClick={() => onCancel(b.id)}
          disabled={isCancelling}
          className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-60 flex-shrink-0"
        >
          {isCancelling ? '...' : 'Cancelar'}
        </button>
      )}
    </div>
  );
}
