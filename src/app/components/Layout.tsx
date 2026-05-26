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
import { DESIGNER_ASSIGNMENTS_NOTIFICATIONS_KEY } from '../pages/designerAssignmentHighlights';
import { DESIGNER_TASKS_NOTIFICATIONS_KEY } from '../pages/DesignerTasks';
import {
  SITE_ENGINEER_NOTIFICATIONS_KEY,
  getInitialSiteEngineerNotificationCount,
} from '../pages/siteEngineerTaskShared';

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

  // Badge states – initialised to mock counts and updated via events
  const [paidCustomerNotifications, setPaidCustomerNotifications] = useState(3);
  const [dataCollectorNotifications, setDataCollectorNotifications] = useState(3);
  const [quantitySurveyorNotifications, setQuantitySurveyorNotifications] = useState(3);
  const [financeVerificationsNotifications, setFinanceVerificationsNotifications] = useState(2);
  const [approvalsNotifications, setApprovalsNotifications] = useState(3);
  const [openJobPostingsNotifications, setOpenJobPostingsNotifications] = useState(3);
  const [designerAssignmentsNotifications, setDesignerAssignmentsNotifications] = useState(3);
  const [designerTasksNotifications, setDesignerTasksNotifications] = useState(3);

  // ── New state for Site Engineer notifications ──────────────────────────────
  const [siteEngineerNotifications, setSiteEngineerNotifications] = useState(
    getInitialSiteEngineerNotificationCount()
  );

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
    const onApprovalsNotifications = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      setApprovalsNotifications(customEvent.detail ?? 0);
    };
    const onOpenJobPostingsNotifications = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      setOpenJobPostingsNotifications(customEvent.detail ?? 0);
    };
    const onDesignerAssignments = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      setDesignerAssignmentsNotifications(customEvent.detail ?? 0);
    };
    const onDesignerTasks = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      setDesignerTasksNotifications(customEvent.detail ?? 0);
    };

    // ── Listener for Site Engineer notifications ──────────────────────────
    const onSiteEngineer = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      setSiteEngineerNotifications(customEvent.detail ?? 0);
    };

    window.addEventListener('paid-customers-notifications-updated', onPaidCustomers);
    window.addEventListener('data-collector-notifications-updated', onDataCollector);
    window.addEventListener('quantity-surveyor-notifications-updated', onQuantitySurveyor);
    window.addEventListener('finance-verifications-notifications-updated', onFinanceVerifications);
    window.addEventListener('approvals-notifications-updated', onApprovalsNotifications);
    window.addEventListener('open-job-postings-notifications-updated', onOpenJobPostingsNotifications);
    window.addEventListener(DESIGNER_ASSIGNMENTS_NOTIFICATIONS_KEY, onDesignerAssignments);
    window.addEventListener(DESIGNER_TASKS_NOTIFICATIONS_KEY, onDesignerTasks);

    // ── Register the Site Engineer event ─────────────────────────────────
    window.addEventListener(SITE_ENGINEER_NOTIFICATIONS_KEY, onSiteEngineer);

    return () => {
      window.removeEventListener('paid-customers-notifications-updated', onPaidCustomers);
      window.removeEventListener('data-collector-notifications-updated', onDataCollector);
      window.removeEventListener('quantity-surveyor-notifications-updated', onQuantitySurveyor);
      window.removeEventListener('finance-verifications-notifications-updated', onFinanceVerifications);
      window.removeEventListener('approvals-notifications-updated', onApprovalsNotifications);
      window.removeEventListener('open-job-postings-notifications-updated', onOpenJobPostingsNotifications);
      window.removeEventListener(DESIGNER_ASSIGNMENTS_NOTIFICATIONS_KEY, onDesignerAssignments);
      window.removeEventListener(DESIGNER_TASKS_NOTIFICATIONS_KEY, onDesignerTasks);

      // ── Clean up the Site Engineer event ───────────────────────────────
      window.removeEventListener(SITE_ENGINEER_NOTIFICATIONS_KEY, onSiteEngineer);
    };
  }, []);

  if (!user) return <>{children}</>;

  // ── Updated: site_engineer also gets a sidebar‑less layout ────────────
  const isSidebarlessRole =
    user.role === 'quantity_surveyor' ||
    user.role === 'finance_officer' ||
    user.role === 'site_engineer';

  const navigationItems: NavigationItem[] = [];

  if (!isSidebarlessRole) {
    navigationItems.push({ path: '/dashboard', label: 'Dashboard', icon: Home });

    // ── Tasks nav item: hidden for CEO, GM, Designer, and Marketing Lead ──
    if (
      user.role !== 'ceo' &&
      user.role !== 'general_manager' &&
      user.role !== 'designer' &&
      user.role !== 'marketing_lead'
    ) {
      // Site engineer is now sidebar‑less, so this block won't execute for them
      navigationItems.push({
        path: user.role === 'site_engineer' ? '/site-engineer-tasks' : '/tasks',
        label: user.role === 'site_engineer' ? 'Site Engineer Tasks' : 'Tasks',
        icon: CheckSquare,
        badge:
          user.role === 'site_engineer' && siteEngineerNotifications > 0
            ? siteEngineerNotifications
            : undefined,
      });
    }

    const addNavigationItem = (item: NavigationItem) => {
      if (!navigationItems.some((c) => c.path === item.path)) {
        navigationItems.push(item);
      }
    };

    if (user.role === 'marketing_lead' || user.role === 'ceo') {
      navigationItems.push({
        path: '/customer-data',
        label: 'Customer Requests',
        icon: ClipboardList,
      });
    }

    // Paid Customers
    if (
      user.role === 'general_manager' ||
      user.role === 'marketing_lead' ||
      user.role === 'ceo'
    ) {
      navigationItems.push({
        path: '/paid-customers',
        label: 'Paid Customers',
        icon: CircleDollarSign,
        badge: paidCustomerNotifications > 0 ? paidCustomerNotifications : undefined,
      });
    }

    // Finance Verifications
    if (user.role === 'ceo') {
      addNavigationItem({
        path: '/finance-verifications',
        label: 'Finance Verifications',
        icon: ClipboardCheck,
        badge: financeVerificationsNotifications > 0 ? financeVerificationsNotifications : undefined,
      });
    }

    // Other admin-level pages
    if (
      user.role === 'ceo' ||
      user.role === 'general_manager'
    ) {
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
        badge: designerAssignmentsNotifications > 0 ? designerAssignmentsNotifications : undefined,
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

    if (user.role === 'designer') {
      addNavigationItem({
        path: '/designer-tasks',
        label: 'Designer Tasks',
        icon: LayoutGrid,
        badge: designerTasksNotifications > 0 ? designerTasksNotifications : undefined,
      });
      addNavigationItem({
        path: '/open-job-postings',
        label: 'Open Job Postings',
        icon: FolderKanban,
        badge: openJobPostingsNotifications > 0 ? openJobPostingsNotifications : undefined,
      });
    }

    if (
      user.role === 'designer' ||
      user.role === 'ceo' ||
      user.role === 'general_manager'
    ) {
      addNavigationItem({
        path: '/performance-ratings',
        label: 'Performance Ratings',
        icon: TrendingUp,
      });
    }

    // ── Approvals: hidden for system_administrator, designer, site_engineer, general_manager, and ceo ──
    if (
      user.role !== 'designer' &&
      user.role !== 'site_engineer' &&
      user.role !== 'general_manager' &&
      user.role !== 'ceo'
    ) {
      navigationItems.push({
        path: '/approvals',
        label: 'Approvals',
        icon: ClipboardCheck,
        badge: approvalsNotifications > 0 ? approvalsNotifications : undefined,
      });
    }

    if (user.role === 'ceo') {
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
              overflow-y-auto overflow-x-hidden transition-transform duration-300
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
                        flex min-w-0 items-center gap-3 px-4 py-3 rounded-lg transition-colors
                      ${
                        isActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                        <span className="inline-flex shrink-0 items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold rounded-full bg-blue-600 text-white leading-none">
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