import { useEffect, useState } from 'react';
import { User, Role } from '../../types';
import { userService } from '../../services/user.service';
import { useAuthStore } from '../../store/authStore';
import { formatDateTime } from '../../utils/dateHelpers';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import ConfirmModal from '../../components/shared/ConfirmModal';
import { getApiError } from '../../utils/apiError';
import toast from 'react-hot-toast';

type PendingAction =
  | { kind: 'delete'; id: string; name: string }
  | { kind: 'role'; id: string; currentRole: Role }
  | { kind: 'verify'; id: string; name: string };

export default function UsersPage() {
  const { user: me } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const load = async () => {
    try {
      setIsLoading(true);
      const data = await userService.getAll();
      setUsers(data);
    } catch {
      toast.error('Error al cargar usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const pendingCount = users.filter((u) => !u.isVerified).length;

  const handleConfirm = async () => {
    if (!pending) return;
    try {
      if (pending.kind === 'delete') {
        await userService.delete(pending.id);
        toast.success('Usuario eliminado');
      } else if (pending.kind === 'verify') {
        await userService.verify(pending.id);
        toast.success('Usuario verificado');
      } else {
        const newRole: Role = pending.currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
        await userService.changeRole(pending.id, newRole);
        toast.success('Rol actualizado');
      }
      load();
    } catch (err) {
      toast.error(getApiError(err, 'Error al procesar la acción'));
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          {pendingCount > 0 && (
            <span className="inline-flex items-center bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-brand-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Usuario
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
                <th className="px-4 py-3 text-left font-medium text-gray-600">Usuario</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 hidden md:table-cell">Registrado</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Estado</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Rol</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{u.name}</p>
                    <p className="text-gray-400 text-xs">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                    {formatDateTime(u.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {u.isVerified ? (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                        Verificada
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.id !== me?.id && (
                      <div className="flex items-center justify-end gap-3">
                        {!u.isVerified && (
                          <button
                            onClick={() => setPending({ kind: 'verify', id: u.id, name: u.name })}
                            className="text-xs text-green-600 hover:text-green-800 font-medium"
                          >
                            Verificar
                          </button>
                        )}
                        <button
                          onClick={() => setPending({ kind: 'role', id: u.id, currentRole: u.role })}
                          className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                        >
                          {u.role === 'ADMIN' ? '→ USER' : '→ ADMIN'}
                        </button>
                        <button
                          onClick={() => setPending({ kind: 'delete', id: u.id, name: u.name })}
                          className="text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {showForm && (
        <CreateUserModal onClose={() => { setShowForm(false); load(); }} />
      )}

      {pending?.kind === 'verify' && (
        <ConfirmModal
          title="Verificar usuario"
          message={`¿Verificar a "${pending.name}"? Podrá iniciar sesión y usar la app.`}
          confirmLabel="Verificar"
          variant="success"
          onConfirm={handleConfirm}
          onCancel={() => setPending(null)}
        />
      )}

      {pending?.kind === 'delete' && (
        <ConfirmModal
          title="Eliminar usuario"
          message={`¿Eliminar a "${pending.name}"? Sus reservas activas también serán canceladas.`}
          confirmLabel="Eliminar"
          variant="danger"
          onConfirm={handleConfirm}
          onCancel={() => setPending(null)}
        />
      )}

      {pending?.kind === 'role' && (
        <ConfirmModal
          title="Cambiar rol"
          message={`¿Cambiar el rol a ${pending.currentRole === 'ADMIN' ? 'USER' : 'ADMIN'}?`}
          confirmLabel="Cambiar"
          variant="warning"
          onConfirm={handleConfirm}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('USER');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await userService.create({ name, email, password, role });
      toast.success('Usuario creado');
      onClose();
    } catch (err: unknown) {
      toast.error(getApiError(err, 'Error al crear usuario'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Nuevo Usuario</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="USER">Usuario</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-60">
              {loading ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
