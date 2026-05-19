import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Task, TaskStatus } from '../types';
import { Calendar, Edit, Plus, Trash2, Image, X } from 'lucide-react';

interface RoleTaskBoardProps {
  title: string;
  description: string;
  storageKey: string;
  seedTasks: Task[];
  createButtonLabel?: string;
  emptyStateText?: string;
  hideStatus?: boolean;
  hideInstruction?: boolean;
}

interface TaskFormState {
  title: string;
  description: string;
  instruction: string;
  deadline: string;
  status: TaskStatus;
  storyPoints: number;
  telegramScreenshot: string; // data URL of uploaded image
}

const emptyForm: TaskFormState = {
  title: '',
  description: '',
  instruction: '',
  deadline: '',
  status: 'pending',
  storyPoints: 0,
  telegramScreenshot: '',
};

function loadTasks(storageKey: string, seedTasks: Task[]): Task[] {
  const savedTasks = localStorage.getItem(storageKey);
  if (!savedTasks) {
    localStorage.setItem(storageKey, JSON.stringify(seedTasks));
    return seedTasks;
  }

  const parsedTasks = JSON.parse(savedTasks) as Task[];
  const mergedTasks = [
    ...parsedTasks.map((task) => {
      const seedTask = seedTasks.find((candidate) => candidate.id === task.id);
      return seedTask ? { ...seedTask, ...task } : task;
    }),
    ...seedTasks.filter((seedTask) => !parsedTasks.some((task) => task.id === seedTask.id)),
  ];

  localStorage.setItem(storageKey, JSON.stringify(mergedTasks));
  return mergedTasks;
}

