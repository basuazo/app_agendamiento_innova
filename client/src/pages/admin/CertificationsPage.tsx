import { useEffect, useMemo, useState } from 'react';
import { CertificationRequest, Certification } from '../../types';
import { certificationService } from '../../services/certification.service';
import { formatDateTime } from '../../utils/dateHelpers';
import { useAuthStore } from '../../store/authStore';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import SortableHeader, { SortState, toggleSort, compareVals } from '../../components/shared/SortableHeader';
import toast from 'react-hot-toast';

type Tab = 'requests' | 'scheduled' | 'certified';

export default function CertificationsPage() {
  const { currentSpaceId } = useAuthStore();
  const [tab, setTab] = useState<Tab>('requests');
  const [pendingRequests, setPendingRequests] = useState<CertificationRequest[]>([]);
  const [scheduledRequests, setScheduledRequests] = useState<CertificationRequest[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState | null>(null);
  const handleSort = (key: string) => setSort(toggleSort(sort, key));

  // Scheduling state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduling, setScheduling] = useState(false);

  // Resolve state
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // Revoke state
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = async () => {
    try {
      setIsLoading(true);
      const [pending, scheduled, certs] = await Promise.all([
        certificationService.getAllRequests('PENDING'),
        certificationService.getAllRequests('SCHEDULED'),
        certificationService.getAllCertifications(),
      ]);
      setPendingRequests(pending);
      setScheduledRequests(scheduled);
      setCertifications(certs);
    } catch {
      toast.error('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [currentSpaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else if (next.size < 10) next.add(id);
    else toast.error('Máximo 10 usuarias por sesión');
    setSelectedIds(next);
  };

  const handleSchedule = async () => {
    if (!selectedIds.size) { toast.error('Selecciona al menos una solicitud'); return; }
    if (!scheduledDate) { toast.error('Selecciona una fecha para la sesión'); return; }
    setScheduling(true);
    try {
      await certificationService.scheduleSession(Array.from(selectedIds), new Date(scheduledDate).toISOString());
      toast.success(`Sesión programada para ${selectedIds.size} usuaria(s)`);
      setSelectedIds(new Set());
      setScheduledDate('');
      load();
    } catch {
      toast.error('Error al programar sesión');
    } finally {
      setScheduling(false);
    }
  };

  const handleResolve = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    if (status === 'REJECTED' && !confirm('¿Rechazar esta solicitud?')) return;
    setResolvingId(id);
    try {
      await certificationService.resolveRequest(id, status);
      toast.success(status === 'APPROVED' ? 'Certificación otorgada' : 'Solicitud rechazada');
      load();
    } catch {
      toast.error('Error al resolver solicitud');
    } finally {
      setResolvingId(null);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('¿Revocar esta certificación?')) return;
    setRevokingId(id);
    try {
      await certificationService.revokeCertification(id);
      toast.success('Certificación revocada');
      load();
    } catch {
      toast.error('Error al revocar');
    } finally {
      setRevokingId(null);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const displayPending = useMemo(() => {
    const q = search.toLowerCase();
    const list = q
      ? pendingRequests.filter((r) =>
          (r.user?.name ?? '').toLowerCase().includes(q) ||
          (r.user?.email ?? '').toLowerCase().includes(q) ||
          (r.category?.name ?? '').toLowerCase().includes(q)
        )
      : pendingRequests;
    if (!sort) return list;
    return [...list].sort((a, b) => {
      const val = (x: typeof a) =>
        sort.key === 'user' ? (x.user?.name ?? '') :
        sort.key === 'category' ? (x.category?.name ?? '') :
        sort.key === 'createdAt' ? x.createdAt : '';
      return compareVals(val(a), val(b), sort.dir);
    });
  }, [pendingRequests, search, sort]);

  const displayScheduled = useMemo(() => {
    const q = search.toLowerCase();
    const list = q
      ? scheduledRequests.filter((r) =>
          (r.user?.name ?? '').toLowerCase().includes(q) ||
          (r.user?.email ?? '').toLowerCase().includes(q) ||
          (r.category?.name ?? '').toLowerCase().includes(q)
        )
      : scheduledRequests;
    if (!sort) return list;
    return [...list].sort((a, b) => {
      const val = (x: typeof a) =>
        sort.key === 'user' ? (x.user?.name ?? '') :
        sort.key === 'category' ? (x.category?.name ?? '') :
        sort.key === 'scheduledDate' ? (x.scheduledDate ?? '') : '';
      return compareVals(val(a), val(b), sort.dir);
    });
  }, [scheduledRequests, search, sort]);

  const displayCertified = useMemo(() => {
    const q = search.toLowerCase();
    const list = q
      ? certifications.filter((c) =>
          (c.user?.name ?? '').toLowerCase().includes(q) ||
          (c.user?.email ?? '').toLowerCase().includes(q) ||
          (c.category?.name ?? '').toLowerCase().includes(q)
        )
      : certifications;
    if (!sort) return list;
    return [...list].sort((a, b) => {
      const val = (x: typeof a) =>
        sort.key === 'user' ? (x.user?.name ?? '') :
        sort.key === 'category' ? (x.category?.name ?? '') :
        sort.key === 'certifiedAt' ? x.certifiedAt : '';
      return compareVals(val(a), val(b), sort.dir);
    });
  }, [certifications, search, sort]);

  const tabLabels: Record<Tab, string> = {
    requests: `Solicitudes${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}`,
    scheduled: `Programadas${scheduledRequests.length > 0 ? ` (${scheduledRequests.length})` : ''}`,
    certified: `Certificadas (${certifications.length})`,
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Gestión de Certificaciones</h1>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {(['requests', 'scheduled', 'certified'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setSort(null); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
              {tabLabels[t]}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por usuaria o categoría..."
          className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* ── Tab: Solicitudes PENDING ── */}
          {tab === 'requests' && (
            <div>
              {pendingRequests.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-sm">No hay solicitudes pendientes</div>
              ) : (
                <>
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
                    <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={selectedIds.size === pendingRequests.length && pendingRequests.length > 0}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const ids = pendingRequests.slice(0, 10).map((r) => r.id);
                                  setSelectedIds(new Set(ids));
                                } else {
                                  setSelectedIds(new Set());
                                }
                              }}
                              className="w-4 h-4"
                            />
                          </th>
                          <SortableHeader label="Usuaria" sortKey="user" sort={sort} onSort={handleSort} className="text-left" />
                          <SortableHeader label="Categoría" sortKey="category" sort={sort} onSort={handleSort} className="text-left" />
                          <SortableHeader label="Solicitada" sortKey="createdAt" sort={sort} onSort={handleSort} className="text-left" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {displayPending.map((r) => (
                          <tr key={r.id} className={selectedIds.has(r.id) ? 'bg-brand-50' : ''}>
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(r.id)}
                                onChange={() => toggleSelect(r.id)}
                                className="w-4 h-4"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900">{r.user?.name}</p>
                              <p className="text-xs text-gray-400">{r.user?.email}</p>
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {r.category?.name ?? '—'}
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs">
                              {formatDateTime(r.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>

                  {/* Programar sesión */}
                  <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-brand-900">
                        {selectedIds.size > 0
                          ? `${selectedIds.size} usuaria(s) seleccionada(s) — máx. 10`
                          : 'Selecciona usuarias para programar una sesión'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="datetime-local"
                        value={scheduledDate}
                        min={today}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <button
                        onClick={handleSchedule}
                        disabled={scheduling || !selectedIds.size || !scheduledDate}
                        className="px-4 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-60 transition-colors whitespace-nowrap"
                      >
                        {scheduling ? 'Programando...' : 'Programar Sesión'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Tab: Programadas SCHEDULED ── */}
          {tab === 'scheduled' && (
            <div>
              {scheduledRequests.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-sm">No hay sesiones programadas</div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <SortableHeader label="Usuaria" sortKey="user" sort={sort} onSort={handleSort} className="text-left" />
                        <SortableHeader label="Categoría" sortKey="category" sort={sort} onSort={handleSort} className="text-left" />
                        <SortableHeader label="Fecha Sesión" sortKey="scheduledDate" sort={sort} onSort={handleSort} className="text-left" />
                        <th className="px-4 py-3 text-right font-medium text-gray-600">Resolución</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {displayScheduled.map((r) => (
                        <tr key={r.id}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{r.user?.name}</p>
                            <p className="text-xs text-gray-400">{r.user?.email}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {r.category?.name ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {r.scheduledDate ? formatDateTime(r.scheduledDate) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleResolve(r.id, 'APPROVED')}
                                disabled={resolvingId === r.id}
                                className="text-xs text-emerald-600 hover:text-emerald-800 font-medium disabled:opacity-60"
                              >
                                {resolvingId === r.id ? '...' : 'Aprobar'}
                              </button>
                              <button
                                onClick={() => handleResolve(r.id, 'REJECTED')}
                                disabled={resolvingId === r.id}
                                className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-60"
                              >
                                {resolvingId === r.id ? '...' : 'Rechazar'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Certificadas ── */}
          {tab === 'certified' && (
            <div>
              {certifications.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-sm">No hay certificaciones registradas</div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <SortableHeader label="Usuaria" sortKey="user" sort={sort} onSort={handleSort} className="text-left" />
                        <SortableHeader label="Categoría" sortKey="category" sort={sort} onSort={handleSort} className="text-left" />
                        <SortableHeader label="Certificada" sortKey="certifiedAt" sort={sort} onSort={handleSort} className="text-left" />
                        <th className="px-4 py-3 text-right font-medium text-gray-600">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {displayCertified.map((c) => (
                        <tr key={c.id}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{c.user?.name ?? '—'}</p>
                            <p className="text-xs text-gray-400">{c.user?.email ?? ''}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {c.category?.name ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {formatDateTime(c.certifiedAt)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleRevoke(c.id)}
                              disabled={revokingId === c.id}
                              className="text-xs text-red-400 hover:text-red-600 font-medium disabled:opacity-60"
                            >
                              {revokingId === c.id ? '...' : 'Revocar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
