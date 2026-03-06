import { useEffect, useState } from 'react';
import { Booking } from '../../types';
import { bookingService } from '../../services/booking.service';
import { formatDateTime, PURPOSE_LABELS, RESOURCE_CATEGORY_COLORS } from '../../utils/dateHelpers';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import toast from 'react-hot-toast';

type FilterType = 'ALL' | 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'REJECTED';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  CONFIRMED: { label: 'Confirmada',  className: 'bg-green-100 text-green-700' },
  PENDING:   { label: 'Pendiente',   className: 'bg-amber-100 text-amber-700' },
  CANCELLED: { label: 'Cancelada',   className: 'bg-red-100 text-red-500' },
  REJECTED:  { label: 'Rechazada',   className: 'bg-red-100 text-red-700' },
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    try {
      setIsLoading(true);
      const data = await bookingService.getAdminAll();
      setBookings(data);
    } catch {
      toast.error('Error al cargar reservas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await bookingService.exportExcel();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'reservas.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al exportar');
    } finally {
      setExporting(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('¿Cancelar esta reserva?')) return;
    setCancellingId(id);
    try {
      await bookingService.cancel(id);
      toast.success('Reserva cancelada');
      load();
    } catch {
      toast.error('Error al cancelar');
    } finally {
      setCancellingId(null);
    }
  };

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      await bookingService.approve(id);
      toast.success('Reserva aprobada');
      load();
    } catch {
      toast.error('Error al aprobar');
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('¿Rechazar esta reserva?')) return;
    setRejectingId(id);
    try {
      await bookingService.reject(id);
      toast.success('Reserva rechazada');
      load();
    } catch {
      toast.error('Error al rechazar');
    } finally {
      setRejectingId(null);
    }
  };

  const pendingCount = bookings.filter((b) => b.status === 'PENDING').length;
  const filtered = bookings.filter((b) => filter === 'ALL' || b.status === filter);

  const filterLabels: Record<FilterType, string> = {
    ALL: 'Todas',
    PENDING: `Pendientes${pendingCount > 0 ? ` (${pendingCount})` : ''}`,
    CONFIRMED: 'Confirmadas',
    CANCELLED: 'Canceladas',
    REJECTED: 'Rechazadas',
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Todas las Reservas</h1>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {exporting ? 'Exportando...' : 'Exportar Excel'}
        </button>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6 flex-wrap">
        {(['ALL', 'PENDING', 'CONFIRMED', 'CANCELLED', 'REJECTED'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Recurso</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Usuario</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha y Hora</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Propósito</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((b) => {
                  const badge = STATUS_BADGE[b.status] ?? { label: b.status, className: 'bg-gray-100 text-gray-600' };
                  return (
                    <tr key={b.id} className={b.status === 'CANCELLED' || b.status === 'REJECTED' ? 'opacity-60' : ''}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: RESOURCE_CATEGORY_COLORS[b.resource.category] ?? '#6b7280' }}
                          />
                          <span className="font-medium text-gray-900">{b.resource.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-900">{b.user.name}</p>
                        <p className="text-xs text-gray-400">{b.user.email}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatDateTime(b.startTime)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {PURPOSE_LABELS[b.purpose]}
                        </span>
                        {b.purpose === 'PRODUCE' && b.produceItem && (
                          <p className="text-xs text-gray-400 mt-0.5">{b.produceItem} x{b.produceQty}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {b.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleApprove(b.id)}
                                disabled={approvingId === b.id}
                                className="text-xs text-emerald-600 hover:text-emerald-800 font-medium disabled:opacity-60"
                              >
                                {approvingId === b.id ? '...' : 'Aprobar'}
                              </button>
                              <button
                                onClick={() => handleReject(b.id)}
                                disabled={rejectingId === b.id}
                                className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-60"
                              >
                                {rejectingId === b.id ? '...' : 'Rechazar'}
                              </button>
                            </>
                          )}
                          {b.status === 'CONFIRMED' && (
                            <button
                              onClick={() => handleCancel(b.id)}
                              disabled={cancellingId === b.id}
                              className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-60"
                            >
                              {cancellingId === b.id ? '...' : 'Cancelar'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-sm">No hay reservas en esta sección</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
