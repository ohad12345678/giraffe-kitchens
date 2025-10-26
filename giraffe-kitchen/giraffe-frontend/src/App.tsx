import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import ToastProvider from './components/ToastProvider';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewCheck from './pages/NewCheck';
import Reports from './pages/Reports';
import Tasks from './pages/Tasks';
import SanitationAudits from './pages/SanitationAudits';
import NewSanitationAudit from './pages/NewSanitationAudit';
import ViewSanitationAudit from './pages/ViewSanitationAudit';
import AuditSummary from './pages/AuditSummary';
import Admin from './pages/Admin';
import ManagerEvaluations from './pages/ManagerEvaluations';
import CreateManagerEvaluation from './pages/CreateManagerEvaluation';
import ViewManagerEvaluation from './pages/ViewManagerEvaluation';
import EditManagerEvaluation from './pages/EditManagerEvaluation';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ToastProvider />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/new-check" element={<NewCheck />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/tasks" element={<Tasks />} />
                    <Route path="/sanitation-audits" element={<SanitationAudits />} />
                    <Route path="/sanitation-audits/new" element={<NewSanitationAudit />} />
                    <Route path="/sanitation-audits/:id/summary" element={<AuditSummary />} />
                    <Route path="/sanitation-audits/:id" element={<ViewSanitationAudit />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/manager-evaluations" element={<ManagerEvaluations />} />
                    <Route path="/manager-evaluations/new" element={<CreateManagerEvaluation />} />
                    <Route path="/manager-evaluations/:id/edit" element={<EditManagerEvaluation />} />
                    <Route path="/manager-evaluations/:id" element={<ViewManagerEvaluation />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;