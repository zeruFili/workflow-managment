import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, getRoleName } from '../contexts/AuthContext';
import {
  Home,
  FolderKanban,
  CheckSquare,
  FileText,
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
  X
} from 'lucide-react';
import { useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

type NavigationItem = {
  path: string;
  label: string;
  icon: React.ElementType;
};

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return <>{children}</>;

  // Quantity surveyors get a simplified header only – no sidebar
  const isQuantitySurveyor = user.role === 'quantity_surveyor';

  // Build navigation items for the sidebar (only used if NOT quantity_surveyor)
  const navigationItems: NavigationItem[] = [];
  if (!isQuantitySurveyor) {
    navigationItems.push({ path: '/dashboard', label: 'Dashboard', icon: Home });

    if (user.role !== 'ceo' && user.role !== 'general_manager') {
      navigationItems.push({ path: '/tasks', label: 'Tasks', icon: CheckSquare });
    }

    const addNavigationItem = (item: NavigationItem) => {
      if (!navigationItems.some((candidate) => candidate.path === item.path)) {
        navigationItems.push(item);
      }
    };

    

    if (user.role === 'marketing_lead' || user.role === 'system_administrator') {
      navigationItems.push({ path: '/customer-data', label: 'Customer Requests', icon: ClipboardList });
    }

    if (user.role === 'general_manager' || user.role === 'marketing_lead' || user.role === 'ceo' || user.role === 'system_administrator') {
      navigationItems.push({ path: '/paid-customers', label: 'Paid Customers', icon: CircleDollarSign });
    }

    if (user.role === 'ceo' || user.role === 'general_manager' || user.role === 'system_administrator') {
      addNavigationItem({ path: '/finance-verifications', label: 'Finance Verifications', icon: ClipboardCheck });
      addNavigationItem({ path: '/data-collector-tasks', label: 'Data Collector Tasks', icon: Database });
      addNavigationItem({ path: '/job-postings', label: 'Job Postings', icon: FolderKanban });
      addNavigationItem({ path: '/designer-applications', label: 'Designer Applications', icon: ClipboardPenLine });
      addNavigationItem({ path: '/designer-assignments', label: 'Designer Assignments', icon: LayoutGrid });
      addNavigationItem({ path: '/quantity-surveyor-tasks', label: 'Quantity Surveyor Tasks', icon: CheckSquare });
      addNavigationItem({ path: '/performance-ratings', label: 'Performance Ratings', icon: TrendingUp });
    }

    if (user.role === 'design_team_leader' || user.role === 'designer') {
      addNavigationItem({ path: '/designer-tasks', label: 'Designer Tasks', icon: LayoutGrid });
    }

    if (user.role === 'design_team_leader' || user.role === 'designer' || user.role === 'ceo' || user.role === 'general_manager' || user.role === 'system_administrator') {
      addNavigationItem({ path: '/performance-ratings', label: 'Performance Ratings', icon: TrendingUp });
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
      {/* Top Header – always visible, but simplified for quantity_surveyor */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Hamburger only for non‑quantity_surveyor roles (to toggle sidebar) */}
            {!isQuantitySurveyor && (
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
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <LogOut className="w-5 h-5 text-gray-600" />
              </button>
              <span className="text-xs text-gray-500 mt-0.5">Logout</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main area: either full layout with sidebar, or just content for quantity_surveyor */}
      {isQuantitySurveyor ? (
        <main className="p-4 md:p-6">{children}</main>
      ) : (
        <div className="flex">
          {/* Sidebar */}
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
                      ${isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Mobile overlay */}
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