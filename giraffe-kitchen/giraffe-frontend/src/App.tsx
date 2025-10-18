import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewCheck from './pages/NewCheck';
import Reports from './pages/Reports';
import Tasks from './pages/Tasks';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Decorative background blobs */}
        <div className="decorative-blob decorative-blob-1"></div>
        <div className="decorative-blob decorative-blob-2"></div>

        <div className="relative z-10">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/new-check"
              element={
                <ProtectedRoute>
                  <NewCheck />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <ProtectedRoute>
                  <Tasks />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
