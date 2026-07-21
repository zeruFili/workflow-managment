import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  MarketingTaskItem,
  MarketingSubmissionWrapper,
} from '../../api/marketingApi';
import { fetchMarketingTasks, getCachedMarketingTasks } from '../data/marketingTaskCache';
import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  LayoutGrid,
  MessageSquare,
  ShieldCheck,
  XCircle,
  AlertCircle,
} from 'lucide-react';

function getSubmissionWrappers(task: MarketingTaskItem): MarketingSubmissionWrapper[] {
  return (task.submissionsWithReviews?.submissions || []).filter((w: any) => w.submission != null);
}

function getLatestActivity(task: MarketingTaskItem): {
  description: string;
  kind: 'review' | 'submission';
  outcome: string;
} | null {
  const wrappers = getSubmissionWrappers(task);
  let latestTs = 0;
  let latest: { description: string; kind: 'review' | 'submission'; outcome: string } | null = null;
  for (const w of wrappers) {
    const s = w.submission;
    if (!s) continue;
    const sTs = Math.max(new Date(s.created_at).getTime(), s.updated_at ? new Date(s.updated_at).getTime() : 0);
    if (sTs > latestTs) {
      latestTs = sTs;
      latest = { description: s.description || '', kind: 'submission', outcome: 'pending' };
    }
    for (const r of (s.reviews || [])) {
      const rTs = Math.max(new Date(r.created_at).getTime(), r.updated_at ? new Date(r.updated_at).getTime() : 0);
      if (rTs > latestTs) {
        latestTs = rTs;
        latest = { description: r.description || '', kind: 'review', outcome: r.review_outcome };
      }
    }
  }
  return latest;
}

function statusColor(status: string | null): string {
  switch (status) {
    case 'approved': return 'bg-green-100 text-green-700';
    case 'rejected': return 'bg-red-100 text-red-700';
    case 'feedback': return 'bg-yellow-100 text-yellow-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

export function MarketingDashboard() {
  const { user } = useAuth();
  const [marketingTasks, setMarketingTasks] = useState<MarketingTaskItem[]>(() => getCachedMarketingTasks() ?? []);
  const [isLoading, setIsLoading] = useState(() => !getCachedMarketingTasks());

  useEffect(() => {
    if (!user) return;
    const cached = getCachedMarketingTasks();
    if (cached) {
      setMarketingTasks(cached);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    fetchMarketingTasks()
      .then((data) => {
        setMarketingTasks(data);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, [user]);

  const tasksWithSubmissions = marketingTasks
    .filter((t) => getSubmissionWrappers(t).length > 0)
    .sort((a, b) => (b.submissionsWithReviews?.latestActivityTs || 0) - (a.submissionsWithReviews?.latestActivityTs || 0))
    .slice(0, 8);

  const activityCount = tasksWithSubmissions.length;
  const requestCount = marketingTasks.length;

  const tiles = [
    {
      label: 'Customer Requests',
      to: '/customer-data',
      value: requestCount,
      icon: ClipboardList,
      tone: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Paid Customers',
      to: '/paid-customers',
      value: activityCount,
      icon: LayoutGrid,
      tone: 'bg-emerald-50 text-emerald-700',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-safe overflow-hidden min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              <ShieldCheck className="h-4 w-4" />
              Marketing Role
            </div>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">Marketing Management Center</h2>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm min-w-[240px]">
            <p className="text-xs uppercase tracking-wide text-slate-500">Viewing as</p>
            <p className="mt-1 font-medium text-slate-900">{user?.full_name}</p>
            <p className="text-sm text-slate-500">Marketing Lead</p>
          </div>
        </div>
      </div>

      {/* Navigation Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link
              key={tile.label}
              to={tile.to}
              className="card-safe overflow-hidden min-w-0 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:ring-2 hover:ring-blue-400"
            >
              <div className={`inline-flex rounded-xl p-2 ${tile.tone}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm text-slate-500">{tile.label}</p>
            </Link>
          );
        })}
      </div>

      {/* Marketing Tasks Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-slate-900">Paid Customers</h3>
          <Link to="/paid-customers" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Open full page
          </Link>
        </div>
        <MarketingTaskList tasks={tasksWithSubmissions} isLoading={isLoading} />
      </div>
    </div>
  );
}

function MarketingTaskList({
  tasks,
  isLoading,
}: {
  tasks: MarketingTaskItem[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="card-safe overflow-hidden min-w-0 rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Loading marketing tasks...
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="card-safe overflow-hidden min-w-0 rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        No marketing tasks with submissions yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {tasks.map((task) => {
        const activity = getLatestActivity(task);

        return (
          <Link
            key={task.id}
            to={`/paid-customers?openDetail=${task.id}`}
            className="card-safe overflow-hidden min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:ring-2 hover:ring-blue-400"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h4 className="font-semibold text-gray-900">{task.title}</h4>
                <p className="text-xs text-gray-500 mt-1">
                  {task.customer_name} · {task.category}
                </p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${statusColor(task.status)}`}>
                {task.status || 'pending'}
              </span>
            </div>

            <p className="text-sm text-gray-600 line-clamp-2 mb-3">{task.description}</p>

            {activity && activity.description ? (
              (() => {
                const outcome = activity.outcome;
                const isApproved = outcome === 'approved';
                const isRejected = outcome === 'rejected';
                const isFeedback = outcome === 'feedback';
                const BadgeIcon = isApproved ? CheckCircle2 : isRejected ? XCircle : isFeedback ? AlertCircle : MessageSquare;
                const containerColor = isApproved
                  ? 'bg-green-50 border-green-200'
                  : isRejected
                  ? 'bg-red-50 border-red-200'
                  : isFeedback
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-blue-50 border-blue-200';
                const textColor = isApproved
                  ? 'text-green-700' : isRejected
                  ? 'text-red-700' : isFeedback
                  ? 'text-yellow-700' : 'text-blue-700';
                const iconColor = isApproved
                  ? 'text-green-600' : isRejected
                  ? 'text-red-600' : isFeedback
                  ? 'text-yellow-600' : 'text-blue-600';
                const statusLabel = isApproved ? 'Approved' : isRejected ? 'Rejected' : isFeedback ? 'Feedback Given' : 'Pending';
                return (
                  <div className={`mb-3 p-3 rounded-lg border ${containerColor}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <BadgeIcon className={`w-4 h-4 ${iconColor}`} />
                      <p className={`text-sm font-medium ${textColor}`}>{statusLabel}</p>
                    </div>
                    <p className="text-sm text-gray-700">{activity.description}</p>
                  </div>
                );
              })()
            ) : null}

            <div className="flex items-center gap-3 text-xs text-gray-500 pt-3 border-t border-gray-100">
              {task.due_date && (
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Due: {new Date(task.due_date).toLocaleDateString()}</span>
              )}
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{new Date(task.created_at).toLocaleDateString()}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
