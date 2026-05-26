import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useTelegram } from './hooks/useTelegram';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Tasks } from './pages/Tasks';
import { Approvals } from './pages/Approvals';
import { UserManagement } from './pages/UserManagement';
import { CustomerData } from './pages/CustomerData';
import { PaidCustomers } from './pages/PaidCustomers';
import { DesignerOpenJobPostings } from './pages/DesignerOpenJobPostings';
import { DesignerApplications } from './pages/DesignerApplications';
import { DesignerAssignments } from './pages/DesignerAssignments';
import { DesignerPerformanceDashboard } from './pages/DesignerPerfromanceDashboards';
import { FinanceVerifications } from './pages/FinanceVerifications';
import { DataCollectorTasks } from './pages/DataCollectorTasks';
import { JobPostings } from './pages/JobPostings';
import { QuantitySurveyorTasks } from './pages/QuantitySurveyorTasks';
import { QuantitySurveyorDashboard } from './pages/QuantitySurveyorDashboard';
import { SiteEngineerTasks } from './pages/SiteEngineerTasks';
import { UserRole } from './types';
import { DesignerTasks } from './pages/DesignerTasks';

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

        {/* Dashboard route – role-specific landing pages */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              {user?.role === 'quantity_surveyor' || user?.role === 'finance_officer' ? (
                <Layout>
                  {user?.role === 'finance_officer' ? <FinanceVerifications /> : <QuantitySurveyorDashboard />}
                </Layout>
              ) : user?.role === 'site_engineer' ? (
                <Layout>
                  <SiteEngineerTasks />
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
          path="/quantity-surveyor-live"
          element={
            <ProtectedRoute allowedRoles={['quantity_surveyor']}>
              <Layout>
                <QuantitySurveyorDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/quantity-surveyor-review"
          element={
            <ProtectedRoute allowedRoles={['quantity_surveyor']}>
              <Layout>
                <QuantitySurveyorDashboard />
              </Layout>
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
                'designer',
                'finance_officer',
                'data_collector',
                'quantity_surveyor',
              ]}
            >
              <Layout>
                <Tasks />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/site-engineer-tasks"
          element={
            <ProtectedRoute allowedRoles={['site_engineer']}>
              <Layout>
                <SiteEngineerTasks />
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
            <ProtectedRoute allowedRoles={['ceo', 'general_manager', 'marketing_lead']}>
              <Layout>
                <PaidCustomers />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/finance-verifications"
          element={
            <ProtectedRoute allowedRoles={['finance_officer', 'ceo', 'general_manager']}>
              <Layout>
                <FinanceVerifications />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/data-collector-tasks"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'general_manager']}>
              <Layout>
                <DataCollectorTasks />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/job-postings"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'general_manager']}>
              <Layout>
                <JobPostings />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/designer-applications"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'general_manager']}>
              <Layout>
                <DesignerApplications />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/designer-assignments"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'general_manager']}>
              <Layout>
                <DesignerAssignments />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/quantity-surveyor-tasks"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'general_manager']}>
              <Layout>
                <QuantitySurveyorTasks />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/designer-tasks"
          element={
            <ProtectedRoute allowedRoles={['designer']}>
              <Layout>
                <DesignerTasks />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/open-job-postings"
          element={
            <ProtectedRoute allowedRoles={['designer', 'ceo', 'general_manager']}>
              <Layout>
                <DesignerOpenJobPostings />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/task-applications"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'general_manager']}>
              <Navigate to="/designer-applications" replace />
            </ProtectedRoute>
          }
        />

        <Route
          path="/performance-ratings"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'general_manager', 'designer']}>
              <Layout>
                <DesignerPerformanceDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/designer-performance"
          element={
            <ProtectedRoute allowedRoles={['ceo', 'general_manager', 'designer']}>
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