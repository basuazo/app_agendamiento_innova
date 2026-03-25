import { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { Booking, Training, CertificationRequest, BusinessHours } from '../../types';
import { PURPOSE_LABELS, formatTimeInput } from '../../utils/dateHelpers';
import { UpdateBookingDto } from '../../services/booking.service';
import { format } from 'date-fns';

// ─── Tipos ──────────────────────────────────────────────────────────────────

type ClusterItem =
  | { kind: 'booking'; booking: Booking }
  | { kind: 'training'; training: Training }
  | { kind: 'certSession'; requests: CertificationRequest[] };

interface VisibleFCEvent {
  id: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  editable?: boolean;
  extendedProps: {
    kind: 'booking' | 'training' | 'certSession';
    booking?: Booking;
    training?: Training;
    requests?: CertificationRequest[];
  };
}

// ─── Utilidades ──────────────────────────────────────────────────────────────

function isWithinBusinessHours(date: Date, businessHours: BusinessHours[]): boolean {
  const dayOfWeek = date.getDay();
  const bh = businessHours.find((d) => d.dayOfWeek === dayOfWeek);
  if (!bh || !bh.isOpen) return false;
  const slotMinutes = date.getHours() * 60 + date.getMinutes();
  const [openH, openM] = bh.openTime.split(':').map(Number);
  const [closeH, closeM] = bh.closeTime.split(':').map(Number);
  return slotMinutes >= openMinutes(openH, openM) && slotMinutes < openMinutes(closeH, closeM);
}
function openMinutes(h: number, m: number) { return h * 60 + m; }

const isValidTime = (t: string) => /^\d{2}:\d{2}$/.test(t);

/**
 * Agrupa eventos visibles que se solapan en el tiempo usando union-find.
 * Grupos de 2+ → un único evento "cluster".
 * Grupos de 1 → el evento original sin cambios.
 */
function clusterVisibleEvents(events: VisibleFCEvent[]): (VisibleFCEvent | ReturnType<typeof makeClusterEvent>)[] {
  if (events.length === 0) return [];

  const n = events.length;
  const parent = Array.from({ length: n }, (_, i) => i);

  function find(i: number): number {
    if (parent[i] !== i) parent[i] = find(parent[i]);
    return parent[i];
  }
  function union(i: number, j: number) { parent[find(i)] = find(j); }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sA = new Date(events[i].start).getTime();
      const eA = new Date(events[i].end).getTime();
      const sB = new Date(events[j].start).getTime();
      const eB = new Date(events[j].end).getTime();
      if (sA < eB && eA > sB) union(i, j);
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(i);
  }

  const result: (VisibleFCEvent | ReturnType<typeof makeClusterEvent>)[] = [];
  for (const [, indices] of groups) {
    if (indices.length === 1) {
      result.push(events[indices[0]]);
    } else {
      const group = indices.map((i) => events[i]);
      result.push(makeClusterEvent(group));
    }
  }
  return result;
}

function makeClusterEvent(group: VisibleFCEvent[]) {
  const minStart = group.reduce((m, e) => (e.start < m ? e.start : m), group[0].start);
  const maxEnd   = group.reduce((m, e) => (e.end   > m ? e.end   : m), group[0].end);
  const items: ClusterItem[] = group.map((e) => {
    if (e.extendedProps.kind === 'booking')    return { kind: 'booking',    booking:    e.extendedProps.booking! };
    if (e.extendedProps.kind === 'training')   return { kind: 'training',   training:   e.extendedProps.training! };
    /* certSession */ return { kind: 'certSession', requests: e.extendedProps.requests! };
  });
  return {
    id: `cluster-${group.map((e) => e.id).join('_')}`,
    start: minStart,
    end: maxEnd,
    backgroundColor: '#475569',
    borderColor: '#334155',
    textColor: '#fff',
    editable: false as const,
    extendedProps: { isCluster: true as const, clusterItems: items },
  };
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  bookings: Booking[];
  trainings?: Training[];
  certSessions?: CertificationRequest[];
  isAdmin?: boolean;
  currentUserId?: string;
  businessHours?: BusinessHours[];
  onSlotClick: (date: Date) => void;
  onTrainingClick?: (training: Training) => void;
  onCancelBooking?: (id: string) => Promise<void>;
  onUpdateBooking?: (id: string, data: UpdateBookingDto) => Promise<void>;
  onCancelCertSession?: (requestIds: string[]) => Promise<void>;
}

// ─── Componente ──────────────────────────────────────────────────────────────

