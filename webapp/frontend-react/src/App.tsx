import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import RequireAuth from './components/layout/RequireAuth';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PassportsPage from './pages/PassportsPage';
import PassportDetailPage from './pages/PassportDetailPage';
import MaterialsPage from './pages/MaterialsPage';
import BmuDataPage from './pages/BmuDataPage';
import MaintenancePage from './pages/MaintenancePage';
import RecyclingPage from './pages/RecyclingPage';
import QrScanPage from './pages/QrScanPage';
import AuditLogPage from './pages/AuditLogPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/dashboard"
          element={<RequireAuth><Layout><DashboardPage /></Layout></RequireAuth>}
        />
        <Route
          path="/passports"
          element={<RequireAuth><Layout><PassportsPage /></Layout></RequireAuth>}
        />
        <Route
          path="/passports/:id"
          element={<RequireAuth><Layout><PassportDetailPage /></Layout></RequireAuth>}
        />
        <Route
          path="/materials"
          element={<RequireAuth><Layout><MaterialsPage /></Layout></RequireAuth>}
        />
        <Route
          path="/bmu-data"
          element={<RequireAuth><Layout><BmuDataPage /></Layout></RequireAuth>}
        />
        <Route
          path="/maintenance"
          element={<RequireAuth><Layout><MaintenancePage /></Layout></RequireAuth>}
        />
        <Route
          path="/recycling"
          element={<RequireAuth><Layout><RecyclingPage /></Layout></RequireAuth>}
        />
        <Route
          path="/qr-scan"
          element={<RequireAuth><Layout><QrScanPage /></Layout></RequireAuth>}
        />
        <Route
          path="/audit-log"
          element={<RequireAuth><Layout><AuditLogPage /></Layout></RequireAuth>}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
