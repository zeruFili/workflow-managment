import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Task } from '../types';
import { Badge } from '../components/ui/badge';
import { Calendar, Plus, Image, X, Send } from 'lucide-react';

const STORAGE_KEY = 'data-collector-tasks-v2';

// In-memory "viewed" set – survives route changes but resets on page refresh (demo behavior)
const viewedDataCollectorCards = new Set<string>();

// First 3 tasks are always "new" until the user scrolls them into view AND navigates away
const HIGHLIGHTED_IDS = ['dc-task-1', 'dc-task-2', 'dc-task-3'];

const seedTasks: Task[] = [
  {
    id: 'dc-task-1',
    projectId: 'data-collection',
    title: 'Collect site measurements',
    description: 'Measure the assigned site and record room dimensions.',
    instruction: 'Capture wall lengths, ceiling heights, and access points before end of day.',
    assignedBy: '2',
    status: 'in_progress',
    submissions: [
      {
        id: 'sub-1',
        submittedBy: '7',
        submittedByName: 'Robert Taylor',
        submittedAt: '2026-05-18T12:10:00Z',
        notes: 'Captured the telegram preview and measurement notes. See images.',
        attachments: ['https://placehold.co/800x480/0f172a/f8fafc?text=Telegram+Preview'],
        metadata: { telegramHandle: '@site_updates' },
      },
    ],
    deadline: '2026-05-25T23:59:59Z',
    createdAt: '2026-05-18T08:00:00Z',
  },
  {
    id: 'dc-task-2',
    projectId: 'data-collection',
    title: 'Update customer survey sheet',
    description: 'Verify field entries and correct any missing contact details.',
    instruction: 'Cross-check the phone numbers and addresses with the latest client notes.',
    assignedBy: '1',
    status: 'in_progress',
    submissions: [
      {
        id: 'sub-2',
        submittedBy: '4',
        submittedByName: 'Michael Brown',
        submittedAt: '2026-05-18T15:42:00Z',
        notes: 'Fixed missing phone numbers and attached Telegram preview for confirmation.',
        attachments: ['https://placehold.co/800x480/1e293b/e2e8f0?text=Telegram+Destination+Preview'],
        metadata: { telegramChannel: '@customer_updates', location: 'Site A' },
      },
    ],
    deadline: '2026-05-22T23:59:59Z',
    createdAt: '2026-05-17T10:00:00Z',
    approvalStatus: 'approved',
  },
  {
    id: 'dc-task-3',
    projectId: 'data-collection',
    title: 'Photograph property exterior',
    description: 'Take clear, well-lit photos of the front, back, and side elevations.',
    instruction: 'Ensure property number is visible; capture any visible damage or unique features.',
    assignedBy: '2',
    status: 'completed',
    submissions: [
      {
        id: 'sub-3',
        submittedBy: '7',
        submittedByName: 'Robert Taylor',
        submittedAt: '2026-05-17T09:30:00Z',
        notes: 'Photos uploaded via Telegram, all angles covered.',
        attachments: ['https://placehold.co/800x480/334155/f8fafc?text=Exterior+Photo+Front'],
        metadata: { telegramHandle: '@site_updates', location: '123 Main St' },
      },
    ],
    deadline: '2026-05-20T23:59:59Z',
    createdAt: '2026-05-15T08:00:00Z',
    approvalStatus: 'approved',
    feedbacks: [
      {
        id: 'fb-1',
        text: 'Excellent coverage, please also capture the rear garden next time.',
        createdAt: '2026-05-18T10:00:00Z',
        createdBy: '1',
        createdByName: 'Alice Johnson',
      },
    ],
  },
  {
    id: 'dc-task-4',
    projectId: 'data-collection',
    title: 'Record utility meter readings',
    description: 'Photograph and log gas, electricity, and water meter readings for the property.',
    instruction: 'Make sure the meter serial number and current reading are clearly visible.',
    assignedBy: '1',
    status: 'pending',
    submissions: [],
    deadline: '2026-05-27T23:59:59Z',
    createdAt: '2026-05-19T08:00:00Z',
  },
  {
    id: 'dc-task-5',
    projectId: 'data-collection',
    title: 'Verify client contact information',
    description: 'Call or visit the client to confirm phone numbers, email, and postal address.',
    instruction: 'Update the CRM with any changes and attach a screenshot of the verification message.',
    assignedBy: '2',
    status: 'in_progress',
    submissions: [
      {
        id: 'sub-5',
        submittedBy: '8',
        submittedByName: 'Emily Davis',
        submittedAt: '2026-05-18T16:00:00Z',
        notes: 'Spoke with the client; updated phone number and verified email. Screenshot attached.',
        attachments: ['https://placehold.co/800x480/475569/e2e8f0?text=Verification+Confirmation'],
        metadata: { telegramChannel: '@client_verification' },
      },
    ],
    deadline: '2026-05-23T23:59:59Z',
    createdAt: '2026-05-16T10:00:00Z',
    feedbacks: [
      {
        id: 'fb-2',
        text: 'Looks good, but please double-check the postal code.',
        createdAt: '2026-05-19T09:00:00Z',
        createdBy: '1',
        createdByName: 'Alice Johnson',
      },
    ],
  },
];

