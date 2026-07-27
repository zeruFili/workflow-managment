import React, { useEffect, useState } from 'react';
import { useAuth, getRoleName } from '../contexts/AuthContext';
import { useNotificationCounts } from '../contexts/NotificationCountsContext';
import { Link } from 'react-router-dom';
import { mockProjects, mockTasks } from '../data/mockData';
import {
  Plus,
  Upload,
  Briefcase,
  Megaphone,
  ShieldCheck,
} from 'lucide-react';
import { LeadershipQuickAccess } from '../components/LeadershipQuickAccess';
import designerApi, { DesignerTaskItem } from '../../api/designerApi';
import { designerTaskCache } from '../data/designerTaskCache';

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
      className="card-safe overflow-hidden min-w-0 relative flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
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

function DesignerQuickAccess() {
  const { user } = useAuth();
  const { counts } = useNotificationCounts();
  const [designerTasks, setDesignerTasks] = useState<DesignerTaskItem[]>([]);

  useEffect(() => {
    if (!user) return;
    const cached = designerTaskCache.get({ limit: 5 });
    if (cached) {
      setDesignerTasks(cached.data);
      return;
    }
    designerTaskCache.fetch({ limit: 5 })
      .then((result) => {
        setDesignerTasks(result.data);
      })
      .catch(() => {});
  }, [user]);

  const recentTasks = [...designerTasks]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="card-safe overflow-hidden min-w-0 space-y-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
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
          badgeCount={counts.designerTasks}
          iconBgClass="bg-blue-100"
          iconTextClass="text-blue-600"
        />
        <DashboardButton
          to="/open-job-postings"
          label="Open Job Postings"
          icon={Megaphone}
          badgeCount={counts.designerJobPostings}
          iconBgClass="bg-emerald-100"
          iconTextClass="text-emerald-600"
        />
      </div>

      <div className="card-safe overflow-hidden min-w-0 rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 sm:text-base">Designer Task List</h4>
            <p className="text-sm text-gray-500">Most recent tasks from the Designer Task page.</p>
          </div>
          <Link to="/designer-tasks" className="text-sm font-medium text-blue-600 hover:text-blue-700 sm:shrink-0">
            Open full page
          </Link>
        </div>

        <div className="divide-y divide-gray-100">
          {recentTasks.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">No assigned designer tasks yet.</div>
          ) : (
            recentTasks.slice(0, 5).map((task) => {
              return (
                <Link
                  key={task.id}
                  to={`/designer-tasks?open=${task.id}`}
                  className="block px-4 py-4 transition-colors hover:bg-gray-50"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h5 className="truncate font-medium text-gray-900">{task.title}</h5>
                      </div>
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">{task.description}</p>
                      {task.due_date && (
                        <p className="text-sm text-gray-500">Due: {new Date(task.due_date).toLocaleDateString()}</p>
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

  if (!user) return null;

  const userProjects = mockProjects.filter(p => {
    if (user.role === 'general_manager' || user.role === 'ceo') {
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
    if (user.role === 'general_manager' || user.role === 'ceo') {
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

  const leadershipRoles = user.role === 'general_manager' || user.role === 'ceo';
  const isDesignerDashboard = user.role === 'designer';

  return (
    <div className="space-y-6">
      <div className="card-safe overflow-hidden min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              <ShieldCheck className="h-4 w-4" />
              {getRoleName(user.role)} Role
            </div>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">Dashboard</h2>
            {leadershipRoles && (
              <p className="mt-1 text-sm text-slate-500">Welcome back, {user.full_name}</p>
            )}
          </div>
          <div className="card-safe overflow-hidden min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm min-w-0 flex-1 sm:min-w-[240px]">
            <p className="text-xs uppercase tracking-wide text-slate-500">Viewing as</p>
            <p className="mt-1 font-medium text-slate-900">{user.full_name}</p>
            <p className="text-sm text-slate-500">{getRoleName(user.role)}</p>
          </div>
        </div>
      </div>

      {isDesignerDashboard ? <DesignerQuickAccess /> : leadershipRoles && <LeadershipQuickAccess />}

      {!leadershipRoles && !isDesignerDashboard && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-safe overflow-hidden min-w-0 bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <div className="min-w-0">
                  <h3 className="font-semibold text-base sm:text-lg text-gray-900">Recent Projects</h3>
                  <p className="text-sm text-gray-500">Latest project activity</p>
                </div>
                <Link to="/projects" className="text-sm font-medium text-blue-600 hover:text-blue-700 sm:shrink-0">
                  View all
                </Link>
              </div>
              <div className="divide-y divide-gray-100">
                {userProjects.slice(0, 5).map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">{project.name}</p>
                        <p className="text-sm text-gray-500 mt-1">{project.clientName}</p>
                      </div>
                      <span className={`
                        inline-flex px-2 py-1 rounded text-xs font-medium self-start sm:self-center shrink-0
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
                  <p className="text-center text-gray-500 py-8 px-4">No projects found</p>
                )}
              </div>
            </div>

            <div className="card-safe overflow-hidden min-w-0 bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <div className="min-w-0">
                  <h3 className="font-semibold text-base sm:text-lg text-gray-900">My Tasks</h3>
                  <p className="text-sm text-gray-500">Assigned work items</p>
                </div>
                <div className="flex items-center gap-3">
                  {user.role === 'marketing_lead' && (
                    <button
                      onClick={() => setShowCreateTask(true)}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="sm:inline">Create Task</span>
                    </button>
                  )}
                  <Link to="/tasks" className="text-sm font-medium text-blue-600 hover:text-blue-700 sm:shrink-0">
                    View all
                  </Link>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {userTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">{task.title}</p>
                        {task.deadline && (
                          <p className="text-xs text-gray-500 mt-1">
                            Due: {new Date(task.deadline).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <span className={`
                        inline-flex px-2 py-1 rounded text-xs font-medium self-start sm:self-center shrink-0
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
                  <p className="text-center text-gray-500 py-8 px-4">No tasks assigned</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {showCreateTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card-safe overflow-hidden min-w-0 bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
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
