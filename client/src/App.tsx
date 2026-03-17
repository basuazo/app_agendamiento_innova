import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';

import Navbar from './components/shared/Navbar';
import ProtectedRoute from './components/shared/ProtectedRoute';
import LoadingSpinner from './components/shared/LoadingSpinner';

// Páginas con lazy loading para reducir bundle inicial
const LoginPage          = lazy(() => import('./pages/LoginPage'));
const RegisterPage       = lazy(() => import('./pages/RegisterPage'));
const CalendarPage       = lazy(() => import('./pages/CalendarPage'));
const MyBookingsPage     = lazy(() => import('./pages/MyBookingsPage'));
const MyCertificationsPage = lazy(() => import('./pages/MyCertificationsPage'));
const CommunityPage      = lazy(() => import('./pages/CommunityPage'));
const ProfilePage        = lazy(() => import('./pages/ProfilePage'));
const ResourcesPage      = lazy(() => import('./pages/admin/ResourcesPage'));
const UsersPage          = lazy(() => import('./pages/admin/UsersPage'));
const BookingsPage       = lazy(() => import('./pages/admin/BookingsPage'));
const CertificationsPage = lazy(() => import('./pages/admin/CertificationsPage'));
const SettingsPage       = lazy(() => import('./pages/admin/SettingsPage'));
const CategoriesPage     = lazy(() => import('./pages/admin/CategoriesPage'));
const SpacesPage         = lazy(() => import('./pages/superadmin/SpacesPage'));
const TrainingsPage      = lazy(() => import('./pages/admin/TrainingsPage'));
const MyTrainingsPage    = lazy(() => import('./pages/MyTrainingsPage'));

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}

function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}

export default function App() {
  const { loadUser, isLoading } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Rutas protegidas */}
          <Route path="/calendar" element={
            <ProtectedRoute>
              <Layout><CalendarPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/my-bookings" element={
            <ProtectedRoute>
              <Layout><MyBookingsPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/community" element={
            <ProtectedRoute>
              <Layout><CommunityPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/my-certifications" element={
            <ProtectedRoute>
              <Layout><MyCertificationsPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/my-trainings" element={
            <ProtectedRoute>
              <Layout><MyTrainingsPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout><ProfilePage /></Layout>
            </ProtectedRoute>
          } />

          {/* Rutas de administrador */}
          <Route path="/admin/resources" element={
            <ProtectedRoute adminOnly>
              <Layout><ResourcesPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute adminOnly>
              <Layout><UsersPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/bookings" element={
            <ProtectedRoute adminOnly>
              <Layout><BookingsPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/certifications" element={
            <ProtectedRoute adminOnly>
              <Layout><CertificationsPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <ProtectedRoute adminOnly>
              <Layout><SettingsPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/categories" element={
            <ProtectedRoute adminOnly>
              <Layout><CategoriesPage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/trainings" element={
            <ProtectedRoute adminOnly>
              <Layout><TrainingsPage /></Layout>
            </ProtectedRoute>
          } />

          {/* Rutas Super Admin */}
          <Route path="/superadmin/spaces" element={
            <ProtectedRoute superAdminOnly>
              <Layout><SpacesPage /></Layout>
            </ProtectedRoute>
          } />

          {/* Redireccionamiento */}
          <Route path="/" element={<Navigate to="/calendar" replace />} />
          <Route path="*" element={<Navigate to="/calendar" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
