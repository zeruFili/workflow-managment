import React, { useEffect, useState } from 'react';
import { useAuth, getRoleName } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { mockProjects, mockTasks, mockApprovals } from '../data/mockData';
import {
  getRoleNotificationCount,
  loadQuantityReviewNotifications,
  markRoleNotificationsRead,
  QuantityReviewNotification,
  saveQuantityReviewNotifications,
} from '../data/quantitySurveyorWorkflow';
import {
  FolderKanban,
  CheckSquare,
  Clock,
  AlertCircle,
  TrendingUp,
  CheckCircle,
  Plus,
  Upload,
  ClipboardCheck,
  ClipboardList,
  CircleDollarSign,
  Briefcase,
  Megaphone,
} from 'lucide-react';
import { LeadershipQuickAccess } from '../components/LeadershipQuickAccess';
import { getUnseenApprovalsCount } from '../pages/Approvals';
import { getUnseenPaidCustomerCount } from '../pages/PaidCustomers';
import {
  getUnseenDesignerTaskCount,
  getUnseenDesignerTaskHighlightedIds,
} from '../pages/DesignerTasks';
import {
  getUnseenOpenJobPostingsCount,
} from '../pages/DesignerOpenJobPostings';
import { loadDesignerTasks, getTaskAssigneeLabel } from '../pages/designerTaskShared';

type DashboardButtonProps = {
  to: string;
  label: string;
  icon: React.ElementType;
  badgeCount?: number;
  iconBgClass?: string;
  iconTextClass?: string;
};

