import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { mockProjects } from '../data/mockData';
import { getTaskAssigneeLabel, loadDesignerTasks } from '../pages/designerTaskShared';
import {
  DESIGNER_ASSIGNMENTS_NOTIFICATIONS_KEY,
  getPendingReviewCount,
  getPendingReviewHighlightedIds,
} from '../pages/designerAssignmentHighlights';
import { ArrowRight, Briefcase, CircleDollarSign, Database, LayoutGrid } from 'lucide-react';

type QuickAccessButtonProps = {
  to: string;
  label: string;
  icon: React.ElementType;
  badgeCount?: number;
  iconBgClass?: string;
  iconTextClass?: string;
};

function QuickAccessButton({
  to,
  label,
  icon: Icon,
  badgeCount,
  iconBgClass = 'bg-gray-900',
  iconTextClass = 'text-white',
}: QuickAccessButtonProps) {
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
        <ArrowRight className="h-4 w-4 text-gray-400" />
      </span>
    </Link>
  );
}

export function LeadershipQuickAccess() {
  const [paidCustomersCount, setPaidCustomersCount] = useState(3);
  const [dataCollectorCount, setDataCollectorCount] = useState(3);
  const [designerAssignmentsCount, setDesignerAssignmentsCount] = useState(getPendingReviewCount());
  const [designerTasks] = useState(() =>
    loadDesignerTasks()
      .filter((task) => !!task.assignedTo)
      .sort((a, b) => {
        const highlightedIds = getPendingReviewHighlightedIds();
        const aHighlighted = highlightedIds.has(a.id) ? 1 : 0;
        const bHighlighted = highlightedIds.has(b.id) ? 1 : 0;

        if (bHighlighted !== aHighlighted) return bHighlighted - aHighlighted;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
  );

  useEffect(() => {
    const onPaidCustomers = (event: Event) => {
      const customEvent = event as CustomEvent<number>;
      setPaidCustomersCount(customEvent.detail ?? 0);
    };

    const onDataCollector = (event: Event) => {
      const customEvent = event as CustomEvent<number>;
      setDataCollectorCount(customEvent.detail ?? 0);
    };

    const onDesignerAssignments = (event: Event) => {
      const customEvent = event as CustomEvent<number>;
      setDesignerAssignmentsCount(customEvent.detail ?? 0);
    };

    window.addEventListener('paid-customers-notifications-updated', onPaidCustomers);
    window.addEventListener('data-collector-notifications-updated', onDataCollector);
    window.addEventListener(DESIGNER_ASSIGNMENTS_NOTIFICATIONS_KEY, onDesignerAssignments);

    return () => {
      window.removeEventListener('paid-customers-notifications-updated', onPaidCustomers);
      window.removeEventListener('data-collector-notifications-updated', onDataCollector);
      window.removeEventListener(DESIGNER_ASSIGNMENTS_NOTIFICATIONS_KEY, onDesignerAssignments);
    };
  }, []);

  const highlightedIds = getPendingReviewHighlightedIds();

  return (
    <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div>
        <h3 className="text-base font-semibold text-gray-900 sm:text-lg">Management</h3>
        <p className="mt-1 text-sm text-gray-600">
          Jump straight to the operational pages and review the latest designer assignment queue.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <QuickAccessButton
          to="/designer-assignments"
          label="Designer Assignments"
          icon={LayoutGrid}
          badgeCount={designerAssignmentsCount}
          iconBgClass="bg-blue-100"
          iconTextClass="text-blue-600"
        />
        <QuickAccessButton
          to="/data-collector-tasks"
          label="Data Collector Tasks"
          icon={Database}
          badgeCount={dataCollectorCount}
          iconBgClass="bg-green-100"
          iconTextClass="text-green-600"
        />
        <QuickAccessButton
          to="/paid-customers"
          label="Paid Customers"
          icon={CircleDollarSign}
          badgeCount={paidCustomersCount}
          iconBgClass="bg-orange-100"
          iconTextClass="text-orange-600"
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 sm:text-base">Designer Assignment Task List</h4>
            <p className="text-sm text-gray-500">Highlighted items stay on top so they are easy to review.</p>
          </div>
          <Link to="/designer-assignments" className="text-sm font-medium text-blue-600 hover:text-blue-700 sm:shrink-0">
            Open full page
          </Link>
        </div>

        <div className="divide-y divide-gray-100">
          {designerTasks.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">No assigned designer tasks yet.</div>
          ) : (
            designerTasks.slice(0, 6).map((task) => {
              const isHighlighted = highlightedIds.has(task.id);
              const project = mockProjects.find((candidate) => candidate.id === task.projectId);

              return (
                <Link
                  key={task.id}
                  to="/designer-assignments"
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