type DetailModal =
  | { kind: 'booking'; booking: Booking }
  | { kind: 'certSession'; requests: CertificationRequest[] }
  | null;

type ClusterModal = { date: Date; items: ClusterItem[] } | null;

export default function CalendarView({
  bookings,
  trainings = [],
  certSessions = [],
  isAdmin = false,
  currentUserId,
  businessHours = [],
  onSlotClick,
  onTrainingClick,
  onCancelBooking,
  onUpdateBooking,
  onCancelCertSession,
}: Props) {
  const [detail, setDetail] = useState<DetailModal>(null);
  const [clusterModal, setClusterModal] = useState<ClusterModal>(null);
  const [showClosedPopup, setShowClosedPopup] = useState(false);

  // Estado del formulario de edición de reserva
  const [editMode, setEditMode] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmCancelBooking, setConfirmCancelBooking] = useState(false);
  const [cancelCertLoading, setCancelCertLoading] = useState(false);

  const openEditMode = (b: Booking) => {
    const start = new Date(b.startTime);
    const end = new Date(b.endTime);
    setEditDate(format(start, 'yyyy-MM-dd'));
    setEditStart(`${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`);
    setEditEnd(`${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`);
    setEditNotes(b.notes ?? '');
    setEditError(null);
    setConfirmCancelBooking(false);
    setEditMode(true);
  };

  const closeDetail = () => {
    setDetail(null);
    setEditMode(false);
    setEditError(null);
    setConfirmCancelBooking(false);
  };

  const handleEditSave = async () => {
    if (!detail || detail.kind !== 'booking') return;
    if (!isValidTime(editStart) || !isValidTime(editEnd)) {
      setEditError('Las horas deben estar en formato HH:MM');
      return;
    }
    if (editEnd <= editStart) {
      setEditError('La hora de fin debe ser posterior a la hora de inicio');
      return;
    }
    setEditLoading(true);
    setEditError(null);
    try {
      const startIso = new Date(`${editDate}T${editStart}:00`).toISOString();
      const endIso   = new Date(`${editDate}T${editEnd}:00`).toISOString();
      await onUpdateBooking!(detail.booking.id, {
        startTime: startIso, endTime: endIso, notes: editNotes,
        localDate: editDate, localStartTime: editStart, localEndTime: editEnd,
      });
      closeDetail();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setEditError(msg ?? 'Error al actualizar la reserva');
    } finally {
      setEditLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!detail || detail.kind !== 'booking') return;
    setEditLoading(true);
    try {
      await onCancelBooking!(detail.booking.id);
      closeDetail();
    } catch {
      setEditError('Error al cancelar la reserva');
    } finally {
      setEditLoading(false);
    }
  };

  const handleCancelCertSession = async () => {
    if (!detail || detail.kind !== 'certSession') return;
    setCancelCertLoading(true);
    try {
      await onCancelCertSession!(detail.requests.map((r) => r.id));
      closeDetail();
    } catch {
      // error gestionado vía toast en CalendarPage
    } finally {
      setCancelCertLoading(false);
    }
  };

  const handleClusterItemClick = (item: ClusterItem) => {
    setClusterModal(null);
    if (item.kind === 'booking') {
      setDetail({ kind: 'booking', booking: item.booking });
    } else if (item.kind === 'training') {
      if (onTrainingClick) onTrainingClick(item.training);
    } else {
      setDetail({ kind: 'certSession', requests: item.requests });
    }
  };

  // ─── Eventos de calendario ──────────────────────────────────────────────

  // Mapa de sesiones de certificación (reutilizado en dateClick)
  const sessionMap = useMemo(() => {
    const map = new Map<string, CertificationRequest[]>();
    for (const r of certSessions) {
      if (!r.scheduledDate) continue;
      if (!map.has(r.scheduledDate)) map.set(r.scheduledDate, []);
      map.get(r.scheduledDate)!.push(r);
    }
    return map;
  }, [certSessions]);

  // Eventos visibles (no-background) antes de agrupar
  const rawVisibleEvents = useMemo<VisibleFCEvent[]>(() => {
    const all: VisibleFCEvent[] = [];

    bookings.forEach((b) => {
      const color = b.resource.category?.color ?? '#6b7280';
      all.push({
        id: `booking-${b.id}`,
        start: b.startTime,
        end: b.endTime,
        backgroundColor: color,
        borderColor: color,
        textColor: '#fff',
        extendedProps: { kind: 'booking', booking: b },
      });
    });

    trainings.forEach((t) => {
      all.push({
        id: `training-label-${t.id}`,
        start: t.startTime,
        end: t.endTime,
        backgroundColor: '#f59e0b',
        borderColor: '#d97706',
        textColor: '#fff',
        editable: false,
        extendedProps: { kind: 'training', training: t },
      });
    });

    sessionMap.forEach((reqs, date) => {
      all.push({
        id: `cert-session-${date}`,
        start: date,
        end: new Date(new Date(date).getTime() + 60 * 60 * 1000).toISOString(),
        backgroundColor: '#7c3aed',
        borderColor: '#6d28d9',
        textColor: '#fff',
        editable: false,
        extendedProps: { kind: 'certSession', requests: reqs },
      });
    });

    return all;
  }, [bookings, trainings, sessionMap]);

  // Eventos agrupados + fondos de capacitación
  const events = useMemo(() => {
    const bgEvents = trainings.map((t) => ({
      id: `training-bg-${t.id}`,
      start: t.startTime,
      end: t.endTime,
      display: 'background' as const,
      color: '#fef3c7',
      extendedProps: { kind: 'trainingBg' as const, training: t },
    }));

    return [...bgEvents, ...clusterVisibleEvents(rawVisibleEvents)];
  }, [rawVisibleEvents, trainings]);

  // ─── Horarios de negocio FullCalendar ───────────────────────────────────

  const fcBusinessHours = businessHours.length > 0
    ? businessHours.filter((bh) => bh.isOpen).map((bh) => ({
        daysOfWeek: [bh.dayOfWeek],
        startTime: bh.openTime,
        endTime: bh.closeTime,
      }))
    : [{ daysOfWeek: [1, 2, 3, 4, 5, 6], startTime: '09:00', endTime: '17:00' }];

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleDateClick = (info: { date: Date }) => {
    const date = info.date;
    if (businessHours.length > 0 && !isWithinBusinessHours(date, businessHours)) {
      setShowClosedPopup(true);
      return;
    }

    const ms = date.getTime();
    const items: ClusterItem[] = [];

    bookings.forEach((b) => {
      if (ms >= new Date(b.startTime).getTime() && ms < new Date(b.endTime).getTime())
        items.push({ kind: 'booking', booking: b });
    });
    trainings.forEach((t) => {
      if (ms >= new Date(t.startTime).getTime() && ms < new Date(t.endTime).getTime())
        items.push({ kind: 'training', training: t });
    });
    sessionMap.forEach((reqs, dateKey) => {
      const start = new Date(dateKey).getTime();
      if (ms >= start && ms < start + 60 * 60 * 1000)
        items.push({ kind: 'certSession', requests: reqs });
    });

    if (items.length > 0) {
      setClusterModal({ date, items });
    } else {
      onSlotClick(date);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .fc-timegrid-slot-lane {
          cursor: pointer;
          position: relative;
        }
        .fc-timegrid-slot-lane:hover::after {
          content: '+';
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: #d1d5db;
          font-size: 16px;
          font-weight: 700;
          pointer-events: none;
          line-height: 1;
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={isMobile ? 'timeGridDay' : 'timeGridWeek'}
          locale={esLocale}
          headerToolbar={isMobile ? {
            left: 'prev,next', center: 'title', right: 'timeGridDay,timeGridWeek',
          } : {
            left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={events}
          slotMinTime="08:00:00"
          slotMaxTime="18:00:00"
          slotDuration="00:30:00"
          slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          allDaySlot={false}
          weekends={true}
          height="auto"
          dateClick={handleDateClick}
          businessHours={fcBusinessHours}
          eventContent={(eventInfo) => {
            const props = eventInfo.event.extendedProps;

            // Cluster
            if (props.isCluster) {
              const items = props.clusterItems as ClusterItem[];
              const typeLabels = items.map((it) =>
                it.kind === 'booking' ? it.booking.resource.name
                : it.kind === 'training' ? it.training.title
                : 'Certificación'
              );
              return (
                <div className="p-1 overflow-hidden">
                  <p className="font-semibold text-xs">{items.length} actividades</p>
                  <p className="text-xs opacity-80 truncate">{typeLabels.join(' · ')}</p>
                </div>
              );
            }

            // Background (training)
            if (props.kind === 'trainingBg') return null;

            // Training label individual
            if (props.kind === 'training') {
              const t = props.training as Training;
              return (
                <div className="p-1 overflow-hidden">
                  <p className="font-semibold text-xs truncate">{t.title}</p>
                  {t.exemptions.length > 0 && (
                    <p className="text-xs opacity-80 truncate">
                      Libre: {t.exemptions.map((e) => e.resource.name).join(', ')}
                    </p>
                  )}
                  {isAdmin && <p className="text-xs opacity-70 italic">Click para gestionar</p>}
                </div>
              );
            }

            // Cert session individual
            if (props.kind === 'certSession') {
              const reqs = props.requests as CertificationRequest[];
              return (
                <div className="p-1 overflow-hidden">
                  <p className="font-semibold text-xs truncate">Sesión de Certificación</p>
                  <p className="text-xs opacity-90">{reqs.length} usuaria{reqs.length !== 1 ? 's' : ''}</p>
                </div>
              );
            }

            // Booking individual
            const b = props.booking as Booking;
            return (
              <div className="p-1 overflow-hidden h-full flex flex-col justify-between">
                <div>
                  <p className="font-semibold text-xs truncate">{b.resource.name}</p>
                  <p className="text-xs opacity-90 truncate">{b.user.name}</p>
                  <p className="text-xs opacity-75">{PURPOSE_LABELS[b.purpose]}</p>
                </div>
              </div>
            );
          }}
          eventClick={(info) => {
            const props = info.event.extendedProps;
            if (props.kind === 'trainingBg') return;

            if (props.isCluster) {
              setClusterModal({ date: info.event.start!, items: props.clusterItems as ClusterItem[] });
              return;
            }
            if (props.kind === 'certSession') {
              setDetail({ kind: 'certSession', requests: props.requests as CertificationRequest[] });
              return;
            }
            if (props.kind === 'training') {
              if (onTrainingClick) onTrainingClick(props.training as Training);
              return;
            }
            if (props.kind === 'booking') {
              setDetail({ kind: 'booking', booking: props.booking as Booking });
            }
          }}
          nowIndicator
        />
      </div>

      {/* ── Popup: horario no disponible ────────────────────────────────── */}
      {showClosedPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setShowClosedPopup(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Horario no disponible</h3>
                <p className="text-sm text-gray-600">
                  No se puede agendar en este horario. Ponte en contacto con un administrador.
                </p>
              </div>
            </div>
            <button onClick={() => setShowClosedPopup(false)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-lg transition-colors">
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* ── Modal de actividades agrupadas (cluster) ─────────────────────── */}
      {clusterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setClusterModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 capitalize">
                  {clusterModal.date.toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'long' })}
                </h3>
                <p className="text-sm text-gray-500">
                  {clusterModal.items.length} actividad{clusterModal.items.length !== 1 ? 'es' : ''} en este horario
                </p>
              </div>
              <button onClick={() => setClusterModal(null)}
                className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full p-1 -m-1 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <ul className="space-y-1.5 mb-4">
              {clusterModal.items.map((item, i) => (
                <li key={i}>
                  <button
                    onClick={() => handleClusterItemClick(item)}
                    className="w-full text-left bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-2.5 text-sm transition-colors"
                  >
                    {item.kind === 'booking' && (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.booking.resource.category?.color ?? '#6b7280' }} />
                          <span className="font-medium text-gray-900">{item.booking.resource.name}</span>
                          <span className="text-gray-300">·</span>
                          <span className="text-gray-600 truncate">{item.booking.user.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 ml-4">
                          <p className="text-xs text-gray-400">{PURPOSE_LABELS[item.booking.purpose]}</p>
                          <span className="text-gray-300">·</span>
                          <p className="text-xs text-gray-400">
                            {new Date(item.booking.startTime).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })}
                            {' – '}
                            {new Date(item.booking.endTime).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </p>
                        </div>
                      </>
                    )}
                    {item.kind === 'training' && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0 bg-amber-400" />
                        <span className="font-medium text-gray-900">{item.training.title}</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-xs text-amber-600">Capacitación</span>
                      </div>
                    )}
                    {item.kind === 'certSession' && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0 bg-purple-500" />
                        <span className="font-medium text-gray-900">Sesión de Certificación</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-xs text-purple-600">{item.requests.length} usuaria{item.requests.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>

            <button
              onClick={() => { onSlotClick(clusterModal.date); setClusterModal(null); }}
              className="w-full py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva actividad en este horario
            </button>
          </div>
        </div>
      )}

      {/* ── Modal de detalle de reserva ──────────────────────────────────── */}
      {detail?.kind === 'booking' && (() => {
        const b = detail.booking;
        const canEdit = isAdmin || currentUserId === b.userId;
        const purposeText = b.purpose === 'PRODUCE'
          ? `Producir: ${b.produceItem} x${b.produceQty}`
          : PURPOSE_LABELS[b.purpose];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            onClick={() => !editLoading && closeDetail()}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">
                  {editMode ? 'Editar reserva' : 'Detalle de reserva'}
                </h3>
                <button onClick={closeDetail} disabled={editLoading}
                  className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full p-1 -m-1 transition-colors disabled:opacity-40">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {!editMode ? (
                <>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium text-gray-700">Recurso:</span> <span className="text-gray-900">{b.resource.name}</span></p>
                    <p><span className="font-medium text-gray-700">Usuaria:</span> <span className="text-gray-900">{b.user.name}</span></p>
                    <p>
                      <span className="font-medium text-gray-700">Horario:</span>{' '}
                      <span className="text-gray-900">
                        {new Date(b.startTime).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })}{' '}
                        {new Date(b.startTime).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        {' – '}
                        {new Date(b.endTime).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </span>
                    </p>
                    <p><span className="font-medium text-gray-700">Propósito:</span> <span className="text-gray-900">{purposeText}</span></p>
                    {b.notes && <p><span className="font-medium text-gray-700">Notas:</span> <span className="text-gray-900">{b.notes}</span></p>}
                  </div>
                  <div className="flex gap-2 mt-5">
                    {canEdit && b.status !== 'CANCELLED' && b.status !== 'REJECTED' && (onUpdateBooking || onCancelBooking) && (
                      <button onClick={() => openEditMode(b)}
                        className="flex-1 bg-brand-50 hover:bg-brand-100 text-brand-700 text-sm font-medium py-2 rounded-lg border border-brand-200 transition-colors">
                        Editar
                      </button>
                    )}
                    <button onClick={closeDetail}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 rounded-lg transition-colors">
                      Cerrar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {confirmCancelBooking ? (
                    <div className="space-y-4">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-700">¿Confirmas que deseas cancelar esta reserva?</p>
                      </div>
                      {editError && <p className="text-xs text-red-600">{editError}</p>}
                      <div className="flex gap-2">
                        <button onClick={() => setConfirmCancelBooking(false)} disabled={editLoading}
                          className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60">
                          Volver
                        </button>
                        <button onClick={handleCancelBooking} disabled={editLoading}
                          className="flex-1 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60">
                          {editLoading ? 'Cancelando...' : 'Sí, cancelar'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
                        <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Hora inicio</label>
                          <input type="text" value={editStart}
                            onChange={(e) => setEditStart(formatTimeInput(e.target.value))}
                            placeholder="HH:MM" maxLength={5}
                            className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${editStart && !isValidTime(editStart) ? 'border-red-400' : 'border-gray-300'}`} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Hora fin</label>
                          <input type="text" value={editEnd}
                            onChange={(e) => setEditEnd(formatTimeInput(e.target.value))}
                            placeholder="HH:MM" maxLength={5}
                            className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${editEnd && (!isValidTime(editEnd) || editEnd <= editStart) ? 'border-red-400' : 'border-gray-300'}`} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
                        <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
                      </div>
                      {editError && <p className="text-xs text-red-600">{editError}</p>}
                      <div className="flex gap-2">
                        <button onClick={() => { setEditMode(false); setEditError(null); }} disabled={editLoading}
                          className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60">
                          ← Volver
                        </button>
                        {onCancelBooking && (
                          <button onClick={() => setConfirmCancelBooking(true)} disabled={editLoading}
                            className="px-3 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60">
                            Cancelar reserva
                          </button>
                        )}
                        {onUpdateBooking && (
                          <button onClick={handleEditSave} disabled={editLoading}
                            className="flex-1 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-60">
                            {editLoading ? 'Guardando...' : 'Guardar'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Modal de sesión de certificación ────────────────────────────── */}
      {detail?.kind === 'certSession' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Sesión de Certificación</h3>
              <button onClick={() => setDetail(null)}
                className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full p-1 -m-1 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ul className="space-y-1.5 text-sm text-gray-700 mb-4">
              {detail.requests.map((r) => (
                <li key={r.id} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                  <span>{r.user?.name ?? r.userId}</span>
                  <span className="text-gray-400">—</span>
                  <span className="text-gray-500">{r.category?.name ?? r.categoryId}</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              {isAdmin && onCancelCertSession && (
                <button onClick={handleCancelCertSession} disabled={cancelCertLoading}
                  className="flex-1 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60">
                  {cancelCertLoading ? 'Cancelando...' : 'Cancelar sesión'}
                </button>
              )}
              <button onClick={() => setDetail(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 rounded-lg transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
