import { useEffect } from 'react';
import { createHashRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom';
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
import { CeoTransfers } from './pages/CeoTransfers';

function RoleGuard({ children, roles }: { children: React.ReactNode; roles: UserRole[] }) {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children as React.ReactElement;
}

function DashboardRouter() {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case 'quantity_surveyor':
      return <QuantitySurveyorDashboard />;
    case 'finance_officer':
      return <FinanceVerifications />;
    case 'site_engineer':
      return <SiteEngineerTasks />;
    default:
      return <Dashboard />;
  }
}

function LoginOrRedirect() {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Login />;
}

function AuthenticatedLayout() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!user) {
    return <Outlet />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

function RootContent() {
  const { isLoading } = useAuth();
  const { isReady, webApp } = useTelegram();

  useEffect(() => {
    if (isReady && webApp) {
      console.log('Telegram Web App initialized:', {
        colorScheme: webApp.colorScheme,
        user: webApp.initDataUnsafe?.user,
      });
    }
  }, [isReady, webApp]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="mt-4 text-gray-600 text-sm">Restoring session...</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

const router = createHashRouter([
  {
    element: (
      <AuthProvider>
        <RootContent />
      </AuthProvider>
    ),
    children: [
      { index: true, Component: LoginOrRedirect },

      {
        Component: AuthenticatedLayout,
        children: [
          { path: 'dashboard', Component: DashboardRouter },

          { path: 'quantity-surveyor-live', element: (
            <RoleGuard roles={['quantity_surveyor']}>
              <QuantitySurveyorDashboard />
            </RoleGuard>
          )},

          { path: 'quantity-surveyor-review', element: (
            <RoleGuard roles={['quantity_surveyor']}>
              <QuantitySurveyorDashboard />
            </RoleGuard>
          )},

          { path: 'projects', element: <Navigate to="/dashboard" replace /> },
          { path: 'projects/:id', element: <Navigate to="/dashboard" replace /> },

          { path: 'tasks', element: (
            <RoleGuard roles={['marketing_lead', 'designer', 'finance_officer', 'data_collector', 'quantity_surveyor']}>
              <Tasks />
            </RoleGuard>
          )},

          { path: 'site-engineer-tasks', element: (
            <RoleGuard roles={['site_engineer']}>
              <SiteEngineerTasks />
            </RoleGuard>
          )},

          { path: 'approvals', Component: Approvals },

          { path: 'users', Component: UserManagement },

          { path: 'customer-data', Component: CustomerData },

          { path: 'paid-customers', element: (
            <RoleGuard roles={['ceo', 'general_manager', 'marketing_lead', 'finance_officer']}>
              <PaidCustomers />
            </RoleGuard>
          )},

          { path: 'finance-verifications', element: (
            <RoleGuard roles={['finance_officer', 'ceo', 'general_manager']}>
              <FinanceVerifications />
            </RoleGuard>
          )},

          { path: 'ceo-transfers', element: (
            <RoleGuard roles={['ceo', 'finance_officer']}>
              <CeoTransfers />
            </RoleGuard>
          )},

          { path: 'data-collector-tasks', element: (
            <RoleGuard roles={['ceo', 'general_manager', 'data_collector']}>
              <DataCollectorTasks />
            </RoleGuard>
          )},

          { path: 'job-postings', element: (
            <RoleGuard roles={['ceo', 'general_manager']}>
              <JobPostings />
            </RoleGuard>
          )},

          { path: 'designer-applications', element: (
            <RoleGuard roles={['ceo', 'general_manager']}>
              <DesignerApplications />
            </RoleGuard>
          )},

          { path: 'designer-assignments', element: (
            <RoleGuard roles={['ceo', 'general_manager', 'designer']}>
              <DesignerAssignments />
            </RoleGuard>
          )},

          { path: 'quantity-surveyor-tasks', element: (
            <RoleGuard roles={['ceo', 'general_manager', 'quantity_surveyor']}>
              <QuantitySurveyorTasks />
            </RoleGuard>
          )},

          { path: 'designer-tasks', element: (
            <RoleGuard roles={['designer']}>
              <DesignerTasks />
            </RoleGuard>
          )},

          { path: 'open-job-postings', element: (
            <RoleGuard roles={['designer', 'ceo', 'general_manager']}>
              <DesignerOpenJobPostings />
            </RoleGuard>
          )},

          { path: 'task-applications', element: (
            <RoleGuard roles={['ceo', 'general_manager']}>
              <Navigate to="/designer-applications" replace />
            </RoleGuard>
          )},

          { path: 'performance-ratings', element: (
            <RoleGuard roles={['ceo', 'general_manager', 'designer']}>
              <DesignerPerformanceDashboard />
            </RoleGuard>
          )},

          { path: 'designer-performance', element: (
            <RoleGuard roles={['ceo', 'general_manager', 'designer']}>
              <DesignerPerformanceDashboard />
            </RoleGuard>
          )},
        ],
      },

      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
