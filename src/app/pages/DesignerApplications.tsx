import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle2, User, Users, Loader2, AlertCircle } from 'lucide-react';
import designerApi, { DesignerTaskItem, DesignerApplicationItem } from '../../api/designerApi';
import userApi, { UserItem } from '../../api/userApi';

const reviewRoles = new Set(['ceo', 'general_manager']);

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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [tasksRes, usersRes] = await Promise.all([
        designerApi.getDesignerTasks({ isPublic: true, assignedTo: '__unassigned__', limit: 100 }),
        userApi.getDesigners(),
      ]);

      const fetchedTasks = tasksRes.data;
      setTasks(fetchedTasks);
      setDesigners(usersRes.data);

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

  if (!user) return null;

  if (!reviewRoles.has(user.role)) {
    return (
      <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">Access denied. CEO or General Manager only.</p>
      </div>
    );
  }

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

  const handleAssign = async (taskId: string) => {
    const selectedDesignerId = selectedDesignerByTask[taskId];
    if (!selectedDesignerId) return;

    setAssigningTaskId(taskId);
    setAssignError(null);

    try {
      const response = await designerApi.assignDesigner(taskId, selectedDesignerId);

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
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setAssignError('Task is already assigned to a designer.');
      } else {
        setAssignError(err?.response?.data?.message || err?.message || 'Failed to assign designer');
      }
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

  const groupedApplications = tasks.map((task) => ({
    task,
    applications: applicationsByTask[task.id] || [],
  }));

  const getDesignerName = (designerId: string): string =>
    designers.find((d) => d.id === designerId)?.full_name ?? `Designer ${designerId}`;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Designer Applications</h2>
          <p className="text-gray-600 mt-1">
            Review applications for each task, then assign a designer.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <Users className="w-4 h-4" />
          CEO and General Manager only
        </div>
      </div>

      {groupedApplications.length > 0 ? (
        <div className="space-y-4">
          {groupedApplications.map(({ task, applications: taskApplications }) => {
            const isAssigned = !!task.assigned_to_user_id;
            const isEditing = !!editingAssignment[task.id];
            const showAssignmentUI = !isAssigned || isEditing;

            // Exclude assigned designer from applicants list
            const visibleApplications = taskApplications.filter(
              (app) => app.applicant_user_id !== task.assigned_to_user_id
            );

            const applicantIds = new Set(taskApplications.map((a) => a.applicant_user_id));
            const applicantOptions = taskApplications.map((app) => ({
              id: app.applicant_user_id,
              label: `${app.applicant_user.full_name} (applied)`,
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
                                  {application.applicant_user.full_name}
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
                ) : (
                  <div className="rounded-lg border border-dashed border-green-300 bg-green-50 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        Assigned to: {task.assigned_to_user?.full_name || getDesignerName(task.assigned_to_user_id!)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEditing(task.id, task.assigned_to_user_id ?? undefined)}
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
