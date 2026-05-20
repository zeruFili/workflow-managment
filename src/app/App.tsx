import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useTelegram } from './hooks/useTelegram';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Tasks } from './pages/Tasks';
import { Approvals } from './pages/Approvals';
import { UserManagement } from './pages/UserManagement';
import { CustomerRequests } from './pages/CustomerRequests';
import { CustomerData } from './pages/CustomerData';
import { PaidCustomers } from './pages/PaidCustomers';
import { DesignerTasks } from './pages/DesignerTasks';
import { DesignerApplications } from './pages/DesignerApplications';
import { DesignerAssignments } from './pages/DesignerAssignments';
import { DesignerPerformanceDashboard } from './pages/DesignerPerfromanceDashboards';
import { FinanceVerifications } from './pages/FinanceVerifications';
import { DataCollectorTasks } from './pages/DataCollectorTasks';
import { JobPostings } from './pages/JobPostings';
import { QuantitySurveyorTasks } from './pages/QuantitySurveyorTasks';
import { QuantitySurveyorDashboard } from './pages/QuantitySurveyorDashboard';
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
  const { user } = useAuth();
  const { isReady, webApp } = useTelegram();

  useEffect(() => {
    if (isReady && webApp) {
      console.log('Telegram Web App initialized:', {
        colorScheme: webApp.colorScheme,
        user: webApp.initDataUnsafe?.user,
      });
    }
  }, [isReady, webApp]);

  return (
    <HashRouter>
      <Routes>
        {/* Always start from the login page */}
        <Route path="/" element={<Login />} />

        {/* Dashboard route – special handling for quantity_surveyor */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              {user?.role === 'quantity_surveyor' ? (
                <Layout>
                  <QuantitySurveyorDashboard />
                </Layout>
                
              ) : (
                <Layout>
                  <Dashboard />
                </Layout>
              )}
            </ProtectedRoute>
          }
        />

        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <Navigate to="/dashboard" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute>
              <Navigate to="/dashboard" replace />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tasks"
          element={
            <ProtectedRoute
              allowedRoles={[
                'marketing_lead',
                'design_team_leader',
                'designer',
                'site_engineer',
                'finance_officer',
                'purchasing_team',
                'data_collector',
                'quantity_surveyor',
                'system_administrator',
              ]}
            >
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
              <Navigate to="/dashboard" replace />
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
            <ProtectedRoute allowedRoles={['ceo', 'marketing_lead', 'system_administrator']}>
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
            <ProtectedRoute allowedRoles={['ceo', 'general_manager', 'marketing_lead', 'system_administrator']}>
              <Layout>
                <PaidCustomers />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance-verifications"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'system_administrator']}>
              <Layout>
                <FinanceVerifications />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/data-collector-tasks"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'general_manager', 'system_administrator']}>
              <Layout>
                <DataCollectorTasks />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/job-postings"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'general_manager', 'system_administrator']}>
              <Layout>
                <JobPostings />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/designer-applications"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'general_manager', 'system_administrator']}>
              <Layout>
                <DesignerApplications />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/designer-assignments"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'general_manager', 'system_administrator']}>
              <Layout>
                <DesignerAssignments />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/quantity-surveyor-tasks"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'general_manager', 'system_administrator']}>
              <Layout>
                <QuantitySurveyorTasks />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/designer-tasks"
          element={
            <ProtectedRoute allowedRoles={['design_team_leader', 'designer']}>
              <Layout>
                <DesignerTasks />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/task-applications"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'general_manager', 'system_administrator']}>
              <Navigate to="/designer-applications" replace />
            </ProtectedRoute>
          }
        />

        <Route
          path="/performance-ratings"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'general_manager', 'designer', 'system_administrator']}>
              <Layout>
                <DesignerPerformanceDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/designer-performance"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'general_manager', 'designer', 'system_administrator']}>
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