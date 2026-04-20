import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import RequireAuth from './components/layout/RequireAuth';
import Spinner from './components/ui/Spinner';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PassportsPage = lazy(() => import('./pages/PassportsPage'));
const PassportDetailPage = lazy(() => import('./pages/PassportDetailPage'));
const MaterialsPage = lazy(() => import('./pages/MaterialsPage'));
const BmuDataPage = lazy(() => import('./pages/BmuDataPage'));
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'));
const RecyclingPage = lazy(() => import('./pages/RecyclingPage'));
const QrScanPage = lazy(() => import('./pages/QrScanPage'));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'));

function ProtectedPage({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <Layout>{children}</Layout>
    </RequireAuth>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<Spinner minHeight="52vh" />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route path="/dashboard" element={<ProtectedPage><DashboardPage /></ProtectedPage>} />
          <Route path="/passports" element={<ProtectedPage><PassportsPage /></ProtectedPage>} />
          <Route path="/passports/:id" element={<ProtectedPage><PassportDetailPage /></ProtectedPage>} />
          <Route path="/materials" element={<ProtectedPage><MaterialsPage /></ProtectedPage>} />
          <Route path="/bmu-data" element={<ProtectedPage><BmuDataPage /></ProtectedPage>} />
          <Route path="/maintenance" element={<ProtectedPage><MaintenancePage /></ProtectedPage>} />
          <Route path="/recycling" element={<ProtectedPage><RecyclingPage /></ProtectedPage>} />
          <Route path="/qr-scan" element={<ProtectedPage><QrScanPage /></ProtectedPage>} />
          <Route path="/audit-log" element={<ProtectedPage><AuditLogPage /></ProtectedPage>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
