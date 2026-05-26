import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DesignerTask, DesignerTaskApplication } from '../types';
import { APPLICATION_STORAGE_KEY, TASK_STORAGE_KEY } from './designerTaskShared';
import { CheckCircle2, User, Users } from 'lucide-react';
import {
  mockDesignerTasksForApplications,
  mockDesignerTaskApplicationsForApplications,
} from '../data/mockData';

// ─── Constants ────────────────────────────────────────────────────────────────

const APPLICATIONS_PAGE_TASK_STORAGE_KEY = 'designer_applications_page_tasks';
const APPLICATIONS_PAGE_APP_STORAGE_KEY = 'designer_applications_page_applications';

const reviewRoles = new Set(['ceo', 'general_manager']);

const designerRoster = [
  { id: '3', name: 'Emily Chen', role: 'Design Team Leader' },
  { id: '4', name: 'Michael Brown', role: 'Designer' },
  { id: '9', name: 'Sophia Ahmed', role: 'Designer' },
  { id: '10', name: 'Daniel Reed', role: 'Designer' },
  { id: '11', name: 'Liam Carter', role: 'Designer' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDesignerName(designerId: string): string {
  return designerRoster.find((d) => d.id === designerId)?.name ?? `Designer ${designerId}`;
}

// Merge persisted data with seed data so that any new seed entries are picked up
// while user-made changes are preserved.
function mergeWithSeed<T extends { id: string }>(persisted: T[], seed: T[]): T[] {
  return [
    ...persisted.map((item) => {
      const seedItem = seed.find((s) => s.id === item.id);
      return seedItem ? { ...seedItem, ...item } : item;
    }),
    ...seed.filter((s) => !persisted.some((p) => p.id === s.id)),
  ];
}

function loadTasks(): DesignerTask[] {
  const saved = localStorage.getItem(APPLICATIONS_PAGE_TASK_STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved) as DesignerTask[];
    const merged = mergeWithSeed(parsed, mockDesignerTasksForApplications);
    localStorage.setItem(APPLICATIONS_PAGE_TASK_STORAGE_KEY, JSON.stringify(merged));
    return merged;
  }
  localStorage.setItem(
    APPLICATIONS_PAGE_TASK_STORAGE_KEY,
    JSON.stringify(mockDesignerTasksForApplications)
  );
  return mockDesignerTasksForApplications;
}

function loadApplications(): DesignerTaskApplication[] {
  const saved = localStorage.getItem(APPLICATIONS_PAGE_APP_STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved) as DesignerTaskApplication[];
    const merged = mergeWithSeed(parsed, mockDesignerTaskApplicationsForApplications);
    localStorage.setItem(APPLICATIONS_PAGE_APP_STORAGE_KEY, JSON.stringify(merged));
    return merged;
  }
  localStorage.setItem(
    APPLICATIONS_PAGE_APP_STORAGE_KEY,
    JSON.stringify(mockDesignerTaskApplicationsForApplications)
  );
  return mockDesignerTaskApplicationsForApplications;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DesignerApplications() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<DesignerTask[]>(loadTasks);
  const [applications, setApplications] = useState<DesignerTaskApplication[]>(loadApplications);

  // Per-task selected designer in the dropdown (only while the assignment UI is open)
  const [selectedDesignerByTask, setSelectedDesignerByTask] = useState<Record<string, string>>({});
  // Tracks which already-assigned tasks are currently being re-edited
  const [editingAssignment, setEditingAssignment] = useState<Record<string, boolean>>({});

  if (!user) return null;

  if (!reviewRoles.has(user.role)) {
    return (
      <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">Access denied. CEO or General Manager only.</p>
      </div>
    );
  }

  // ── Persistence helpers ──────────────────────────────────────────────────

  const persistTasks = (updated: DesignerTask[]) => {
    setTasks(updated);
    localStorage.setItem(APPLICATIONS_PAGE_TASK_STORAGE_KEY, JSON.stringify(updated));
  };

  const persistApplications = (updated: DesignerTaskApplication[]) => {
    setApplications(updated);
    localStorage.setItem(APPLICATIONS_PAGE_APP_STORAGE_KEY, JSON.stringify(updated));
  };

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleAssign = (taskId: string) => {
    const selectedDesignerId = selectedDesignerByTask[taskId];
    if (!selectedDesignerId) return;

    const now = new Date().toISOString();
    const assignedDesignerName = getDesignerName(selectedDesignerId);

    // Mark task as assigned / in-progress
    const updatedTasks = tasks.map((task) =>
      task.id === taskId
        ? { ...task, assignedTo: selectedDesignerId, status: 'in_progress' as const }
        : task
    );

    // Update application statuses for this task:
    // - selected applicant → 'assigned'
    // - all other applicants → 'rejected'
    // If the selected designer did NOT apply, create a synthetic application for them
    const taskApps = applications.filter((a) => a.taskId === taskId);
    const alreadyHasApp = taskApps.some((a) => a.applicantId === selectedDesignerId);

    let updatedApplications = applications.map((app) => {
      if (app.taskId !== taskId) return app;

      if (app.applicantId === selectedDesignerId) {
        return {
          ...app,
          status: 'assigned' as const,
          reviewedBy: user.id,
          reviewedByName: user.name,
          reviewedAt: now,
          reviewNote: `Assigned to ${assignedDesignerName}.`,
        };
      }

      return {
        ...app,
        status: 'rejected' as const,
        reviewedBy: user.id,
        reviewedByName: user.name,
        reviewedAt: now,
        reviewNote: `Assigned to ${assignedDesignerName} instead.`,
      };
    });

    // If designer didn't apply, add a synthetic record so their name is trackable
    if (!alreadyHasApp) {
      const syntheticApp: DesignerTaskApplication = {
        id: `dapp-manual-${taskId}-${selectedDesignerId}`,
        taskId,
        applicantId: selectedDesignerId,
        applicantName: assignedDesignerName,
        applicantRole: 'designer',
        message: '(Manually assigned — did not apply)',
        appliedAt: now,
        status: 'assigned',
        reviewedBy: user.id,
        reviewedByName: user.name,
        reviewedAt: now,
        reviewNote: `Manually assigned to ${assignedDesignerName}.`,
      };
      updatedApplications = [...updatedApplications, syntheticApp];
    }

    persistTasks(updatedTasks);
    persistApplications(updatedApplications);

    // Clean up transient UI state
    setSelectedDesignerByTask((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
    setEditingAssignment((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  };

  const startEditing = (taskId: string, currentAssignedTo: string | undefined) => {
    setSelectedDesignerByTask((prev) => ({ ...prev, [taskId]: currentAssignedTo ?? '' }));
    setEditingAssignment((prev) => ({ ...prev, [taskId]: true }));
  };

  const cancelEditing = (taskId: string) => {
    setEditingAssignment((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
    setSelectedDesignerByTask((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  };

  // ── Build grouped list ───────────────────────────────────────────────────

  // Show a card for every task that either has at least one application OR
  // has already been assigned by the reviewer.
  const groupedApplications = tasks
    .map((task) => ({
      task,
      applications: applications.filter((a) => a.taskId === task.id),
    }))
    .filter(({ task, applications: apps }) => apps.length > 0 || !!task.assignedTo);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Designer Applications</h2>
          <p className="text-gray-600 mt-1">
            Review applications for each task, then assign a designer.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <Users className="w-4 h-4" />
          Admin and General Manager only
        </div>
      </div>

      {groupedApplications.length > 0 ? (
        <div className="space-y-4">
          {groupedApplications.map(({ task, applications: taskApplications }) => {
            const isAssigned = !!task.assignedTo;
            const isEditing = !!editingAssignment[task.id];

            // The assignment UI is shown when either:
            // (a) no one is assigned yet — reviewer needs to make the first assignment
            // (b) the reviewer has clicked "Edit Assigned User"
            const showAssignmentUI = !isAssigned || isEditing;

            // Always hide the assigned designer from the applicants list —
            // their name is displayed prominently below the task title instead.
            const visibleApplications = taskApplications.filter(
              (app) => app.applicantId !== task.assignedTo
            );

            // Build assign-dropdown options:
            // 1. Designers who applied (shown first)
            // 2. Designers who did NOT apply (shown after, labelled)
            const applicantIds = new Set(taskApplications.map((a) => a.applicantId));
            const applicantOptions = taskApplications.map((app) => ({
              id: app.applicantId,
              label: `${app.applicantName} (applied)`,
            }));
            const nonApplicantOptions = designerRoster
              .filter((d) => !applicantIds.has(d.id))
              .map((d) => ({ id: d.id, label: `${d.name} (${d.role}, did not apply)` }));
            const assignOptions = [...applicantOptions, ...nonApplicantOptions];

            return (
              <div
                key={task.id}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 space-y-4"
              >
                {/* ── Task header ─────────────────────────────────────────── */}
                <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{task.title}</h3>
                    <p className="text-sm text-gray-500">{task.description}</p>

                    {/* Assigned designer shown below title once assignment is made */}
                    {isAssigned && (
                      <p className="text-sm font-medium text-blue-700 mt-2">
                        Assigned to: {getDesignerName(task.assignedTo!)}
                      </p>
                    )}
                  </div>

                  <span
                    className={`shrink-0 px-2 py-1 rounded-full text-xs font-medium ${
                      isAssigned
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {isAssigned ? 'User Assigned' : 'Pending assignment'}
                  </span>
                </div>

                {/* ── Applicants list (excludes the already-assigned designer) ── */}
                {visibleApplications.length > 0 && (
                  <div className="space-y-3">
                    {visibleApplications.map((application) => (
                      <div
                        key={application.id}
                        className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-3 flex-col sm:flex-row">
                          <div>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-500" />
                              <p className="font-medium text-gray-900">{application.applicantName}</p>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Applied on {new Date(application.appliedAt).toLocaleString()}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 px-2 py-1 rounded-full text-xs font-medium ${
                              application.status === 'assigned'
                                ? 'bg-green-100 text-green-700'
                                : application.status === 'rejected'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {application.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-3">{application.message}</p>
                        {application.reviewNote && (
                          <p className="text-xs text-gray-500 mt-2">• {application.reviewNote}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Assignment / Edit section ────────────────────────────── */}
                {showAssignmentUI ? (
                  <div className="rounded-lg border border-dashed border-blue-300 bg-blue-50 p-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {isEditing ? 'Choose new designer' : 'Assign designer'}
                      </label>
                      <select
                        value={selectedDesignerByTask[task.id] || ''}
                        onChange={(e) =>
                          setSelectedDesignerByTask((prev) => ({
                            ...prev,
                            [task.id]: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Choose designer</option>
                        {assignOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Includes designers who did not apply for this task.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleAssign(task.id)}
                        disabled={!selectedDesignerByTask[task.id]}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {isEditing ? 'Update Assignment' : 'Assign Selected Designer'}
                      </button>

                      {/* Cancel only makes sense when editing an existing assignment */}
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => cancelEditing(task.id)}
                          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Shown only after the reviewer has made an assignment */
                  <div className="rounded-lg border border-dashed border-green-300 bg-green-50 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        User Assigned: {getDesignerName(task.assignedTo!)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEditing(task.id, task.assignedTo)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm"
                    >
                      Edit Assigned User
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No designer applications found yet.</p>
        </div>
      )}
    </div>
  );
}

export default DesignerApplications;