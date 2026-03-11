import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { spaceService } from '../../services/space.service';
import type { Space } from '../../types';

export default function Navbar() {
  const { user, logout, currentSpaceId, setCurrentSpace } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [adminOpen, setAdminOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileAdminOpen, setMobileAdminOpen] = useState(false);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [spaceOpen, setSpaceOpen] = useState(false);
  const adminRef = useRef<HTMLDivElement>(null);
  const spaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') {
      spaceService.getAll().then((data) => {
        setSpaces(data);
        // Auto-seleccionar el primer espacio si no hay ninguno seleccionado
        if (!currentSpaceId && data.length > 0) {
          setCurrentSpace(data[0].id);
        }
      }).catch(() => {});
    }
  }, [user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cerrar el menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (adminRef.current && !adminRef.current.contains(e.target as Node)) {
        setAdminOpen(false);
      }
      if (spaceRef.current && !spaceRef.current.contains(e.target as Node)) {
        setSpaceOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cerrar el menú al cambiar de ruta
  useEffect(() => {
    setAdminOpen(false);
    setMobileMenuOpen(false);
    setMobileAdminOpen(false);
    setSpaceOpen(false);
  }, [location.pathname]);

  const currentSpace = spaces.find((s) => s.id === currentSpaceId);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) =>
    location.pathname === path ? 'text-brand-600 font-semibold' : 'text-gray-600 hover:text-brand-600';

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo + Nombre */}
          <Link to="/calendar" className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Logo"
              className="h-9 w-9 object-contain rounded-lg"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            {/* Iniciales de fallback */}
            <div
              style={{ display: 'none' }}
              className="w-9 h-9 bg-brand-600 rounded-lg items-center justify-center flex-shrink-0"
            >
              <span className="text-white text-xs font-bold">ECT</span>
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-gray-900 text-base leading-tight block">
                Espacio Colaborativo
              </span>
              <span className="font-bold text-brand-600 text-base leading-tight block">
                Textil
              </span>
            </div>
          </Link>

          {/* Links de navegación — solo desktop */}
          <div className="hidden md:flex items-center gap-5">
            <Link to="/calendar" className={`text-sm transition-colors ${isActive('/calendar')}`}>
              Calendario
            </Link>
            <Link to="/my-bookings" className={`text-sm transition-colors ${isActive('/my-bookings')}`}>
              Mis Reservas
            </Link>
            <Link to="/community" className={`text-sm transition-colors ${isActive('/community')}`}>
              Comunidad
            </Link>
            <Link to="/my-certifications" className={`text-sm transition-colors ${isActive('/my-certifications')}`}>
              Certificaciones
            </Link>

            {/* Selector de espacio — solo SUPER_ADMIN */}
            {user?.role === 'SUPER_ADMIN' && (
              <div className="relative" ref={spaceRef}>
                <button
                  onClick={() => setSpaceOpen((prev) => !prev)}
                  className="text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors font-medium"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {currentSpace?.name ?? 'Todos los espacios'}
                  <svg className={`w-3.5 h-3.5 transition-transform ${spaceOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {spaceOpen && spaces.length > 0 && (
                  <div className="absolute left-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                    {spaces.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => { setCurrentSpace(s.id); setSpaceOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${currentSpaceId === s.id ? 'text-purple-700 font-semibold bg-purple-50' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Menú Super Admin */}
            {user?.role === 'SUPER_ADMIN' && (
              <Link
                to="/superadmin/spaces"
                className={`text-sm transition-colors ${isActive('/superadmin/spaces')}`}
              >
                Espacios
              </Link>
            )}

            {/* Menú Admin — controlado por estado */}
            {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
              <div className="relative" ref={adminRef}>
                <button
                  onClick={() => setAdminOpen((prev) => !prev)}
                  className={`text-sm flex items-center gap-1 transition-colors ${
                    location.pathname.startsWith('/admin')
                      ? 'text-brand-600 font-semibold'
                      : 'text-gray-600 hover:text-brand-600'
                  }`}
                >
                  Admin
                  <svg
                    className={`w-4 h-4 transition-transform duration-150 ${adminOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {adminOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                    <Link
                      to="/admin/categories"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Categorías
                    </Link>
                    <Link
                      to="/admin/resources"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Recursos
                    </Link>
                    <Link
                      to="/admin/users"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      Usuarios
                    </Link>
                    <Link
                      to="/admin/bookings"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Todas las Reservas
                    </Link>
                    <Link
                      to="/admin/certifications"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      Certificaciones
                    </Link>
                    <Link
                      to="/admin/settings"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Horarios
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Usuario + Salir — solo desktop */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/profile" className="text-right group">
              <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600 transition-colors">{user?.name}</p>
              <p className="text-xs text-gray-500">
                {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : user?.role === 'ADMIN' ? 'Administrador' : 'Usuario'}
              </p>
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
            >
              Salir
            </button>
          </div>

          {/* Botón hamburguesa — solo móvil */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

        </div>
      </div>

      {/* Menú móvil desplegable */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white shadow-lg">
          <div className="px-4 py-3 space-y-1">
            <Link to="/calendar" className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === '/calendar' ? 'bg-brand-50 text-brand-600' : 'text-gray-700 hover:bg-gray-50'
            }`}>
              Calendario
            </Link>
            <Link to="/my-bookings" className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === '/my-bookings' ? 'bg-brand-50 text-brand-600' : 'text-gray-700 hover:bg-gray-50'
            }`}>
              Mis Reservas
            </Link>
            <Link to="/community" className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === '/community' ? 'bg-brand-50 text-brand-600' : 'text-gray-700 hover:bg-gray-50'
            }`}>
              Comunidad
            </Link>
            <Link to="/my-certifications" className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === '/my-certifications' ? 'bg-brand-50 text-brand-600' : 'text-gray-700 hover:bg-gray-50'
            }`}>
              Certificaciones
            </Link>

            {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
              <div>
                <button
                  onClick={() => setMobileAdminOpen((prev) => !prev)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname.startsWith('/admin') ? 'bg-brand-50 text-brand-600' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Admin
                  <svg
                    className={`w-4 h-4 transition-transform duration-150 ${mobileAdminOpen ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {mobileAdminOpen && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-100 pl-3">
                    <Link to="/admin/categories" className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      Categorías
                    </Link>
                    <Link to="/admin/resources" className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      Recursos
                    </Link>
                    <Link to="/admin/users" className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      Usuarios
                    </Link>
                    <Link to="/admin/bookings" className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      Todas las Reservas
                    </Link>
                    <Link to="/admin/certifications" className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      Certificaciones
                    </Link>
                    <Link to="/admin/settings" className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      Horarios
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <Link to="/profile" className="group" onClick={() => setMobileMenuOpen(false)}>
              <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600 transition-colors">{user?.name}</p>
              <p className="text-xs text-gray-500">
                {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : user?.role === 'ADMIN' ? 'Administrador' : 'Usuario'}
              </p>
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
