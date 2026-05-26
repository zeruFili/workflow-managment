import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { mockProjects, mockTasks } from '../data/mockData';
import { Task, TaskStatus } from '../types';
import {
  Calendar,
  Clock,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Edit,
  Upload,
  FileText,
  AlertCircle,
} from 'lucide-react';
import {
  SITE_ENGINEER_NOTIFICATIONS_KEY,
  SITE_ENGINEER_HIGHLIGHTED_IDS,
} from './siteEngineerTaskShared';

const TASK_STORAGE_KEY = 'workflow-tasks';

const viewedSiteEngineerCards = new Set<string>();

function publishBadgeCount(count: number) {
  window.dispatchEvent(
    new CustomEvent(SITE_ENGINEER_NOTIFICATIONS_KEY, { detail: count })
  );
}

const statusGroups = [
  {
    status: 'pending',
    label: 'Pending',
    icon: Clock,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  {
    status: 'in_progress',
    label: 'In Progress',
    icon: CheckCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    status: 'completed',
    label: 'Completed',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    status: 'incomplete',
    label: 'Incomplete',
    icon: AlertCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  {
    status: 'rejected',
    label: 'Rejected',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
] as const;

export function SiteEngineerTasks() {
  const { user } = useAuth();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>(() => {
    const savedTasks = localStorage.getItem(TASK_STORAGE_KEY);
    if (savedTasks) {
      const parsedTasks = JSON.parse(savedTasks) as Task[];
      const mergedTasks = [
        ...parsedTasks.map((task) => {
          const seedTask = mockTasks.find((candidate) => candidate.id === task.id);
          return seedTask
            ? {
                ...seedTask,
                ...task,
                instruction: task.instruction || seedTask.instruction,
              }
            : task;
        }),
        ...mockTasks.filter(
          (seedTask) => !parsedTasks.some((task) => task.id === seedTask.id)
        ),
      ];
      localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(mergedTasks));
      return mergedTasks;
    }

    localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(mockTasks));
    return mockTasks;
  });

  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const seenThisSession = useRef<Set<string>>(new Set());
  const observedElements = useRef<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  const highlightedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    highlightedIdsRef.current = highlightedIds;
  }, [highlightedIds]);

  useEffect(() => {
    const unseen = new Set(
      SITE_ENGINEER_HIGHLIGHTED_IDS.filter((id) => !viewedSiteEngineerCards.has(id))
    );
    setHighlightedIds(unseen);
    publishBadgeCount(unseen.size);
  }, []);

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observedElements.current.clear();
    }

    if (highlightedIds.size === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = (entry.target as HTMLElement).dataset.highlightedId;
          if (!id || !highlightedIds.has(id)) return;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
            if (!observedElements.current.has(id)) {
              observedElements.current.add(id);
              seenThisSession.current.add(id);
            }
          }
        });
      },
      { threshold: [0.7] }
    );

    observerRef.current = observer;

    highlightedIds.forEach((id) => {
      const el = document.querySelector(`[data-highlighted-id="${id}"]`);
      if (el && !observedElements.current.has(id)) {
        observer.observe(el);
      }
    });

    return () => {
      observer.disconnect();
      observedElements.current.clear();
    };
  }, [highlightedIds]);

  useEffect(() => {
    return () => {
      const idsSeen = Array.from(seenThisSession.current);
      if (idsSeen.length > 0) {
        idsSeen.forEach((id) => viewedSiteEngineerCards.add(id));

        const remaining = new Set(
          SITE_ENGINEER_HIGHLIGHTED_IDS.filter((id) => !viewedSiteEngineerCards.has(id))
        );
        publishBadgeCount(remaining.size);
        setHighlightedIds(remaining);
      }
    };
  }, []);

  if (!user || user.role !== 'site_engineer') return null;

  let userTasks = tasks.filter((task) => task.assignedTo === user.id);

  if (filterStatus !== 'all') {
    userTasks = userTasks.filter((task) => task.status === filterStatus);
  }

  const sortedUserTasks = useMemo(() => {
    return [...userTasks].sort((a, b) => {
      const aHL = highlightedIds.has(a.id) ? 1 : 0;
      const bHL = highlightedIds.has(b.id) ? 1 : 0;
      if (bHL !== aHL) return bHL - aHL;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [userTasks, highlightedIds]);

  const getProject = (projectId: string) => {
    return mockProjects.find((project) => project.id === projectId);
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    setTasks((currentTasks) => {
      const updatedTasks = currentTasks.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task
      );
      localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(updatedTasks));
      return updatedTasks;
    });
    setEditingTask(null);
  };

  const handleUpdateDescription = (taskId: string, description: string) => {
    setTasks((currentTasks) => {
      const updatedTasks = currentTasks.map((task) =>
        task.id === taskId ? { ...task, description } : task
      );
      localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(updatedTasks));
      return updatedTasks;
    });
  };

  const handleAttachFile = (taskId: string) => {
    console.log(`Attaching file to task ${taskId}`);
  };

  const canEditTask = (task: Task) => task.assignedTo === user.id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Site Engineer Tasks</h2>
          <p className="text-gray-600 mt-1">Manage and track your assigned site checks</p>
          {highlightedIds.size > 0 && (
            <p className="mt-2 text-sm text-blue-600 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-semibold">
                {highlightedIds.size}
              </span>
              new {highlightedIds.size === 1 ? 'task' : 'tasks'} since your last visit
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded-lg transition-colors text-sm ${
            filterStatus === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          All Tasks ({userTasks.length})
        </button>
        {statusGroups.map((group) => {
          const count = userTasks.filter((task) => task.status === group.status).length;
          return (
            <button
              key={group.status}
              onClick={() => setFilterStatus(group.status)}
              className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                filterStatus === group.status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {group.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sortedUserTasks.map((task) => {
          const project = getProject(task.projectId);
          const isOverdue =
            task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed';
          const isEditing = editingTask === task.id;
          const isHighlighted = highlightedIds.has(task.id);

          return (
            <div
              key={task.id}
              data-highlighted-id={isHighlighted ? task.id : undefined}
              className={[
                'rounded-xl p-6 shadow-sm transition-all duration-300',
                isHighlighted
                  ? 'border-2 border-blue-400 ring-4 ring-blue-100 bg-white shadow-blue-100 shadow-sm'
                  : 'bg-white border border-gray-200 hover:shadow-md',
              ].join(' ')}
            >
              {isHighlighted && (
                <div className="mb-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    New
                  </span>
                </div>
              )}

              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-lg text-gray-900 flex-1 pr-4">{task.title}</h3>
                <span
                  className={`
                    px-2 py-1 rounded text-xs font-medium whitespace-nowrap
                    ${task.status === 'completed' ? 'bg-green-100 text-green-700' :
                      task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      task.status === 'incomplete' ? 'bg-orange-100 text-orange-700' :
                      task.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'}
                  `}
                >
                  {task.status.replace('_', ' ')}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-4">{task.description}</p>

              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                  Instruction
                </p>
                <p className="text-sm text-gray-700 mt-1">{task.instruction}</p>
              </div>

              {project && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Project</p>
                  <p className="font-medium text-gray-900 mt-1">{project.name}</p>
                </div>
              )}

              {task.approvalStatus && (
                <div
                  className={`mb-4 p-3 rounded-lg ${
                    task.approvalStatus === 'approved'
                      ? 'bg-green-50 border border-green-200'
                      : task.approvalStatus === 'rejected'
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-yellow-50 border border-yellow-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {task.approvalStatus === 'approved' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                    )}
                    <p
                      className={`text-sm font-medium ${
                        task.approvalStatus === 'approved'
                          ? 'text-green-700'
                          : task.approvalStatus === 'rejected'
                          ? 'text-red-700'
                          : 'text-yellow-700'
                      }`}
                    >
                      {task.approvalStatus === 'approved'
                        ? 'Approved'
                        : task.approvalStatus === 'rejected'
                        ? 'Rejected'
                        : 'Pending Approval'}
                    </p>
                  </div>
                  {task.approvalFeedback && (
                    <p className="text-sm text-gray-700 italic">"{task.approvalFeedback}"</p>
                  )}
                  {task.approvedBy && task.approvedAt && (
                    <p className="text-xs text-gray-500 mt-2">
                      By GM on {new Date(task.approvedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              {task.attachments && task.attachments.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Attachments</p>
                  <div className="space-y-2">
                    {task.attachments.map((attachment, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded"
                      >
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span>{attachment}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2 text-sm">
                {task.deadline && (
                  <div className={`flex items-center gap-2 ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                    <Calendar className="w-4 h-4" />
                    <span>
                      Due: {new Date(task.deadline).toLocaleDateString()}
                      {isOverdue && ' (Overdue)'}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {canEditTask(task) && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Update Status
                        </label>
                        <select
                          defaultValue={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="incomplete">Incomplete</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Update Description
                        </label>
                        <textarea
                          defaultValue={task.description}
                          onChange={(e) => handleUpdateDescription(task.id, e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="Add description..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Attach Document
                        </label>
                        <button
                          onClick={() => handleAttachFile(task.id)}
                          className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                        >
                          <Upload className="w-4 h-4" />
                          <span>Upload File</span>
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingTask(null)}
                          className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => setEditingTask(null)}
                          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingTask(task.id)}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors text-sm"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Update Task</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {userTasks.length === 0 && (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">No tasks found</p>
        </div>
      )}
    </div>
  );
}