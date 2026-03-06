import { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { Booking, Training, CertificationRequest, BusinessHours } from '../../types';
import { RESOURCE_CATEGORY_COLORS, RESOURCE_CATEGORY_LABELS, PURPOSE_LABELS } from '../../utils/dateHelpers';

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
  const [showClosedPopup, setShowClosedPopup] = useState(false);

  const bookingEvents = bookings.map((b) => ({
    id: b.id,
    title: `${b.resource.name} — ${b.user.name}`,
    start: b.startTime,
    end: b.endTime,
    backgroundColor: RESOURCE_CATEGORY_COLORS[b.resource.category] ?? '#6b7280',
    borderColor: RESOURCE_CATEGORY_COLORS[b.resource.category] ?? '#6b7280',
    extendedProps: { booking: b, isTraining: false },
  }));

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

  const events = [...bookingEvents, ...trainingBgEvents, ...trainingLabelEvents, ...certSessionEvents];

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

  const handleSelect = (info: { start: Date }) => {
    if (businessHours.length > 0 && !isWithinBusinessHours(info.start, businessHours)) {
      setShowClosedPopup(true);
      return;
    }
    onSlotClick(info.start);
  };

  return (
    <>
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
          selectable
          selectMirror
          slotMinTime="08:00:00"
          slotMaxTime="18:00:00"
          slotDuration="01:00:00"
          slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          allDaySlot={false}
          weekends={true}
          height="auto"
          select={handleSelect}
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
            const b = eventInfo.event.extendedProps.booking as Booking;
            return (
              <div className="p-1 overflow-hidden">
                <p className="font-semibold text-xs truncate">{b.resource.name}</p>
                <p className="text-xs opacity-90 truncate">{b.user.name}</p>
                <p className="text-xs opacity-75">{PURPOSE_LABELS[b.purpose]}</p>
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
            setDetail({ kind: 'booking', booking: info.event.extendedProps.booking as Booking });
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
                  <span className="text-gray-500">{RESOURCE_CATEGORY_LABELS[r.resourceCategory]}</span>
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
