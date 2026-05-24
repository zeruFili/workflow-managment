import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, getRoleName } from '../contexts/AuthContext';
import {
  Home,
  FolderKanban,
  CheckSquare,
  ClipboardCheck,
  ClipboardList,
  Database,
  CircleDollarSign,
  LayoutGrid,
  ClipboardPenLine,
  TrendingUp,
  Users,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

type NavigationItem = {
  path: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
};

export const PAID_CUSTOMERS_NOTIFICATIONS_KEY = 'paid-customers-notifications-v2';
export const DATA_COLLECTOR_NOTIFICATIONS_KEY = 'data-collector-notifications-v2';
export const QUANTITY_SURVEYOR_NOTIFICATIONS_KEY = 'quantity-surveyor-notifications-v2';
export const FINANCE_VERIFICATIONS_NOTIFICATIONS_KEY = 'finance-verifications-notifications-v2';

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Initialize badges to 3 (the mock “new” count) – they update via events
  const [paidCustomerNotifications, setPaidCustomerNotifications] = useState(3);
  const [dataCollectorNotifications, setDataCollectorNotifications] = useState(3);
  const [quantitySurveyorNotifications, setQuantitySurveyorNotifications] = useState(3);
  const [financeVerificationsNotifications, setFinanceVerificationsNotifications] = useState(3);

  useEffect(() => {
    const onPaidCustomers = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      setPaidCustomerNotifications(customEvent.detail ?? 0);
    };

    const onDataCollector = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      setDataCollectorNotifications(customEvent.detail ?? 0);
    };

    const onQuantitySurveyor = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      setQuantitySurveyorNotifications(customEvent.detail ?? 0);
    };

    const onFinanceVerifications = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      setFinanceVerificationsNotifications(customEvent.detail ?? 0);
    };

    window.addEventListener('paid-customers-notifications-updated', onPaidCustomers);
    window.addEventListener('data-collector-notifications-updated', onDataCollector);
    window.addEventListener('quantity-surveyor-notifications-updated', onQuantitySurveyor);
    window.addEventListener('finance-verifications-notifications-updated', onFinanceVerifications);

    return () => {
      window.removeEventListener('paid-customers-notifications-updated', onPaidCustomers);
      window.removeEventListener('data-collector-notifications-updated', onDataCollector);
      window.removeEventListener('quantity-surveyor-notifications-updated', onQuantitySurveyor);
      window.removeEventListener('finance-verifications-notifications-updated', onFinanceVerifications);
    };
  }, []);

  if (!user) return <>{children}</>;

  const isSidebarlessRole =
    user.role === 'quantity_surveyor' || user.role === 'finance_officer';

  const navigationItems: NavigationItem[] = [];

  if (!isSidebarlessRole) {
    navigationItems.push({ path: '/dashboard', label: 'Dashboard', icon: Home });

    if (user.role !== 'ceo' && user.role !== 'general_manager') {
      navigationItems.push({ path: '/tasks', label: 'Tasks', icon: CheckSquare });
    }

    const addNavigationItem = (item: NavigationItem) => {
      if (!navigationItems.some((c) => c.path === item.path)) {
        navigationItems.push(item);
      }
    };

    if (user.role === 'marketing_lead' || user.role === 'system_administrator') {
      navigationItems.push({
        path: '/customer-data',
        label: 'Customer Requests',
        icon: ClipboardList,
      });
    }

    // ✅ Paid Customers
    if (
      user.role === 'general_manager' ||
      user.role === 'marketing_lead' ||
      user.role === 'ceo' ||
      user.role === 'system_administrator'
    ) {
      navigationItems.push({
        path: '/paid-customers',
        label: 'Paid Customers',
        icon: CircleDollarSign,
        badge: paidCustomerNotifications > 0 ? paidCustomerNotifications : undefined,
      });
    }

    if (
      user.role === 'ceo' ||
      user.role === 'general_manager' ||
      user.role === 'system_administrator'
    ) {
      addNavigationItem({
        path: '/finance-verifications',
        label: 'Finance Verifications',
        icon: ClipboardCheck,
        badge: financeVerificationsNotifications > 0 ? financeVerificationsNotifications : undefined,
      });
      addNavigationItem({
        path: '/data-collector-tasks',
        label: 'Data Collector Tasks',
        icon: Database,
        badge: dataCollectorNotifications > 0 ? dataCollectorNotifications : undefined,
      });
      addNavigationItem({ path: '/job-postings', label: 'Job Postings', icon: FolderKanban });
      addNavigationItem({
        path: '/designer-applications',
        label: 'Designer Applications',
        icon: ClipboardPenLine,
      });
      addNavigationItem({
        path: '/designer-assignments',
        label: 'Designer Assignments',
        icon: LayoutGrid,
      });
      addNavigationItem({
        path: '/quantity-surveyor-tasks',
        label: 'Quantity Surveyor Tasks',
        icon: CheckSquare,
        badge: quantitySurveyorNotifications > 0 ? quantitySurveyorNotifications : undefined,
      });
      addNavigationItem({
        path: '/performance-ratings',
        label: 'Performance Ratings',
        icon: TrendingUp,
      });
    }

    if (user.role === 'design_team_leader' || user.role === 'designer') {
      addNavigationItem({ path: '/designer-tasks', label: 'Designer Tasks', icon: LayoutGrid });
      addNavigationItem({
        path: '/open-job-postings',
        label: 'Open Job Postings',
        icon: FolderKanban,
      });
    }

    if (
      user.role === 'design_team_leader' ||
      user.role === 'designer' ||
      user.role === 'ceo' ||
      user.role === 'general_manager' ||
      user.role === 'system_administrator'
    ) {
      addNavigationItem({
        path: '/performance-ratings',
        label: 'Performance Ratings',
        icon: TrendingUp,
      });
    }

    if (user.role !== 'system_administrator') {
      navigationItems.push({ path: '/approvals', label: 'Approvals', icon: ClipboardCheck });
    }

    if (user.role === 'system_administrator' || user.role === 'ceo') {
      navigationItems.push({ path: '/users', label: 'User Management', icon: Users });
    }
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!isSidebarlessRole && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
            <div>
              <h1 className="font-semibold">Workflow Manager</h1>
              <p className="text-xs text-gray-500">{user.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-gray-500">{getRoleName(user.role)}</p>
            </div>
            <div className="flex flex-col items-center">
              <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-lg">
                <LogOut className="w-5 h-5 text-gray-600" />
              </button>
              <span className="text-xs text-gray-500 mt-0.5">Logout</span>
            </div>
          </div>
        </div>
      </header>

      {isSidebarlessRole ? (
        <main className="p-4 md:p-6">{children}</main>
      ) : (
        <div className="flex">
          <nav
            className={`
              fixed md:sticky top-[57px] left-0 h-[calc(100vh-57px)]
              bg-white border-r border-gray-200 w-64 z-40
              transition-transform duration-300
              ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}
          >
            <div className="p-4 space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                      ${
                        isActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold rounded-full bg-blue-600 text-white leading-none">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {mobileMenuOpen && (
            <div
              className="fixed inset-0 bg-black/20 z-30 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}

          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      )}
    </div>
  );
}