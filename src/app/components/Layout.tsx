import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, getRoleName } from '../contexts/AuthContext';
import { useNotificationCounts } from '../contexts/NotificationCountsContext';
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
  Send,
} from 'lucide-react';
import { useState, useEffect } from 'react';
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

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { counts } = useNotificationCounts();

  useEffect(() => {
    if (!user) return;
    console.log(
      `[Layout] Sidebar badges for role="${user.role}" page="${location.pathname}":`,
      JSON.stringify(counts),
    );
  }, [counts, user, location.pathname]);

  const [siteEngineerNotifications, setSiteEngineerNotifications] = useState(
    getInitialSiteEngineerNotificationCount()
  );

  useEffect(() => {
    const onSiteEngineer = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      setSiteEngineerNotifications(customEvent.detail ?? 0);
    };

    window.addEventListener(SITE_ENGINEER_NOTIFICATIONS_KEY, onSiteEngineer);

    return () => {
      window.removeEventListener(SITE_ENGINEER_NOTIFICATIONS_KEY, onSiteEngineer);
    };
  }, []);

  if (!user) return <>{children}</>;

  // ════ Side‑less role only ════
  const isSidebarlessRole =
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
        path: user.role === 'site_engineer' ? '/site-engineer-tasks' : user.role === 'data_collector' ? '/data-collector-tasks' : user.role === 'quantity_surveyor' ? '/quantity-surveyor-tasks' : '/tasks',
        label: user.role === 'site_engineer' ? 'Site Engineer Tasks' : user.role === 'data_collector' ? 'Data Collector Tasks' : user.role === 'quantity_surveyor' ? 'Quantity Surveyor Tasks' : 'Tasks',
        icon: CheckSquare,
        badge:
          user.role === 'site_engineer' && siteEngineerNotifications > 0
            ? siteEngineerNotifications
            : user.role === 'data_collector' && counts.dataCollectorTasks > 0
            ? counts.dataCollectorTasks
            : user.role === 'quantity_surveyor' && counts.quantitySurveyorTasks > 0
            ? counts.quantitySurveyorTasks
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
        badge: counts.marketingTasks > 0 ? counts.marketingTasks : undefined,
      });
    }

    // Finance Verifications
    if (user.role === 'ceo') {
      addNavigationItem({
        path: '/finance-verifications',
        label: 'Finance Verifications',
        icon: ClipboardCheck,
        badge: counts.marketingTasks > 0 ? counts.marketingTasks : undefined,
      });
    }

    // CEO Transfers
    if (user.role === 'ceo') {
      addNavigationItem({
        path: '/ceo-transfers',
        label: 'CEO Transfers',
        icon: Send,
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
        badge: counts.dataCollectorTasks > 0 ? counts.dataCollectorTasks : undefined,
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
        badge: counts.designerTasks > 0 ? counts.designerTasks : undefined,
      });
      addNavigationItem({
        path: '/quantity-surveyor-tasks',
        label: 'Quantity Surveyor Tasks',
        icon: CheckSquare,
        badge: counts.quantitySurveyorTasks > 0 ? counts.quantitySurveyorTasks : undefined,
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
        badge: counts.designerTasks > 0 ? counts.designerTasks : undefined,
      });
      addNavigationItem({
        path: '/open-job-postings',
        label: 'Open Job Postings',
        icon: FolderKanban,
        badge: counts.designerTasks > 0 ? counts.designerTasks : undefined,
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
              <p className="text-xs text-gray-500">{user.full_name}</p>
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