export function RoleTaskBoard({
  title,
  description,
  storageKey,
  seedTasks,
  createButtonLabel = 'Create Task',
  emptyStateText = 'No tasks found yet.',
  hideStatus = false,
  hideInstruction = false,
}: RoleTaskBoardProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks(storageKey, seedTasks));
  const [showEditor, setShowEditor] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskFormState>(emptyForm);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [imageViewerSrc, setImageViewerSrc] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState<number>(1);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackEditorHtml, setFeedbackEditorHtml] = useState<string>('');
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null); // local preview before save

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!user) {
    return null;
  }

  const canManage = user.role === 'ceo' || user.role === 'general_manager' || user.role === 'system_administrator';

  const summary = useMemo(() => {
    return {
      total: tasks.length,
      pending: tasks.filter((task) => task.status === 'pending').length,
      inProgress: tasks.filter((task) => task.status === 'in_progress').length,
      completed: tasks.filter((task) => task.status === 'completed').length,
    };
  }, [tasks]);

  const persistTasks = (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
    localStorage.setItem(storageKey, JSON.stringify(updatedTasks));
  };

  function pushNotification(notification: { id: string; toUserId?: string; message: string; createdAt: string }) {
    try {
      const key = 'role-notifications';
      const saved = localStorage.getItem(key);
      const list = saved ? JSON.parse(saved) : [];
      list.unshift(notification);
      localStorage.setItem(key, JSON.stringify(list));
    } catch (err) {
      // ignore
    }
  }

  function handleApprove(task: Task) {
    if (!canManage || !user) return;
    const updated = tasks.map((t) => {
      if (t.id !== task.id) return t;
      return {
        ...t,
        approvalStatus: 'approved' as const,
        approvedBy: user.id,
        approvedAt: new Date().toISOString(),
        status: 'completed' as TaskStatus,
      };
    });

    persistTasks(updated);
    setToast('Task approved successfully');
    setShowDetail(false);
    setSelectedTask(null);

    const recipient = task.assignedTo;
    pushNotification({
      id: `notify-${Date.now()}`,
      toUserId: recipient,
      message: `Your submission for task ${task.title} was approved.`,
      createdAt: new Date().toISOString(),
    });
  }

  function saveFeedback() {
    if (!canManage || !selectedTask || !user) return;

    const body = feedbackEditorHtml.trim();
    if (!body) {
      setToast('Please enter feedback before saving');
      return;
    }

    const existing = tasks.find((t) => t.id === selectedTask.id);
    if (!existing) return;

    const prevVersions = existing.feedbacks || [];
    const version = (prevVersions.length > 0 ? Math.max(...prevVersions.map((v) => v.version)) : 0) + 1;

    const fb = {
      id: `fb-${Date.now()}`,
      senderId: user.id,
      senderName: user.name,
      sentAt: new Date().toISOString(),
      body,
      version,
    };

    const updated = tasks.map((t) => {
      if (t.id !== existing.id) return t;
      return {
        ...t,
        feedbacks: [...(t.feedbacks || []), fb],
        status: 'in_progress' as TaskStatus,
      };
    });

    persistTasks(updated);
    setToast('Feedback saved');
    setShowFeedbackModal(false);
    setFeedbackEditorHtml('');

    pushNotification({
      id: `notify-${Date.now()}`,
      toUserId: existing.assignedTo,
      message: `Feedback provided for task ${existing.title}.`,
      createdAt: new Date().toISOString(),
    });
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setForm((c) => ({ ...c, telegramScreenshot: dataUrl }));
      setScreenshotPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const openCreate = () => {
    setEditingTaskId(null);
    setForm(emptyForm);
    setScreenshotPreview(null);
    setShowEditor(true);
  };

  const openEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setForm({
      title: task.title,
      description: task.description,
      instruction: task.instruction || '',
      deadline: task.deadline || '',
      status: task.status,
      storyPoints: (task as any).storyPoints ?? 0,
      telegramScreenshot: (task as any).telegramScreenshot || '',
    });
    setScreenshotPreview((task as any).telegramScreenshot || null);
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setEditingTaskId(null);
    setForm(emptyForm);
    setScreenshotPreview(null);
  };

  const saveTask = (event: React.FormEvent) => {
    event.preventDefault();

    if (!canManage) {
      closeEditor();
      return;
    }

    if (editingTaskId) {
      persistTasks(
        tasks.map((task) =>
          task.id === editingTaskId
            ? {
                ...task,
                title: form.title.trim(),
                description: form.description.trim(),
                instruction: hideInstruction ? '' : form.instruction.trim(),
                deadline: form.deadline || undefined,
                status: form.status,
                storyPoints: form.storyPoints,
                telegramScreenshot: form.telegramScreenshot,
              }
            : task,
        ),
      );
    } else {
      const nextTask: Task = {
        id: `${storageKey}-${Date.now()}`,
        projectId: storageKey,
        title: form.title.trim(),
        description: form.description.trim(),
        instruction: hideInstruction ? '' : form.instruction.trim(),
        assignedBy: user.id,
        status: form.status,
        deadline: form.deadline || undefined,
        createdAt: new Date().toISOString(),
        // Extra fields stored directly on the object (still compatible with Task)
        storyPoints: form.storyPoints,
        telegramScreenshot: form.telegramScreenshot,
      } as Task & { storyPoints?: number; telegramScreenshot?: string };

      persistTasks([nextTask, ...tasks]);
    }

    closeEditor();
  };

  const deleteTask = (taskId: string) => {
    if (!canManage) return;
    const shouldDelete = window.confirm('Delete this item?');
    if (!shouldDelete) return;
    persistTasks(tasks.filter((task) => task.id !== taskId));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-gray-600 mt-1">{description}</p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>{createButtonLabel}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: summary.total },
          { label: 'Pending', value: summary.pending },
          { label: 'In Progress', value: summary.inProgress },
          { label: 'Completed', value: summary.completed },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {tasks.map((task) => {
          const extra = task as Task & { storyPoints?: number; telegramScreenshot?: string };
          return (
            <div key={task.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <div className="flex items-start justify-between gap-3 flex-col sm:flex-row">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">{task.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">ID: {task.id}</p>

                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                      {extra.storyPoints ?? 0} Story Pts
                    </span>
                    {task.feedbacks && task.feedbacks.length > 0 && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Feedback Provided
                      </span>
                    )}
                    {task.approvalStatus === 'approved' && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Approved
                      </span>
                    )}
                    {task.approvalStatus === 'rejected' && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Rejected
                      </span>
                    )}
                  </div>
                </div>
                {!hideStatus && (
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      task.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : task.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-700'
                          : task.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {task.status.replace('_', ' ')}
                  </span>
                )}
              </div>

              <p className="text-gray-700 mt-4">{task.description}</p>

              <div className="mt-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Telegram Evidence</p>
                {extra.telegramScreenshot ? (
                  <img
                    src={extra.telegramScreenshot}
                    alt="Telegram evidence"
                    className="mt-2 w-full max-h-32 object-cover rounded-lg border cursor-pointer"
                    onClick={() => setImageViewerSrc(extra.telegramScreenshot!)}
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-500">No Telegram evidence attached.</p>
                )}
              </div>

              <div className="mt-4">
                <button
                  onClick={() => { setSelectedTask(task); setShowDetail(true); }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Open Submission Detail
                </button>
              </div>

              {!hideInstruction && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Instruction</p>
                  <p className="text-sm text-gray-700 mt-1">{task.instruction}</p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}</span>
                </div>
                <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
              </div>

              {canManage && (
                <div className="mt-5 flex items-center gap-2">
                  <button
                    onClick={() => openEdit(task)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {tasks.length === 0 && (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">{emptyStateText}</p>
        </div>
      )}

      {showEditor && canManage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">{editingTaskId ? 'Edit Item' : 'Create Item'}</h3>
            <form className="space-y-4" onSubmit={saveTask}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px]"
                  required
                />
              </div>
              {!hideInstruction && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Instruction</label>
                  <textarea
                    value={form.instruction}
                    onChange={(e) => setForm((c) => ({ ...c, instruction: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px]"
                    required
                  />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Deadline</label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm((c) => ({ ...c, deadline: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {!hideStatus && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm((c) => ({ ...c, status: e.target.value as TaskStatus }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="pending">pending</option>
                      <option value="in_progress">in progress</option>
                      <option value="completed">completed</option>
                      <option value="incomplete">incomplete</option>
                      <option value="rejected">rejected</option>
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Story Points</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.storyPoints}
                  onChange={(e) => setForm((c) => ({ ...c, storyPoints: parseInt(e.target.value, 10) || 0 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Telegram Screenshot (Evidence)</label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-700">
                    <Image className="w-4 h-4" />
                    Choose Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                  {screenshotPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setForm((c) => ({ ...c, telegramScreenshot: '' }));
                        setScreenshotPreview(null);
                      }}
                      className="text-sm text-red-600 hover:underline flex items-center gap-1"
                    >
                      <X className="w-4 h-4" /> Remove
                    </button>
                  )}
                </div>
                {screenshotPreview && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-1">Preview:</p>
                    <img
                      src={screenshotPreview}
                      alt="Telegram screenshot preview"
                      className="max-w-full h-auto max-h-48 rounded-lg border object-contain"
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeEditor}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail modal for reviewers */}
      {showDetail && selectedTask && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center p-6 z-50 overflow-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold">{selectedTask.title}</h3>
                <p className="text-sm text-gray-500">ID: {selectedTask.id}</p>
                <div className="mt-1">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                    {((selectedTask as any).storyPoints ?? 0)} Story Points
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setShowDetail(false); setSelectedTask(null); }} className="px-3 py-2 rounded-lg border">
                  Close
                </button>
              </div>
            </div>

            <section className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <h4 className="text-sm font-medium text-gray-600">Task Statement</h4>
                <p className="mt-2 text-gray-800">{selectedTask.description}</p>

                {!hideInstruction && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                    <h5 className="text-sm font-medium text-gray-600">Instruction</h5>
                    <p className="mt-1 text-gray-700">{selectedTask.instruction}</p>
                  </div>
                )}

                <div className="mt-6">
                  <h5 className="text-sm font-medium text-gray-600">Telegram Screenshot (Evidence)</h5>
                  {(selectedTask as any).telegramScreenshot ? (
                    <div className="mt-2">
                      <img
                        src={(selectedTask as any).telegramScreenshot}
                        alt="Telegram evidence"
                        className="w-full max-h-64 object-contain rounded-lg border cursor-pointer"
                        onClick={() => setImageViewerSrc((selectedTask as any).telegramScreenshot)}
                      />
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">No Telegram evidence attached.</p>
                  )}
                </div>

                <div className="mt-6">
                  <h5 className="text-sm font-medium text-gray-600">Submission Notes from the Data Collector</h5>
                  {selectedTask.submissions && selectedTask.submissions.length > 0 ? (
                    selectedTask.submissions.slice().reverse().map((s) => (
                      <div key={s.id} className="mt-3 p-3 border rounded-lg bg-white">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600">{s.submittedByName || s.submittedBy}</div>
                          <div className="text-xs text-gray-400">{new Date(s.submittedAt).toLocaleString()}</div>
                        </div>
                        <div className="mt-2 text-gray-700">{s.notes}</div>
                        {s.attachments && s.attachments.length > 0 && (
                          <div>
                            <h6 className="text-xs text-gray-500 mt-3">Uploaded Evidence (Telegram preview)</h6>
                            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {s.attachments.map((att, idx) => (
                                <img
                                  key={idx}
                                  src={att}
                                  alt={`evidence-${idx}`}
                                  className="w-full h-28 object-cover rounded-md cursor-pointer border"
                                  onClick={() => { setImageViewerSrc(att); setImageZoom(1); }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="mt-2 text-gray-500">No submissions yet.</p>
                  )}
                </div>

                <div className="mt-6">
                  <h5 className="text-sm font-medium text-gray-600">Feedback History</h5>
                  {selectedTask.feedbacks && selectedTask.feedbacks.length > 0 ? (
                    selectedTask.feedbacks.slice().reverse().map((f) => (
                      <div key={f.id} className="mt-3 p-3 border rounded-lg bg-white">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600">{f.senderName || f.senderId} — v{f.version}</div>
                          <div className="text-xs text-gray-400">{new Date(f.sentAt).toLocaleString()}</div>
                        </div>
                        <div className="mt-2 text-gray-700" dangerouslySetInnerHTML={{ __html: f.body }} />
                        {canManage && (
                          <div className="mt-2">
                            <button
                              onClick={() => {
                                setEditingFeedbackId(f.id);
                                setFeedbackEditorHtml(f.body);
                                setShowFeedbackModal(true);
                              }}
                              className="text-sm text-blue-600 hover:underline"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="mt-2 text-gray-500">No feedback provided yet.</p>
                  )}
                </div>
              </div>

              <aside className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <h5 className="text-sm font-medium text-gray-600">Submission Metadata</h5>
                  <div className="mt-2 text-sm text-gray-700">
                    <div>Submitted: {selectedTask.submissions && selectedTask.submissions.length > 0 ? new Date(selectedTask.submissions[selectedTask.submissions.length - 1].submittedAt).toLocaleString() : '—'}</div>
                    <div>Submitted By: {selectedTask.submissions && selectedTask.submissions.length > 0 ? (selectedTask.submissions[selectedTask.submissions.length - 1].submittedByName || selectedTask.submissions[selectedTask.submissions.length - 1].submittedBy) : '—'}</div>
                    {!hideStatus && (
                      <div className="mt-2">Status: {selectedTask.approvalStatus ? selectedTask.approvalStatus : selectedTask.status}</div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-white rounded-lg border shadow-sm">
                  <h5 className="text-sm font-medium text-gray-600">Actions</h5>
                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      onClick={() => handleApprove(selectedTask)}
                      className="w-full px-3 py-2 bg-green-600 text-white rounded-lg"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => { setEditingFeedbackId(null); setFeedbackEditorHtml(''); setShowFeedbackModal(true); }}
                      className="w-full px-3 py-2 border rounded-lg text-gray-700"
                    >
                      Provide Feedback
                    </button>
                  </div>
                </div>
              </aside>
            </section>
          </div>
        </div>
      )}

      {/* Image viewer / fullscreen modal */}
      {imageViewerSrc && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-[95vw] max-h-[95vh]">
            <img
              ref={imageRef}
              src={imageViewerSrc}
              alt="evidence"
              style={{ transform: `scale(${imageZoom})` }}
              className="max-w-full max-h-[90vh] object-contain rounded transition-transform"
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                onClick={() => {
                  if (imageRef.current && imageRef.current.requestFullscreen) {
                    imageRef.current.requestFullscreen();
                  } else {
                    document.documentElement.requestFullscreen?.();
                  }
                }}
                className="px-3 py-2 bg-white/80 rounded"
              >
                Fullscreen
              </button>
              <button onClick={() => setImageViewerSrc(null)} className="px-3 py-2 bg-white/80 rounded">
                Close
              </button>
            </div>
            <div className="absolute left-2 bottom-2 flex items-center gap-2 bg-white/90 rounded p-2">
              <button
                onClick={() => setImageZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                className="px-2 py-1 border rounded"
              >
                -
              </button>
              <div className="text-sm px-2">{Math.round(imageZoom * 100)}%</div>
              <button
                onClick={() => setImageZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
                className="px-2 py-1 border rounded"
              >
                +
              </button>
              <button onClick={() => setImageZoom(1)} className="px-2 py-1 border rounded">
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback modal */}
      {showFeedbackModal && selectedTask && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-60">
          <div className="bg-white rounded-xl p-6 w-full max-w-3xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold">Provide Feedback</h4>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowFeedbackModal(false)} className="px-3 py-2 rounded border">
                  Cancel
                </button>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex gap-2">
                <button onClick={() => document.execCommand('bold')} className="px-2 py-1 border rounded">
                  B
                </button>
                <button onClick={() => document.execCommand('italic')} className="px-2 py-1 border rounded">
                  I
                </button>
                <button onClick={() => document.execCommand('underline')} className="px-2 py-1 border rounded">
                  U
                </button>
                <button
                  onClick={() => {
                    const url = prompt('Link URL');
                    if (url) document.execCommand('createLink', false, url);
                  }}
                  className="px-2 py-1 border rounded"
                >
                  Link
                </button>
              </div>
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => setFeedbackEditorHtml((e.target as HTMLDivElement).innerHTML)}
                className="mt-3 min-h-[160px] border p-3 rounded"
                dangerouslySetInnerHTML={{ __html: feedbackEditorHtml }}
              />
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setShowFeedbackModal(false)} className="px-4 py-2 border rounded">
                Close
              </button>
              <button onClick={() => saveFeedback()} className="px-4 py-2 bg-blue-600 text-white rounded">
                Save Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-black text-white px-4 py-2 rounded shadow">{toast}</div>
      )}
    </div>
  );
}