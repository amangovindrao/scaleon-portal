import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from './context/AuthContext';
import AdminLogin from './pages/AdminLogin';
import CandidateLogin from './pages/CandidateLogin';
import AdminDashboard from './pages/AdminDashboard';
import TestReady from './pages/TestReady';
import TestExam from './pages/TestExam';
import TestResult from './pages/TestResult';

function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || user.role !== 'admin') return <Navigate to="/admin" replace />;
  return children;
}

function RequireCandidate({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || user.role !== 'candidate') return <Navigate to="/login" replace />;
  return children;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user?.role === 'candidate') return <Navigate to="/test/ready" replace />;
  return <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<CandidateLogin />} />
      <Route path="/admin" element={<AdminLogin />} />

      <Route path="/admin/dashboard" element={
        <RequireAdmin><AdminDashboard /></RequireAdmin>
      } />

      <Route path="/test/ready" element={
        <RequireCandidate><TestReady /></RequireCandidate>
      } />
      <Route path="/test/exam" element={
        <RequireCandidate><TestExam /></RequireCandidate>
      } />
      <Route path="/test/result" element={
        <RequireCandidate><TestResult /></RequireCandidate>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
