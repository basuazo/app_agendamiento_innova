import { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { Booking, Training, CertificationRequest, BusinessHours } from '../../types';
import { PURPOSE_LABELS } from '../../utils/dateHelpers';

interface Props {
  bookings: Booking[];
  trainings?: Training[];
  certSessions?: CertificationRequest[];
  isAdmin?: boolean;
  businessHours?: BusinessHours[];
  onSlotClick: (date: Date) => void;
  onTrainingClick?: (training: Training) => void;
}

type DetailModal =
  | { kind: 'booking'; booking: Booking }
  | { kind: 'certSession'; requests: CertificationRequest[] }
  | null;

type SlotModal = { date: Date; bookings: Booking[] } | null;

function isWithinBusinessHours(date: Date, businessHours: BusinessHours[]): boolean {
  const dayOfWeek = date.getDay();
  const bh = businessHours.find((d) => d.dayOfWeek === dayOfWeek);
  if (!bh || !bh.isOpen) return false;

  const slotMinutes = date.getHours() * 60 + date.getMinutes();
  const [openH, openM] = bh.openTime.split(':').map(Number);
  const [closeH, closeM] = bh.closeTime.split(':').map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  return slotMinutes >= openMinutes && slotMinutes < closeMinutes;
}

export default function CalendarView({
  bookings,
  trainings = [],
  certSessions = [],
  isAdmin = false,
  businessHours = [],
  onSlotClick,
  onTrainingClick,
}: Props) {
  const [detail, setDetail] = useState<DetailModal>(null);
  const [slotModal, setSlotModal] = useState<SlotModal>(null);
  const [showClosedPopup, setShowClosedPopup] = useState(false);

  // Agrupa reservas por franja horaria (hora de inicio, precisión de hora)
  const bookingsBySlot = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      const key = new Date(b.startTime).toISOString().slice(0, 13);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    return map;
  }, [bookings]);

  // Un evento por franja (en vez de uno por reserva)
  const bookingSlotEvents = useMemo(() =>
    Array.from(bookingsBySlot.entries()).map(([key, bks]) => {
      const hasMultiple = bks.length > 1;
      const color = hasMultiple
        ? '#64748b'
        : (bks[0].resource.category?.color ?? '#6b7280');
      return {
        id: `slot-${key}`,
        start: bks[0].startTime,
        end: bks[0].endTime,
        backgroundColor: color,
        borderColor: color,
        extendedProps: { slotBookings: bks, isSlotGroup: true },
      };
    }),
  [bookingsBySlot]);

  const trainingBgEvents = trainings.map((t) => ({
    id: `training-bg-${t.id}`,
    start: t.startTime,
    end: t.endTime,
    display: 'background' as const,
    color: '#fef3c7',
    extendedProps: { isTraining: true, training: t },
  }));

  const trainingLabelEvents = trainings.map((t) => ({
    id: `training-label-${t.id}`,
    title: `Capacitación: ${t.title}`,
    start: t.startTime,
    end: t.endTime,
    backgroundColor: '#f59e0b',
    borderColor: '#d97706',
    textColor: '#fff',
    editable: false,
    extendedProps: { isTraining: true, training: t },
  }));

  // Agrupar sesiones de certificación por scheduledDate
  const sessionMap = new Map<string, CertificationRequest[]>();
  for (const r of certSessions) {
    if (!r.scheduledDate) continue;
    const key = r.scheduledDate;
    if (!sessionMap.has(key)) sessionMap.set(key, []);
    sessionMap.get(key)!.push(r);
  }
  const certSessionEvents = Array.from(sessionMap.entries()).map(([date, reqs]) => ({
    id: `cert-session-${date}`,
    title: `Sesión cert. (${reqs.length})`,
    start: date,
    end: new Date(new Date(date).getTime() + 60 * 60 * 1000).toISOString(),
    backgroundColor: '#7c3aed',
    borderColor: '#6d28d9',
    textColor: '#fff',
    editable: false,
    extendedProps: { isCertSession: true, requests: reqs },
  }));

  const events = [...bookingSlotEvents, ...trainingBgEvents, ...trainingLabelEvents, ...certSessionEvents];

  // Convertir businessHours al formato de FullCalendar
  const fcBusinessHours = businessHours.length > 0
    ? businessHours
        .filter((bh) => bh.isOpen)
        .map((bh) => ({
          daysOfWeek: [bh.dayOfWeek],
          startTime: bh.openTime,
          endTime: bh.closeTime,
        }))
    : [{ daysOfWeek: [1, 2, 3, 4, 5, 6], startTime: '09:00', endTime: '17:00' }];

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const handleDateClick = (info: { date: Date }) => {
    const date = info.date;
    if (businessHours.length > 0 && !isWithinBusinessHours(date, businessHours)) {
      setShowClosedPopup(true);
      return;
    }
    const key = date.toISOString().slice(0, 13);
    const slotBks = bookingsBySlot.get(key) ?? [];
    if (slotBks.length > 0) {
      setSlotModal({ date, bookings: slotBks });
    } else {
      onSlotClick(date);
    }
  };

  return (
    <>
      {/* Indicador (+) en celdas vacías al hover */}
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
            left: 'prev,next',
            center: 'title',
            right: 'timeGridDay,timeGridWeek',
          } : {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={events}
          slotMinTime="08:00:00"
          slotMaxTime="18:00:00"
          slotDuration="01:00:00"
          slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          allDaySlot={false}
          weekends={true}
          height="auto"
          dateClick={handleDateClick}
          businessHours={fcBusinessHours}
          eventContent={(eventInfo) => {
            if (eventInfo.event.extendedProps.isCertSession) {
              const reqs = eventInfo.event.extendedProps.requests as CertificationRequest[];
              return (
                <div className="p-1 overflow-hidden">
                  <p className="font-semibold text-xs truncate">Sesión de Certificación</p>
                  <p className="text-xs opacity-90">{reqs.length} usuaria{reqs.length !== 1 ? 's' : ''}</p>
                </div>
              );
            }
            if (eventInfo.event.extendedProps.isTraining) {
              const t = eventInfo.event.extendedProps.training as Training;
              return (
                <div className="p-1 overflow-hidden">
                  <p className="font-semibold text-xs truncate">{t.title}</p>
                  {t.exemptions.length > 0 && (
                    <p className="text-xs opacity-80 truncate">
                      Libre: {t.exemptions.map((e) => e.resource.name).join(', ')}
                    </p>
                  )}
                  {isAdmin && <p className="text-xs opacity-70 italic">Click para eliminar</p>}
                </div>
              );
            }
            // Slot con reservas agrupadas
            const bks = eventInfo.event.extendedProps.slotBookings as Booking[];
            return (
              <div className="p-1 overflow-hidden h-full flex flex-col justify-between">
                <div>
                  {bks.length === 1 ? (
                    <>
                      <p className="font-semibold text-xs truncate">{bks[0].resource.name}</p>
                      <p className="text-xs opacity-90 truncate">{bks[0].user.name}</p>
                      <p className="text-xs opacity-75">{PURPOSE_LABELS[bks[0].purpose]}</p>
                    </>
                  ) : (
                    <p className="font-semibold text-xs">
                      {bks.length} reservas activas
                    </p>
                  )}
                </div>
                <p className="text-xs opacity-60 text-right leading-none">Ver →</p>
              </div>
            );
          }}
          eventClick={(info) => {
            if (info.event.extendedProps.isCertSession) {
              setDetail({ kind: 'certSession', requests: info.event.extendedProps.requests as CertificationRequest[] });
              return;
            }
            if (info.event.extendedProps.isTraining) {
              if (isAdmin && onTrainingClick) {
                onTrainingClick(info.event.extendedProps.training as Training);
              }
              return;
            }
            if (info.event.extendedProps.isSlotGroup) {
              const bks = info.event.extendedProps.slotBookings as Booking[];
              const date = new Date(info.event.start!);
              if (businessHours.length > 0 && !isWithinBusinessHours(date, businessHours)) {
                setSlotModal({ date, bookings: bks });
              } else {
                setSlotModal({ date, bookings: bks });
              }
            }
          }}
          nowIndicator
        />
      </div>

      {/* Popup: horario no disponible */}
      {showClosedPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setShowClosedPopup(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Horario no disponible</h3>
                <p className="text-sm text-gray-600">
                  No se puede agendar en este horario. Si quieres ocuparlo de todas maneras, ponte en contacto con un administrador.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowClosedPopup(false)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modal: reservas de una franja + botón nueva reserva */}
      {slotModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setSlotModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 capitalize">
                  {slotModal.date.toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'long' })}
                </h3>
                <p className="text-sm text-gray-500">
                  {String(slotModal.date.getHours()).padStart(2, '0')}:00 —{' '}
                  {String(slotModal.date.getHours() + 1).padStart(2, '0')}:00
                </p>
              </div>
              <button onClick={() => setSlotModal(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {slotModal.bookings.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Reservas en este horario
                </p>
                <ul className="space-y-1.5">
                  {slotModal.bookings.map((b) => (
                    <li key={b.id}>
                      <button
                        onClick={() => {
                          setDetail({ kind: 'booking', booking: b });
                          setSlotModal(null);
                        }}
                        className="w-full text-left bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-2.5 text-sm transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: b.resource.category?.color ?? '#6b7280' }}
                          />
                          <span className="font-medium text-gray-900">{b.resource.name}</span>
                          <span className="text-gray-300">·</span>
                          <span className="text-gray-600 truncate">{b.user.name}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 ml-4">{PURPOSE_LABELS[b.purpose]}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => {
                onSlotClick(slotModal.date);
                setSlotModal(null);
              }}
              className="w-full py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva Reserva en este horario
            </button>
          </div>
        </div>
      )}

      {/* Modal de detalles de reserva */}
      {detail?.kind === 'booking' && (() => {
        const b = detail.booking;
        const purposeText = b.purpose === 'PRODUCE'
          ? `Producir: ${b.produceItem} x${b.produceQty}`
          : PURPOSE_LABELS[b.purpose];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            onClick={() => setDetail(null)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Detalle de reserva</h3>
                <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium text-gray-700">Recurso:</span> <span className="text-gray-900">{b.resource.name}</span></p>
                <p><span className="font-medium text-gray-700">Usuaria:</span> <span className="text-gray-900">{b.user.name}</span></p>
                <p><span className="font-medium text-gray-700">Propósito:</span> <span className="text-gray-900">{purposeText}</span></p>
                {b.notes && <p><span className="font-medium text-gray-700">Notas:</span> <span className="text-gray-900">{b.notes}</span></p>}
              </div>
              <button onClick={() => setDetail(null)}
                className="mt-5 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 rounded-lg transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        );
      })()}

      {/* Modal de sesión de certificación */}
      {detail?.kind === 'certSession' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Sesión de Certificación</h3>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ul className="space-y-1.5 text-sm text-gray-700">
              {detail.requests.map((r) => (
                <li key={r.id} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                  <span>{r.user?.name ?? r.userId}</span>
                  <span className="text-gray-400">—</span>
                  <span className="text-gray-500">{r.category?.name ?? r.categoryId}</span>
                </li>
              ))}
            </ul>
            <button onClick={() => setDetail(null)}
              className="mt-5 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 rounded-lg transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