// ─── In‑memory notification helper ─────────────────────────────────────────

function publishBadgeCount(count: number) {
  window.dispatchEvent(
    new CustomEvent('data-collector-notifications-updated', { detail: count })
  );
}

export function getUnseenDataCollectorHighlightedIds() {
  return new Set(
    HIGHLIGHTED_IDS.filter((id) => !viewedDataCollectorCards.has(id))
  );
}

export function getUnseenDataCollectorCount() {
  return getUnseenDataCollectorHighlightedIds().size;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DataCollectorTasks() {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedTasks));
      return seedTasks;
    }
    const parsed = JSON.parse(saved) as Task[];
    const merged = [
      ...parsed.map((t) => {
        const seed = seedTasks.find((s) => s.id === t.id);
        return seed ? { ...seed, ...t } : t;
      }),
      ...seedTasks.filter((s) => !parsed.some((t) => t.id === s.id)),
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  });

  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  
  // Track which highlighted cards have been scrolled into view this session
  const seenThisSession = useRef<Set<string>>(new Set());
  
  // Track which elements are currently being observed to avoid duplicates
  const observedElements = useRef<Set<string>>(new Set());
  
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Ref always mirrors highlightedIds so the unmount cleanup never reads stale state
  const highlightedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    highlightedIdsRef.current = highlightedIds;
  }, [highlightedIds]);

  // ── On mount: determine which tasks are still unseen ──────────────────────
  useEffect(() => {
    const unseen = new Set(
      HIGHLIGHTED_IDS.filter((id) => !viewedDataCollectorCards.has(id))
    );
    setHighlightedIds(unseen);
    publishBadgeCount(unseen.size);
  }, []);

  // ── IntersectionObserver: track which highlighted tasks have been scrolled into view ──
  useEffect(() => {
    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observedElements.current.clear();
    }

    // Nothing to observe
    if (highlightedIds.size === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = (entry.target as HTMLElement).dataset.highlightedId;
          if (!id || !highlightedIds.has(id)) return;

          // Only process if >=70% visible and not already recorded
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

    // Observe only currently highlighted elements
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

  // ── On unmount: mark all seen tasks as viewed and update badge ────────────
  useEffect(() => {
    return () => {
      const idsSeen = Array.from(seenThisSession.current);
      if (idsSeen.length > 0) {
        // Persist to in-memory set (resets on refresh = demo behavior)
        idsSeen.forEach((id) => viewedDataCollectorCards.add(id));
        
        // Calculate remaining unseen highlighted IDs
        const remaining = new Set(
          HIGHLIGHTED_IDS.filter((id) => !viewedDataCollectorCards.has(id))
        );
        
        // Update badge count for next visit
        publishBadgeCount(remaining.size);
        
        // Optional: update local state if component is still mounted
        setHighlightedIds(remaining);
      }
    };
  }, []); // empty deps — runs only on unmount

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  const [imageViewerSrc, setImageViewerSrc] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageZoom, setImageZoom] = useState(1);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    instruction: '',
    deadline: '',
    status: 'pending' as Task['status'],
  });
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  if (!user) return null;

  const canManage =
    user.role === 'ceo' ||
    user.role === 'general_manager';

  const summary = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
  };

  const persistTasks = (updated: Task[]) => {
    setTasks(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const openDetail = (task: Task) => {
    setSelectedTask(task);
    setShowDetail(true);
  };

  const closeDetail = () => {
    setSelectedTask(null);
    setShowDetail(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setScreenshotPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    const nextTask: Task = {
      id: `dc-task-${Date.now()}`,
      projectId: 'data-collection',
      title: newTaskForm.title.trim(),
      description: newTaskForm.description.trim(),
      instruction: newTaskForm.instruction.trim(),
      assignedBy: user.id,
      status: newTaskForm.status,
      deadline: newTaskForm.deadline || undefined,
      createdAt: new Date().toISOString(),
      telegramScreenshot: screenshotPreview || '',
      submissions: [],
      feedbacks: [],
    };

    persistTasks([nextTask, ...tasks]);
    setNewTaskForm({ title: '', description: '', instruction: '', deadline: '', status: 'pending' });
    setScreenshotPreview(null);
    setShowCreateModal(false);
  };

  const handleApprove = (task: Task) => {
    if (!canManage) return;
    const updated = tasks.map((t) =>
      t.id === task.id
        ? { ...t, approvalStatus: 'approved', updatedAt: new Date().toISOString() }
        : t
    );
    persistTasks(updated);
    closeDetail();
  };

  const handleProvideFeedback = () => {
    if (!canManage || !selectedTask) return;
    if (!feedbackText.trim()) return;

    const feedback = {
      id: `fb-${Date.now()}`,
      text: feedbackText.trim(),
      createdAt: new Date().toISOString(),
      createdBy: user.id,
      createdByName: user.name,
    };

    const updated = tasks.map((t) =>
      t.id === selectedTask.id
        ? { ...t, feedbacks: [...(t.feedbacks || []), feedback], updatedAt: new Date().toISOString() }
        : t
    );
    persistTasks(updated);
    setFeedbackText('');
    setShowFeedbackModal(false);
    closeDetail();
  };

  // Sort tasks so highlighted ones always appear at the top, with stable secondary sort
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aHL = highlightedIds.has(a.id) ? 1 : 0;
      const bHL = highlightedIds.has(b.id) ? 1 : 0;
      if (bHL !== aHL) return bHL - aHL; // highlighted first
      // Stable secondary sort by createdAt descending
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [tasks, highlightedIds]);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Data Collector Assignment Desk</h2>
          <p className="mt-1 text-sm text-slate-600">
            Create and manage field data collection tasks with screenshot evidence and review submissions.
          </p>
          {highlightedIds.size > 0 && (
            <p className="mt-2 text-sm text-blue-600 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-semibold">
                {highlightedIds.size}
              </span>
              new {highlightedIds.size === 1 ? 'task' : 'tasks'} since your last visit
            </p>
          )}
        </div>
        {canManage && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create Data Task
          </button>
        )}
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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

      {/* ── Task list (sorted) ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Data collection queue</h3>
        <p className="mt-1 text-sm text-slate-600">Latest field tasks with submissions and status.</p>

        <div className="mt-4 space-y-3">
          {sortedTasks.map((task) => {
            const isHighlighted = highlightedIds.has(task.id);
            return (
              <div
                key={task.id}
                data-highlighted-id={isHighlighted ? task.id : undefined}
                className={[
                  'rounded-xl p-4 transition-all duration-300',
                  isHighlighted
                    ? 'border-2 border-blue-400 ring-4 ring-blue-100 bg-white shadow-blue-100 shadow-sm'
                    : 'border border-slate-200',
                ].join(' ')}
              >
                {/* "New" pill */}
                {isHighlighted && (
                  <div className="mb-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      New
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{task.title}</p>
                    <p className="text-sm text-slate-500">ID: {task.id}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      className={
                        task.status === 'completed'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : task.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-700 border-blue-200'
                          : 'bg-amber-100 text-amber-700 border-amber-200'
                      }
                    >
                      {task.status.replace('_', ' ')}
                    </Badge>
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

                <p className="mt-2 text-sm text-slate-600">{task.description}</p>

                <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {task.deadline
                        ? new Date(task.deadline).toLocaleDateString()
                        : 'No deadline'}
                    </span>
                  </div>
                  <button
                    onClick={() => openDetail(task)}
                    className="text-blue-600 hover:underline text-sm font-medium"
                  >
                    Open Submission Detail
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Create task modal ── */}
      {showCreateModal && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Create Data Collection Task</h3>
                <p className="text-sm text-gray-500 mt-0.5">Fill in the task details and attach evidence.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="px-6 py-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Title</label>
                <input
                  required
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  required
                  rows={3}
                  value={newTaskForm.description}
                  onChange={(e) => setNewTaskForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Instruction</label>
                <textarea
                  required
                  rows={3}
                  value={newTaskForm.instruction}
                  onChange={(e) => setNewTaskForm((f) => ({ ...f, instruction: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Deadline</label>
                  <input
                    type="date"
                    value={newTaskForm.deadline}
                    onChange={(e) => setNewTaskForm((f) => ({ ...f, deadline: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
                  <select
                    value={newTaskForm.status}
                    onChange={(e) =>
                      setNewTaskForm((f) => ({ ...f, status: e.target.value as Task['status'] }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Telegram Screenshot (Evidence)
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm">
                    <Image className="w-4 h-4" />
                    Choose Image
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  {screenshotPreview && (
                    <button
                      type="button"
                      onClick={() => setScreenshotPreview(null)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {screenshotPreview && (
                  <img
                    src={screenshotPreview}
                    alt="preview"
                    className="mt-3 max-h-48 rounded-lg border object-contain"
                  />
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Send className="h-4 w-4" />
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Detail modal ── */}
      {showDetail && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-6">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-semibold">{selectedTask.title}</h3>
                <p className="text-sm text-gray-500">Task ID: {selectedTask.id}</p>
                <p className="text-sm text-gray-500">
                  Deadline:{' '}
                  {selectedTask.deadline
                    ? new Date(selectedTask.deadline).toLocaleString()
                    : 'None'}
                </p>
              </div>
              <button onClick={closeDetail} className="px-3 py-2 rounded-lg border">
                Close
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <h4 className="text-sm font-medium text-gray-600">Task Description</h4>
                <p className="mt-2 text-gray-800">{selectedTask.description}</p>

                <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                  <h5 className="text-sm font-medium text-gray-600">Instruction</h5>
                  <p className="mt-2 text-sm text-gray-700">{selectedTask.instruction}</p>
                </div>

                {/* Submissions */}
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-600">
                    Submissions ({selectedTask.submissions?.length || 0})
                  </h5>
                  {selectedTask.submissions && selectedTask.submissions.length > 0 ? (
                    <div className="mt-2 space-y-3">
                      {selectedTask.submissions.map((sub) => (
                        <div key={sub.id} className="bg-gray-50 p-4 rounded-lg border">
                          <div className="text-sm">
                            <span className="font-medium">Submitted by:</span> {sub.submittedByName}{' '}
                            ({new Date(sub.submittedAt).toLocaleString()})
                          </div>
                          <p className="mt-2 text-sm text-gray-700">{sub.notes}</p>
                          {sub.metadata && (
                            <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-2">
                              {Object.entries(sub.metadata).map(([key, value]) => (
                                <span key={key} className="bg-white px-2 py-1 rounded border">
                                  {key}: {value}
                                </span>
                              ))}
                            </div>
                          )}
                          {sub.attachments && sub.attachments.length > 0 && (
                            <div className="mt-3 flex gap-2 flex-wrap">
                              {sub.attachments.map((url, idx) => (
                                <img
                                  key={idx}
                                  src={url}
                                  alt={`attachment-${idx}`}
                                  className="h-24 w-auto rounded border object-cover cursor-pointer"
                                  onClick={() => setImageViewerSrc(url)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">No submissions yet.</p>
                  )}
                </div>

                {/* Screenshot evidence */}
                <div className="mt-6">
                  <h5 className="text-sm font-medium text-gray-600">Task Screenshot Evidence</h5>
                  {selectedTask.telegramScreenshot ? (
                    <img
                      src={selectedTask.telegramScreenshot}
                      alt="Telegram evidence"
                      className="mt-2 w-full max-h-56 object-cover rounded-lg border cursor-pointer"
                      onClick={() => setImageViewerSrc(selectedTask.telegramScreenshot!)}
                    />
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">No screenshot attached.</p>
                  )}
                </div>
              </div>

              <aside className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <h5 className="text-sm font-medium text-gray-600">Metadata</h5>
                  <div className="mt-2 text-sm text-gray-700 space-y-1">
                    <div>Status: {selectedTask.status.replace('_', ' ')}</div>
                    <div>Created: {new Date(selectedTask.createdAt).toLocaleDateString()}</div>
                    {selectedTask.approvalStatus && (
                      <div>Decision: {selectedTask.approvalStatus}</div>
                    )}
                    {selectedTask.feedbacks && selectedTask.feedbacks.length > 0 && (
                      <div>
                        <div className="font-medium mt-2">Feedback history:</div>
                        {selectedTask.feedbacks.map((fb) => (
                          <div key={fb.id} className="text-xs mt-1 pl-2 border-l-2 border-yellow-400">
                            <span className="font-medium">{fb.createdByName}:</span> {fb.text}
                            <div className="text-gray-400">
                              {new Date(fb.createdAt).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {canManage && (
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
                        onClick={() => setShowFeedbackModal(true)}
                        className="w-full px-3 py-2 border rounded-lg text-gray-700"
                      >
                        Provide Feedback
                      </button>
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>
      )}

      {/* ── Feedback modal ── */}
      {showFeedbackModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold">Provide Feedback</h4>
              <button onClick={() => setShowFeedbackModal(false)} className="px-3 py-2 rounded-lg border">
                Cancel
              </button>
            </div>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={6}
              className="w-full mt-4 rounded-lg border px-3 py-2 text-sm"
              placeholder="Enter feedback for the data collector..."
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="px-4 py-2 rounded-lg border"
              >
                Close
              </button>
              <button
                onClick={handleProvideFeedback}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Send Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Image viewer modal ── */}
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
                onClick={() => imageRef.current?.requestFullscreen?.()}
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

export default DataCollectorTasks;