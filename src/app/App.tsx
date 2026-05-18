import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useTelegram } from './hooks/useTelegram';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { ProjectDetails } from './pages/ProjectDetails';
import { Tasks } from './pages/Tasks';
import { Documents } from './pages/Documents';
import { Approvals } from './pages/Approvals';
import { UserManagement } from './pages/UserManagement';
import { CustomerRequests } from './pages/CustomerRequests';
import { CustomerData } from './pages/CustomerData';
import { PaidCustomers } from './pages/PaidCustomers';
import { DesignerTasks } from './pages/DesignerTasks';
import { TaskApplications } from './pages/TaskApplications';
import { DesignerPerformanceDashboard } from './pages/DesignerPerfromanceDashboards';
import { UserRole } from './types';
import { useEffect } from 'react';

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const { isAuthenticated } = useAuth();
  const { webApp, isReady } = useTelegram();

  useEffect(() => {
    if (isReady && webApp) {
      console.log('Telegram Web App initialized:', {
        colorScheme: webApp.colorScheme,
        user: webApp.initDataUnsafe?.user
      });
    }
  }, [isReady, webApp]);

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <Layout>
                <Projects />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <ProjectDetails />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <Layout>
                <Tasks />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <Layout>
                <Documents />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/approvals"
          element={
            <ProtectedRoute>
              <Layout>
                <Approvals />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <Layout>
                <UserManagement />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer-requests"
          element={
            <ProtectedRoute>
              <Layout>
                <CustomerRequests />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer-data"
          element={
            <ProtectedRoute>
              <Layout>
                <CustomerData />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/paid-customers"
          element={
            <ProtectedRoute>
              <Layout>
                <PaidCustomers />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/designer-tasks"
          element={
            <ProtectedRoute>
              <Layout>
                <DesignerTasks />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/task-applications"
          element={
            <ProtectedRoute>
              <Layout>
                <TaskApplications />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/designer-performance"
          element={
            <ProtectedRoute
              allowedRoles={['system_administrator', 'general_manager', 'designer']}
            >
              <Layout>
                <DesignerPerformanceDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
