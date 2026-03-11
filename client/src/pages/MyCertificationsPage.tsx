import { useEffect, useState } from 'react';
import { Certification, CertificationRequest, Category } from '../types';
import { certificationService } from '../services/certification.service';
import { useResourceStore } from '../store/resourceStore';
import { formatDateTime } from '../utils/dateHelpers';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import toast from 'react-hot-toast';

export default function MyCertificationsPage() {
  const { resources, fetchAll: fetchResources } = useResourceStore();
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [requests, setRequests] = useState<CertificationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [requestingCat, setRequestingCat] = useState<string | null>(null);

  // Derivar categorías únicas desde los recursos (ordenadas por order)
  const categoryMap = new Map<string, Category>();
  for (const r of resources) {
    if (!categoryMap.has(r.categoryId)) categoryMap.set(r.categoryId, r.category);
  }
  const allCategories = Array.from(categoryMap.values()).sort((a, b) => a.order - b.order);

  // Categorías que requieren certificación (algún recurso con requiresCertification)
  const certRequiredSet = new Set(
    resources.filter((r) => r.requiresCertification).map((r) => r.categoryId),
  );

  const load = async () => {
    try {
      setIsLoading(true);
      const [certs, reqs] = await Promise.all([
        certificationService.getMyCertifications(),
        certificationService.getMyRequests(),
      ]);
      setCertifications(certs);
      setRequests(reqs);
    } catch {
      toast.error('Error al cargar certificaciones');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRequest = async (cat: Category) => {
    setRequestingCat(cat.id);
    try {
      await certificationService.requestCertification(cat.id);
      toast.success('Solicitud enviada al administrador');
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? 'Error al enviar solicitud');
    } finally {
      setRequestingCat(null);
    }
  };


  const handleCancelRequest = async (id: string) => {
    if (!confirm('¿Cancelar esta solicitud?')) return;
    try {
      await certificationService.cancelMyRequest(id);
      toast.success('Solicitud cancelada');
      load();
    } catch {
      toast.error('Error al cancelar solicitud');
    }
  };

  const getCertForCat = (cat: Category) =>
    certifications.find((c) => c.categoryId === cat.id);

  const getRequestForCat = (cat: Category) =>
    requests.find((r) => r.categoryId === cat.id);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Mis Certificaciones</h1>
      <p className="text-gray-500 text-sm mb-6">
        Las certificaciones te permiten reservar máquinas directamente sin esperar aprobación del administrador.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {allCategories.map((cat) => {
          const cert = getCertForCat(cat);
          const request = getRequestForCat(cat);
          const requiresCert = certRequiredSet.has(cat.id);

          return (
            <div
              key={cat.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
              style={{ borderLeftColor: cat.color, borderLeftWidth: 4 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                <h3 className="font-semibold text-gray-900 text-sm">
                  {cat.name}
                </h3>
              </div>

              {!requiresCert ? (
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-emerald-500 text-base">✓</span>
                    <span className="text-sm font-medium text-emerald-600">No requiere certificación</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Puedes reservar directamente sin pasar por este proceso.
                  </p>
                </div>
              ) : cert ? (
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-emerald-600 text-lg">✓</span>
                    <span className="text-sm font-medium text-emerald-700">Certificada</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Desde {formatDateTime(cert.certifiedAt)}
                  </p>
                  {cert.certifier && (
                    <p className="text-xs text-gray-400">Por {cert.certifier.name}</p>
                  )}
                </div>
              ) : request ? (
                <div>
                  {request.status === 'SCHEDULED' ? (
                    <>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-blue-500 text-base">📅</span>
                        <span className="text-sm font-medium text-blue-700">Sesión programada</span>
                      </div>
                      {request.scheduledDate && (
                        <p className="text-xs text-gray-500">
                          {formatDateTime(request.scheduledDate)}
                        </p>
                      )}
                    </>
                  ) : request.status === 'PENDING' ? (
                    <>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-amber-500 text-base">⏳</span>
                        <span className="text-sm font-medium text-amber-700">Solicitud enviada</span>
                      </div>
                      <p className="text-xs text-gray-400">
                        Esperando programación
                      </p>
                      <button
                        onClick={() => handleCancelRequest(request.id)}
                        className="text-xs text-red-400 hover:text-red-600 mt-2 block"
                      >
                        Cancelar solicitud
                      </button>
                    </>
                  ) : request.status === 'APPROVED' ? (
                    // Estado huérfano: certificación revocada pero solicitud quedó en BD
                    // El backend limpiará la solicitud al crear una nueva
                    <>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-gray-400 text-base">○</span>
                        <span className="text-sm font-medium text-gray-500">Certificación revocada</span>
                      </div>
                      <button
                        onClick={() => handleRequest(cat)}
                        disabled={requestingCat === cat.id}
                        className="w-full py-1.5 border border-brand-300 text-brand-700 rounded-lg text-xs font-medium hover:bg-brand-50 disabled:opacity-60 transition-colors mt-2"
                      >
                        {requestingCat === cat.id ? 'Enviando...' : 'Solicitar nuevamente'}
                      </button>
                    </>
                  ) : request.status === 'REJECTED' ? (
                    <>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-red-500 text-base">✗</span>
                        <span className="text-sm font-medium text-red-600">Solicitud rechazada</span>
                      </div>
                      {request.notes && (
                        <p className="text-xs text-gray-400 mb-2 italic">{request.notes}</p>
                      )}
                      <button
                        onClick={() => handleRequest(cat)}
                        disabled={requestingCat === cat.id}
                        className="w-full py-1.5 border border-brand-300 text-brand-700 rounded-lg text-xs font-medium hover:bg-brand-50 disabled:opacity-60 transition-colors mt-2"
                      >
                        {requestingCat === cat.id ? 'Enviando...' : 'Solicitar nuevamente'}
                      </button>
                    </>
                  ) : null}
                </div>
              ) : (
                <div>
                  <p className="text-xs text-gray-400 mb-3">
                    Sin certificación — las reservas quedarán pendientes de aprobación
                  </p>
                  <button
                    onClick={() => handleRequest(cat)}
                    disabled={requestingCat === cat.id}
                    className="w-full py-1.5 border border-brand-300 text-brand-700 rounded-lg text-xs font-medium hover:bg-brand-50 disabled:opacity-60 transition-colors"
                  >
                    {requestingCat === cat.id ? 'Enviando...' : 'Solicitar Certificación'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
