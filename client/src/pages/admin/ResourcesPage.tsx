import { useEffect, useState } from 'react';
import { Resource } from '../../types';
import { useResourceStore } from '../../store/resourceStore';
import ResourceForm from '../../components/admin/ResourceForm';
import { RESOURCE_CATEGORY_COLORS, RESOURCE_CATEGORY_LABELS } from '../../utils/dateHelpers';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import toast from 'react-hot-toast';

export default function ResourcesPage() {
  const { resources, fetchAll, toggle, isLoading } = useResourceStore();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Resource | undefined>();

  useEffect(() => {
    fetchAll(true); // incluir inactivos
  }, [fetchAll]);

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await toggle(id);
      toast.success(isActive ? 'Recurso desactivado' : 'Recurso activado');
    } catch {
      toast.error('Error al cambiar estado del recurso');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Recursos</h1>
        <button
          onClick={() => { setEditing(undefined); setShowForm(true); }}
          className="inline-flex items-center gap-2 bg-brand-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Recurso
        </button>
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
                <th className="px-4 py-3 text-left font-medium text-gray-600 hidden md:table-cell">Descripción</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Estado</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {resources.map((r) => (
                <tr key={r.id} className={r.isActive ? '' : 'opacity-60'}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: RESOURCE_CATEGORY_COLORS[r.category] ?? '#6b7280' }}
                      />
                      <div>
                        <span className="font-medium text-gray-900">{r.name}</span>
                        <span className="block text-xs text-gray-400">{RESOURCE_CATEGORY_LABELS[r.category]}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell max-w-xs truncate">
                    {r.description ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {r.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => { setEditing(r); setShowForm(true); }}
                        className="text-brand-600 hover:text-brand-800 text-xs font-medium"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleToggle(r.id, r.isActive)}
                        className={`text-xs font-medium ${
                          r.isActive ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'
                        }`}
                      >
                        {r.isActive ? 'Desactivar' : 'Activar'}
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

      {showForm && (
        <ResourceForm
          resource={editing}
          onClose={() => { setShowForm(false); setEditing(undefined); fetchAll(true); }}
        />
      )}
    </div>
  );
}