function DashboardButton({
  to,
  label,
  icon: Icon,
  badgeCount,
  iconBgClass = 'bg-gray-900',
  iconTextClass = 'text-white',
}: DashboardButtonProps) {
  return (
    <Link
      to={to}
      className="relative flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBgClass} ${iconTextClass}`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 break-words font-medium leading-snug text-gray-900">{label}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {badgeCount && badgeCount > 0 ? (
          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
            {badgeCount}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function MarketingQuickAccess() {
  const [paidCustomerCount, setPaidCustomerCount] = useState(() => getUnseenPaidCustomerCount());
  const [approvalCount, setApprovalCount] = useState(() => getUnseenApprovalsCount());
  const pendingMarketingApprovals = mockApprovals.filter((approval) => approval.status === 'pending');

  useEffect(() => {
    const onPaidCustomersUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<number>;
      setPaidCustomerCount(customEvent.detail ?? 0);
    };

    const onApprovalsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<number>;
      setApprovalCount(customEvent.detail ?? 0);
    };

    window.addEventListener('paid-customers-notifications-updated', onPaidCustomersUpdated);
    window.addEventListener('approvals-notifications-updated', onApprovalsUpdated);

    return () => {
      window.removeEventListener('paid-customers-notifications-updated', onPaidCustomersUpdated);
      window.removeEventListener('approvals-notifications-updated', onApprovalsUpdated);
    };
  }, []);

  return (
    <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div>
        <h3 className="text-base font-semibold text-gray-900 sm:text-lg">Marketing</h3>
        <p className="mt-1 text-sm text-gray-600">
          Jump to the marketing workflow pages and review approval items currently waiting for action.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardButton
          to="/customer-data"
          label="Customer Requests"
          icon={ClipboardList}
          iconBgClass="bg-blue-100"
          iconTextClass="text-blue-600"
        />
        <DashboardButton
          to="/paid-customers"
          label="Paid Customers"
          icon={CircleDollarSign}
          badgeCount={paidCustomerCount}
          iconBgClass="bg-orange-100"
          iconTextClass="text-orange-600"
        />
        <DashboardButton
          to="/approvals"
          label="Approvals"
          icon={ClipboardCheck}
          badgeCount={approvalCount}
          iconBgClass="bg-emerald-100"
          iconTextClass="text-emerald-600"
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 sm:text-base">Marketing Approvals</h4>
            <p className="text-sm text-gray-500">Pending approval items that need marketing attention.</p>
          </div>
          <Link to="/approvals" className="text-sm font-medium text-blue-600 hover:text-blue-700 sm:shrink-0">
            Open full page
          </Link>
        </div>

        <div className="divide-y divide-gray-100">
          {pendingMarketingApprovals.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">No pending marketing approvals.</div>
          ) : (
            pendingMarketingApprovals.map((approval) => {
              const project = mockProjects.find((candidate) => candidate.id === approval.projectId);

              return (
                <Link
                  key={approval.id}
                  to="/approvals"
                  className="block px-4 py-4 transition-colors hover:bg-gray-50"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <h5 className="truncate font-medium text-gray-900">{project?.name ?? 'Unlinked project'}</h5>
                      <p className="mt-1 text-sm text-gray-600">Stage: {approval.stage}</p>
                      <p className="text-sm text-gray-500">Requested: {new Date(approval.requestedAt).toLocaleDateString()}</p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      Pending
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function DesignerQuickAccess() {
  const [designerTaskCount, setDesignerTaskCount] = useState(() => getUnseenDesignerTaskCount());
  const [openJobPostingsCount, setOpenJobPostingsCount] = useState(() => getUnseenOpenJobPostingsCount());
  const highlightedTaskIds = getUnseenDesignerTaskHighlightedIds();

  const designerTasks = loadDesignerTasks()
    .filter((task) => !!task.assignedTo)
    .sort((a, b) => {
      const aHighlighted = highlightedTaskIds.has(a.id) ? 1 : 0;
      const bHighlighted = highlightedTaskIds.has(b.id) ? 1 : 0;

      if (bHighlighted !== aHighlighted) return bHighlighted - aHighlighted;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  useEffect(() => {
    const onDesignerTasksUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<number>;
      setDesignerTaskCount(customEvent.detail ?? 0);
    };

    const onOpenJobPostingsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<number>;
      setOpenJobPostingsCount(customEvent.detail ?? 0);
    };

    window.addEventListener('designer-tasks-notifications-updated', onDesignerTasksUpdated);
    window.addEventListener('open-job-postings-notifications-updated', onOpenJobPostingsUpdated);

    return () => {
      window.removeEventListener('designer-tasks-notifications-updated', onDesignerTasksUpdated);
      window.removeEventListener('open-job-postings-notifications-updated', onOpenJobPostingsUpdated);
    };
  }, []);

  return (
    <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div>
        <h3 className="text-base font-semibold text-gray-900 sm:text-lg">Designer</h3>
        <p className="mt-1 text-sm text-gray-600">
          Jump to the designer workflow pages and review the latest task queue.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
        <DashboardButton
          to="/designer-tasks"
          label="Designer Tasks"
          icon={Briefcase}
          badgeCount={designerTaskCount}
          iconBgClass="bg-blue-100"
          iconTextClass="text-blue-600"
        />
        <DashboardButton
          to="/open-job-postings"
          label="Open Job Postings"
          icon={Megaphone}
          badgeCount={openJobPostingsCount}
          iconBgClass="bg-emerald-100"
          iconTextClass="text-emerald-600"
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 sm:text-base">Designer Task List</h4>
            <p className="text-sm text-gray-500">Highlighted tasks stay at the top so they are easy to review.</p>
          </div>
          <Link to="/designer-tasks" className="text-sm font-medium text-blue-600 hover:text-blue-700 sm:shrink-0">
            Open full page
          </Link>
        </div>

        <div className="divide-y divide-gray-100">
          {designerTasks.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">No assigned designer tasks yet.</div>
          ) : (
            designerTasks.slice(0, 6).map((task) => {
              const isHighlighted = highlightedTaskIds.has(task.id);
              const project = mockProjects.find((candidate) => candidate.id === task.projectId);

              return (
                <Link
                  key={task.id}
                  to="/designer-tasks"
                  className={`block px-4 py-4 transition-colors hover:bg-gray-50 ${isHighlighted ? 'bg-blue-50/70' : ''}`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h5 className="truncate font-medium text-gray-900">{task.title}</h5>
                        {isHighlighted && (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                            New
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-600">Assignee: {getTaskAssigneeLabel(task.assignedTo)}</p>
                      <p className="text-sm text-gray-500">Project: {project?.name ?? 'Unlinked project'}</p>
                      {task.deadline && (
                        <p className="text-sm text-gray-500">Due: {new Date(task.deadline).toLocaleDateString()}</p>
                      )}
                    </div>
                    <Briefcase className="h-5 w-5 shrink-0 text-gray-400 sm:mt-0.5" />
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [quantityNotifications, setQuantityNotifications] = useState<QuantityReviewNotification[]>(
    () => loadQuantityReviewNotifications()
  );

  if (!user) return null;

  const userProjects = mockProjects.filter(p => {
    if (user.role === 'general_manager' || user.role === 'system_administrator') {
      return true;
    }
    if (user.role === 'marketing_lead') {
      return p.createdBy === user.id;
    }
    if (user.role === 'designer') {
      return p.assignedTo === user.id || p.stage === 'design';
    }
    return p.stage !== 'lead';
  });

  const userTasks = mockTasks.filter(t => {
    if (user.role === 'general_manager' || user.role === 'system_administrator') {
      return true;
    }
    if (user.role === 'designer') {
      return t.assignedTo === user.id;
    }
    if (user.role === 'marketing_lead') {
      return t.assignedTo === user.id;
    }
    return false;
  });

  const pendingApprovals = mockApprovals.filter(a =>
    a.status === 'pending' && user.role === 'general_manager'
  );
  const leadershipRoles = user.role === 'general_manager' || user.role === 'ceo';
  const unreadQuantityReviewCount = getRoleNotificationCount(quantityNotifications, user.role, 'evaluation_submitted');
  const quantityReviewItems = quantityNotifications.filter(
    (notification) =>
      notification.type === 'evaluation_submitted' &&
      notification.targetRoles.includes(user.role)
  );

  const markQuantityNotificationsRead = () => {
    const nextNotifications = markRoleNotificationsRead(quantityNotifications, user.role, 'evaluation_submitted');
    setQuantityNotifications(nextNotifications);
    saveQuantityReviewNotifications(nextNotifications);
  };

  const isMarketingDashboard = user.role === 'marketing_lead';
  const isDesignerDashboard = user.role === 'designer';

  const activeProjects = userProjects.filter(p => p.status === 'active').length;
  const pendingTasks = userTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
  const completedTasks = userTasks.filter(t => t.status === 'completed').length;

  const stats = [
    {
      label: 'Active Projects',
      value: activeProjects,
      icon: FolderKanban,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: 'Pending Tasks',
      value: pendingTasks,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      label: 'Completed Tasks',
      value: completedTasks,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
  ];

  if (user.role === 'general_manager') {
    stats.push({
      label: 'Pending Approvals',
      value: pendingApprovals.length,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600 mt-1">Welcome back, {user.name}</p>
        <p className="text-sm text-gray-500">{getRoleName(user.role)}</p>
      </div>

      {isMarketingDashboard ? <MarketingQuickAccess /> : isDesignerDashboard ? <DesignerQuickAccess /> : leadershipRoles && <LeadershipQuickAccess />}

      {!leadershipRoles && !isMarketingDashboard && !isDesignerDashboard && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">{stat.label}</p>
                      <p className="text-3xl font-bold mt-2">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="hidden lg:block bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Recent Projects</h3>
                <Link to="/projects" className="text-sm text-blue-600 hover:text-blue-700">
                  View all
                </Link>
              </div>
              <div className="space-y-3">
                {userProjects.slice(0, 5).map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="block p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{project.name}</p>
                        <p className="text-sm text-gray-500 mt-1">{project.clientName}</p>
                      </div>
                      <span className={`
                        px-2 py-1 rounded text-xs font-medium
                        ${project.stage === 'completed' ? 'bg-green-100 text-green-700' :
                          project.stage === 'approval' ? 'bg-yellow-100 text-yellow-700' :
                          project.stage === 'execution' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'}
                      `}>
                        {project.stage}
                      </span>
                    </div>
                  </Link>
                ))}
                {userProjects.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No projects found</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">My Tasks</h3>
                <div className="flex items-center gap-3">
                  {user.role === 'marketing_lead' && (
                    <button
                      onClick={() => setShowCreateTask(true)}
                      className="hidden md:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Task</span>
                    </button>
                  )}
                  <Link to="/tasks" className="text-sm text-blue-600 hover:text-blue-700">
                    View all
                  </Link>
                </div>
              </div>
              <div className="space-y-3">
                {userTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{task.title}</p>
                        {task.deadline && (
                          <p className="text-xs text-gray-500 mt-1">
                            Due: {new Date(task.deadline).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <span className={`
                        px-2 py-1 rounded text-xs font-medium
                        ${task.status === 'completed' ? 'bg-green-100 text-green-700' :
                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          task.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'}
                      `}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
                {userTasks.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No tasks assigned</p>
                )}
              </div>
            </div>
          </div>

          {user.role === 'general_manager' && pendingApprovals.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Pending Approvals</h3>
                <Link to="/approvals" className="text-sm text-blue-600 hover:text-blue-700">
                  View all
                </Link>
              </div>
              <div className="space-y-3">
                {pendingApprovals.map((approval) => {
                  const project = mockProjects.find(p => p.id === approval.projectId);
                  return (
                    <Link
                      key={approval.id}
                      to="/approvals"
                      className="block p-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{project?.name}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Stage: {approval.stage} | Requested: {new Date(approval.requestedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                          Pending
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {showCreateTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Create New Task</h3>
            <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault();
              setShowCreateTask(false);
            }}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Title
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter task title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter task description"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project
                </label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Select project</option>
                  {mockProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deadline
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attach File (Optional)
                </label>
                <button
                  type="button"
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>Choose File</span>
                </button>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateTask(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
