import React, { useMemo, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Task, TaskStatus } from '../types';
import { Calendar, Plus, Image, X } from 'lucide-react';

interface RoleTaskBoardProps {
  title: string;
  description: string;
  storageKey: string;
  seedTasks: Task[];
  createButtonLabel?: string;
  emptyStateText?: string;
  hideStatus?: boolean;
  hideInstruction?: boolean;
  showStoryPoints?: boolean;
}

interface TaskFormState {
  title: string;
  description: string;
  instruction: string;
  deadline: string;
  status: TaskStatus;
  storyPoints: number;
  telegramScreenshot: string;
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
  showStoryPoints = false,
}: RoleTaskBoardProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks(storageKey, seedTasks));
  const [showEditor, setShowEditor] = useState(false);
  const [form, setForm] = useState<TaskFormState>(emptyForm);
  const [imageViewerSrc, setImageViewerSrc] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState<number>(1);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

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
    setForm(emptyForm);
    setScreenshotPreview(null);
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setForm(emptyForm);
    setScreenshotPreview(null);
  };

  const saveTask = (event: React.FormEvent) => {
    event.preventDefault();

    if (!canManage) {
      closeEditor();
      return;
    }

    const nextTask: Task = {
      projectId: storageKey,
      title: form.title.trim(),
      description: form.description.trim(),
      instruction: hideInstruction ? '' : form.instruction.trim(),
      assignedBy: user.id,
      status: form.status,
      deadline: form.deadline || undefined,
      createdAt: new Date().toISOString(),
      ...(showStoryPoints ? { storyPoints: form.storyPoints } : {}),
      telegramScreenshot: form.telegramScreenshot,
    } as Task & { storyPoints?: number; telegramScreenshot?: string };

    persistTasks([nextTask, ...tasks]);
    closeEditor();
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
            <div
              key={task.id}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 h-80 flex flex-col"
            >
              {/* Card header – stays fixed */}
              <div className="flex items-start justify-between gap-3 flex-col sm:flex-row">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">{task.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">ID: {task.id}</p>

                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {showStoryPoints && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                        {extra.storyPoints ?? 0} Story Pts
                      </span>
                    )}
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

              {/* Scrollable content area – fills remaining space and scrolls if needed */}
              <div className="flex-1 overflow-y-auto min-h-0 mt-3">
                <p className="text-gray-700">{task.description}</p>

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

                {!hideInstruction && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Instruction</p>
                    <p className="text-sm text-gray-700 mt-1">{task.instruction}</p>
                  </div>
                )}
              </div>

              {/* Card footer – stays fixed */}
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}</span>
                </div>
                <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
              </div>
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
            <h3 className="text-xl font-semibold mb-4">Create Item</h3>
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
              {showStoryPoints && (
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
              )}
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
    </div>
  );
}