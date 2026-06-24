import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle2, User, Users, Loader2, AlertCircle, Clock, Edit, XCircle, Image, Lock, Trash2, X } from 'lucide-react';
import designerApi, { DesignerTaskItem, DesignerApplicationItem } from '../../api/designerApi';
import { designerTaskCache } from '../data/designerTaskCache';
import userApi, { UserItem } from '../../api/userApi';
import { userCache } from '../data/userCache';
import {
  createGeneralNotification,
  loadQuantityReviewNotifications,
  saveQuantityReviewNotifications,
} from '../data/quantitySurveyorWorkflow';

const reviewRoles = new Set(['ceo', 'general_manager']);
const GRACE_PERIOD_HOURS = 48;

function hoursSince(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
}

function getStatusTone(isAssigned: boolean, isSelectedApp: boolean) {
  if (isAssigned && isSelectedApp) return 'bg-green-100 text-green-700';
  return 'bg-yellow-100 text-yellow-700';
}

export function DesignerApplications() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<DesignerTaskItem[]>([]);
  const [applicationsByTask, setApplicationsByTask] = useState<Record<string, DesignerApplicationItem[]>>({});
  const [designers, setDesigners] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDesignerByTask, setSelectedDesignerByTask] = useState<Record<string, string>>({});
  const [editingAssignment, setEditingAssignment] = useState<Record<string, boolean>>({});

  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  // ── Edit Task state ──
  const [showEditTask, setShowEditTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', instruction: '', storyPoints: '', deadline: '', is_public: false, assigned_to_user_id: '' });
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const editImageFileRef = useRef<File | null>(null);
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // ── Delete Task state ──
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const initiallyAssignedIds = useRef<Set<string>>(new Set());
  const editedThisSession = useRef<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [fetchedTasks, users] = await Promise.all([
        designerTaskCache.fetch({ limit: 100 }),
        userCache.fetch({ role: 'designer' }),
      ]);

      setTasks(fetchedTasks);
      setDesigners(users);
      initiallyAssignedIds.current = new Set(
        fetchedTasks.filter((t) => t.assigned_to_user_id).map((t) => t.id)
      );

      if (fetchedTasks.length > 0) {
        const appResults = await Promise.all(
          fetchedTasks.map((task) =>
            designerApi
              .getApplications(task.id, { limit: 100 })
              .then((res) => ({ taskId: task.id, apps: res.data }))
              .catch(() => ({ taskId: task.id, apps: [] as DesignerApplicationItem[] }))
          )
        );

        const appsMap: Record<string, DesignerApplicationItem[]> = {};
        appResults.forEach(({ taskId, apps }) => {
          appsMap[taskId] = apps;
        });
        setApplicationsByTask(appsMap);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const groupedApplications = useMemo(
    () =>
      tasks.map((task) => ({
        task,
        applications: applicationsByTask[task.id] || [],
      })),
    [tasks, applicationsByTask]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
        <p className="mt-3 text-red-700 font-medium">Failed to load designer applications</p>
        <p className="mt-1 text-sm text-red-600">{error}</p>
        <button
          onClick={fetchData}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!user) return null;

  if (!reviewRoles.has(user.role)) {
    return (
      <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">Access denied. CEO or General Manager only.</p>
      </div>
    );
  }

  const handleAssign = async (taskId: string) => {
    const selectedDesignerId = selectedDesignerByTask[taskId];
    if (!selectedDesignerId) return;

    const wasAssignedBefore =
      initiallyAssignedIds.current.has(taskId) || editedThisSession.current.has(taskId);

    setAssigningTaskId(taskId);
    setAssignError(null);

    try {
      await designerApi.assignDesigner(taskId, selectedDesignerId);

      if (wasAssignedBefore) {
        editedThisSession.current.add(taskId);
      }

      const chosenDesigner = designers.find((d) => d.id === selectedDesignerId);

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? {
                ...task,
                assigned_to_user_id: selectedDesignerId,
                assigned_to_user: chosenDesigner
                  ? { id: chosenDesigner.id, full_name: chosenDesigner.full_name, role: chosenDesigner.role }
                  : null,
                assigned_at: new Date().toISOString(),
                updated_by_user: user
                  ? { id: user.id, full_name: user.full_name, role: user.role }
                  : null,
              }
            : task
        )
      );

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

      if (user) {
        const existing = loadQuantityReviewNotifications();
        const assignedTask = tasks.find((t) => t.id === taskId);
        saveQuantityReviewNotifications([
          createGeneralNotification({
            type: 'designer_assigned',
            taskId,
            actorRole: user.role,
            message: 'Designer assigned to task',
            description: `Designer ${chosenDesigner?.full_name || selectedDesignerId} assigned to task: ${assignedTask?.title || taskId}`,
          }),
          ...existing,
        ]);
      }
    } catch (err: any) {
      setAssignError(err?.response?.data?.message || err?.message || 'Failed to assign designer');
    } finally {
      setAssigningTaskId(null);
    }
  };

  const startEditing = (taskId: string, currentAssignedTo: string | undefined) => {
    setSelectedDesignerByTask((prev) => ({ ...prev, [taskId]: currentAssignedTo ?? '' }));
    setEditingAssignment((prev) => ({ ...prev, [taskId]: true }));
    setAssignError(null);
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
    setAssignError(null);
  };

  const openEditTask = (task: DesignerTaskItem) => {
    setEditingTaskId(task.id);
    setEditForm({
      title: task.title,
      description: task.description,
      instruction: '',
      storyPoints: String(task.story_point),
      deadline: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
      is_public: task.is_public ?? false,
      assigned_to_user_id: task.assigned_to_user_id || '',
    });
    setEditImagePreview(null);
    editImageFileRef.current = null;
    setEditFormErrors({});
    setEditError('');
    setEditSuccess('');
    setShowEditTask(true);
  };

  const handleEditTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingTaskId) return;

    const title = editForm.title.trim();
    const description = editForm.description.trim();
    const storyPointsRaw = editForm.storyPoints.trim();
    const instruction = editForm.instruction.trim();
    const deadline = editForm.deadline.trim();
    const assignedTo = editForm.assigned_to_user_id.trim();

    setEditError('');

    const errors: Record<string, string> = {};
    if (!title) errors.title = 'Title is required.';
    else if (title.length > 500) errors.title = 'Title must be 500 characters or fewer.';
    if (!description) errors.description = 'Description is required.';
    else if (description.length > 5000) errors.description = 'Description must be 5000 characters or fewer.';
    if (!storyPointsRaw) {
      errors.storyPoints = 'Story Points are required.';
    } else {
      const sp = Number(storyPointsRaw);
      if (isNaN(sp) || sp < 1 || sp > 100) errors.storyPoints = 'Story Points must be a number between 1 and 100.';
    }

    setEditFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const storyPoints = Number(storyPointsRaw);
    const file = editImageFileRef.current;

    const fullDescription = instruction
      ? `${description}\n\nInstructions:\n${instruction}`
      : description;

    setIsUpdating(true);

    try {
      let response: { success: boolean; data?: DesignerTaskItem; message?: string };

      if (file) {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', fullDescription);
        formData.append('story_point', String(storyPoints));
        formData.append('is_public', String(editForm.is_public));
        if (deadline) formData.append('due_date', new Date(deadline).toISOString());
        if (assignedTo) formData.append('assigned_to_user_id', assignedTo);
        formData.append('attachmentFiles', file);

        response = await designerApi.updateDesignerTask(editingTaskId, formData);
      } else {
        const payload: Record<string, unknown> = {
          title,
          description: fullDescription,
          story_point: storyPoints,
          is_public: editForm.is_public,
        };
        if (deadline) payload.due_date = new Date(deadline).toISOString();
        if (assignedTo) payload.assigned_to_user_id = assignedTo;

        response = await designerApi.updateDesignerTask(editingTaskId, payload);
      }

      if (response.success) {
        setEditSuccess(response.message || 'Task updated successfully');
        setShowEditTask(false);
        setEditingTaskId(null);
        setEditFormErrors({});
        fetchData();
      } else {
        setEditError(response.message || 'Failed to update task');
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setEditError(msg || 'Unable to update task. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const canDeleteApplicationTask = (task: DesignerTaskItem): boolean => {
    const taskApplications = applicationsByTask[task.id] || [];
    if (taskApplications.length > 0) return false;

    const swr = task.submissionsWithReviews;
    if (swr) {
      const hasSubmissions =
        (swr.caseStudy || []).length > 0 ||
        (swr.designing || []).length > 0 ||
        (swr.rendering || []).length > 0 ||
        (swr.finalStage || []).length > 0;
      if (hasSubmissions) return false;
    }

    if (task.assigned_to_user_id) {
      const assignmentDate = task.assigned_at ? new Date(task.assigned_at) : (task.updated_at ? new Date(task.updated_at) : null);
      if (assignmentDate) {
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
        if (Date.now() - assignmentDate.getTime() > threeDaysMs) return false;
      }
    }
    return true;
  };

  const openDeleteConfirm = (taskId: string) => {
    setDeletingTaskId(taskId);
    setDeleteError('');
    setShowDeleteConfirm(true);
  };

  const handleDeleteTask = async () => {
    if (!deletingTaskId) return;
    setIsDeleting(true);
    setDeleteError('');

    try {
      const response = await designerApi.deleteDesignerTask(deletingTaskId);
      if (response.success) {
        setEditSuccess(response.message || 'Designer task deleted successfully');
        setShowDeleteConfirm(false);
        setDeletingTaskId(null);
        fetchData();
      } else {
        setDeleteError(response.message || 'Failed to delete task');
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setDeleteError(msg || 'Unable to delete task. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getDesignerName = (designerId: string): string =>
    designers.find((d) => d.id === designerId)?.full_name ?? `Designer ${designerId}`;

  const unassignedCount = tasks.filter((t) => !t.assigned_to_user_id).length;
  const graceCount = tasks.filter(
    (t) => t.assigned_to_user_id && hoursSince(t.assigned_at) < GRACE_PERIOD_HOURS
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Designer Applications</h2>
          <p className="text-gray-600 mt-1">
            Review applications, assign designers to open tasks, and manage recent assignments.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <Users className="w-4 h-4" />
          CEO and General Manager only
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
          <p className="text-xs uppercase tracking-wide text-slate-500">Open Tasks</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{unassignedCount}</p>
        </div>
        <div className="rounded-xl bg-blue-50 px-3 py-3 text-center">
          <p className="text-xs uppercase tracking-wide text-blue-600">Editable</p>
          <p className="mt-1 text-lg font-semibold text-blue-700">{graceCount}</p>
        </div>
        <div className="rounded-xl bg-green-50 px-3 py-3 text-center">
          <p className="text-xs uppercase tracking-wide text-green-600">Designers</p>
          <p className="mt-1 text-lg font-semibold text-green-700">{designers.length}</p>
        </div>
      </div>

      {groupedApplications.length > 0 ? (
        <div className="space-y-4">
          {groupedApplications.map(({ task, applications: taskApplications }) => {
            const isAssigned = !!task.assigned_to_user_id;
            const isEditing = !!editingAssignment[task.id];
            const assignmentAge = hoursSince(task.assigned_at);
            const isInGracePeriod = isAssigned && assignmentAge < GRACE_PERIOD_HOURS;
            const isLocked = isAssigned && assignmentAge >= GRACE_PERIOD_HOURS;
            const assignedByCurrentUser = isAssigned && task.updated_by_user?.id === user?.id;
            const wasEdited =
              initiallyAssignedIds.current.has(task.id) || editedThisSession.current.has(task.id);

            const showAssignmentUI = !isAssigned || isEditing;
            const showAssignmentConfirmation = assignedByCurrentUser && !isEditing;
            const showGraceBox = isInGracePeriod && !isEditing && !assignedByCurrentUser;
            const showLockedBox = isLocked && !isEditing && !assignedByCurrentUser;

            const visibleApplications = taskApplications.filter(
              (app) => app.applicant_user_id !== task.assigned_to_user_id
            );

            const applicantIds = new Set(taskApplications.map((a) => a.applicant_user_id));
            const applicantOptions = taskApplications.map((app) => ({
              id: app.applicant_user_id,
              label: `${app.applicant_user?.full_name ?? 'Unknown'} (applied)`,
            }));
            const nonApplicantOptions = designers
              .filter((d) => !applicantIds.has(d.id))
              .map((d) => ({ id: d.id, label: `${d.full_name} (designer, did not apply)` }));
            const assignOptions = [...applicantOptions, ...nonApplicantOptions];

            return (
              <div
                key={task.id}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 space-y-4"
              >
                <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{task.title}</h3>
                    <p className="text-sm text-gray-500">{task.description}</p>
                    {isAssigned && (
                      <p className="text-sm font-medium text-blue-700 mt-2">
                        Assigned to: {task.assigned_to_user?.full_name || getDesignerName(task.assigned_to_user_id!)}
                      </p>
                    )}
                    {taskApplications.length === 0 && (
                      <button
                        type="button"
                        onClick={() => openEditTask(task)}
                        className="inline-flex items-center gap-1 mt-2 text-sm text-indigo-600 hover:underline"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit Task
                      </button>
                    )}
                    {canDeleteApplicationTask(task) && (
                      <button
                        type="button"
                        onClick={() => openDeleteConfirm(task.id)}
                        className="inline-flex items-center gap-1 mt-2 text-sm text-red-600 hover:underline"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Task
                      </button>
                    )}
                  </div>
                  <span
                    className={`shrink-0 px-2 py-1 rounded-full text-xs font-medium ${
                      isAssigned
                        ? assignedByCurrentUser || isLocked
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {isAssigned ? (assignedByCurrentUser || isLocked ? 'Assigned' : 'Grace Period') : 'Open'}
                  </span>
                </div>

                {visibleApplications.length > 0 && (
                  <div className="space-y-3">
                    {visibleApplications.map((application) => {
                      const isSelectedApp =
                        isAssigned && application.applicant_user_id === task.assigned_to_user_id;
                      return (
                        <div
                          key={application.id}
                          className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3 flex-col sm:flex-row">
                            <div>
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-500" />
                                <p className="font-medium text-gray-900">
                                  {application.applicant_user?.full_name ?? 'Unknown'}
                                </p>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Applied on {new Date(application.created_at).toLocaleString()}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 px-2 py-1 rounded-full text-xs font-medium ${getStatusTone(
                                isAssigned,
                                isSelectedApp
                              )}`}
                            >
                              {isSelectedApp ? 'assigned' : 'pending'}
                            </span>
                          </div>
                          {application.cover_note && (
                            <p className="text-sm text-gray-700 mt-3">{application.cover_note}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

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

                    {assignError && (
                      <p className="text-sm text-red-600">{assignError}</p>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleAssign(task.id)}
                        disabled={!selectedDesignerByTask[task.id] || assigningTaskId === task.id}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 text-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {assigningTaskId === task.id
                          ? 'Assigning...'
                          : isEditing
                          ? 'Update Assignment'
                          : 'Assign Selected Designer'}
                      </button>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => cancelEditing(task.id)}
                          disabled={assigningTaskId === task.id}
                          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ) : showAssignmentConfirmation ? (
                  <div className="rounded-lg border border-dashed border-green-300 bg-green-50 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        Assigned to: {task.assigned_to_user?.full_name || getDesignerName(task.assigned_to_user_id!)}
                      </span>
                    </div>
                    {wasEdited && task.updated_by_user && (
                      <p className="text-xs text-green-700">
                        Edited by: {task.updated_by_user.full_name}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => startEditing(task.id, task.assigned_to_user_id ?? undefined)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm"
                    >
                      Edit Assigned User
                    </button>
                  </div>
                ) : showGraceBox ? (
                  <div className="rounded-lg border border-dashed border-blue-300 bg-blue-50 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">
                        Assigned to: {task.assigned_to_user?.full_name || getDesignerName(task.assigned_to_user_id!)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEditing(task.id, task.assigned_to_user_id ?? undefined)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
                    >
                      Edit Assigned User
                    </button>
                    <p className="text-xs text-blue-600">
                      Within the 2-day editing window. Task updates are allowed while the assignment is less than 2 days old.
                    </p>
                  </div>
                ) : showLockedBox ? (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Lock className="w-5 h-5 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">
                        Assigned to: {task.assigned_to_user?.full_name || getDesignerName(task.assigned_to_user_id!)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      The 2-day editing window has expired. Task updates and reassignment are no longer allowed.
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No designer tasks found yet.</p>
        </div>
      )}

      {editSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 text-sm">{editSuccess}</div>
      )}

      {/* Edit Task Modal */}
      {showEditTask && editingTaskId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold">Edit Designer Task</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Update the task details below. Fields marked with <span className="text-red-500">*</span> are required.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { if (editImagePreview) URL.revokeObjectURL(editImagePreview); setShowEditTask(false); setEditingTaskId(null); setEditFormErrors({}); setEditError(''); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 shrink-0"
                disabled={isUpdating}
              >
                <XCircle className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleEditTask}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" value={editForm.title}
                  onChange={(event) => { setEditForm({ ...editForm, title: event.target.value }); if (editFormErrors.title) setEditFormErrors((prev) => { const n = { ...prev }; delete n.title; return n; }); }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${editFormErrors.title ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  disabled={isUpdating}
                />
                {editFormErrors.title && <p className="text-xs text-red-600 mt-1">{editFormErrors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4} value={editForm.description}
                  onChange={(event) => { setEditForm({ ...editForm, description: event.target.value }); if (editFormErrors.description) setEditFormErrors((prev) => { const n = { ...prev }; delete n.description; return n; }); }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${editFormErrors.description ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  disabled={isUpdating}
                />
                {editFormErrors.description && <p className="text-xs text-red-600 mt-1">{editFormErrors.description}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Story Points <span className="text-red-500">*</span>
                </label>
                <input
                  type="number" min="1" max="100" value={editForm.storyPoints}
                  onChange={(event) => { setEditForm({ ...editForm, storyPoints: event.target.value }); if (editFormErrors.storyPoints) setEditFormErrors((prev) => { const n = { ...prev }; delete n.storyPoints; return n; }); }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${editFormErrors.storyPoints ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  disabled={isUpdating}
                />
                {editFormErrors.storyPoints && <p className="text-xs text-red-600 mt-1">{editFormErrors.storyPoints}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign To (optional)</label>
                <select
                  value={editForm.assigned_to_user_id}
                  onChange={(event) => setEditForm({ ...editForm, assigned_to_user_id: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  disabled={isUpdating}
                >
                  <option value="">Open for application (unassigned)</option>
                  {designers.map((d) => (
                    <option key={d.id} value={d.id}>{d.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="app_edit_is_public"
                  checked={editForm.is_public}
                  onChange={(event) => setEditForm({ ...editForm, is_public: event.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={isUpdating}
                />
                <label htmlFor="app_edit_is_public" className="text-sm font-medium text-gray-700">
                  Public Task (visible to all designers)
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telegram Screenshot (optional)</label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-700">
                    <Image className="w-4 h-4" />Choose Image
                    <input
                      type="file" accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        if (editImagePreview) URL.revokeObjectURL(editImagePreview);
                        editImageFileRef.current = file;
                        setEditImagePreview(URL.createObjectURL(file));
                      }}
                      className="hidden" disabled={isUpdating}
                    />
                  </label>
                  {editImagePreview && (
                    <button type="button" onClick={() => { if (editImagePreview) URL.revokeObjectURL(editImagePreview); setEditImagePreview(null); editImageFileRef.current = null; }} className="text-sm text-red-600 hover:underline" disabled={isUpdating}>Remove</button>
                  )}
                </div>
                {editImagePreview && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-1">Preview:</p>
                    <img src={editImagePreview} alt="preview" className="max-w-full h-auto max-h-48 rounded-lg border object-contain" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instruction (optional)</label>
                <textarea
                  rows={4} value={editForm.instruction}
                  onChange={(event) => setEditForm({ ...editForm, instruction: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe what the designer must collect or measure" disabled={isUpdating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deadline (optional)</label>
                <input
                  type="date" value={editForm.deadline}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(event) => setEditForm({ ...editForm, deadline: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={isUpdating}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { if (editImagePreview) URL.revokeObjectURL(editImagePreview); setShowEditTask(false); setEditingTaskId(null); setEditFormErrors({}); setEditError(''); }} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors" disabled={isUpdating}>Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:bg-indigo-300" disabled={isUpdating}>
                  {isUpdating ? 'Updating...' : 'Update Task'}
                </button>
              </div>
              {editError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{editError}</p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && deletingTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Delete Task</h3>
              <button
                onClick={() => { if (!isDeleting) { setShowDeleteConfirm(false); setDeletingTaskId(null); setDeleteError(''); } }}
                className="p-2 rounded-lg hover:bg-gray-100"
                disabled={isDeleting}
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-gray-700">
                Are you sure you want to delete this task? This action cannot be undone.
              </p>
              {deleteError && (
                <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{deleteError}</p>
              )}
              <div className="flex justify-end gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => { setShowDeleteConfirm(false); setDeletingTaskId(null); setDeleteError(''); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteTask}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:bg-red-300"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DesignerApplications;
