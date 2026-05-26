import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Badge } from '../components/ui/badge';
import {
  createQuantityReviewTaskId,
  createTaskAssignedNotification,
  loadQuantityReviewEvaluations,
  loadQuantityReviewNotifications,
  loadQuantityReviewTasks,
  QuantityReviewTask,
  saveQuantityReviewNotifications,
  saveQuantityReviewTasks,
  loadQuantityReviewEvaluations as _loadQuantityReviewEvaluations,
  saveQuantityReviewEvaluations,
  createQuantityReviewEvaluationId,
  createDecisionMadeNotification,
} from '../data/quantitySurveyorWorkflow';
import { Plus, Send, X, Image } from 'lucide-react';

type ForwardFormState = {
  assignedTo: string;
  description: string;
  telegramScreenshot: string;
  telegramScreenshotDescription: string;
  budgetExpectationReference: string;
};

const emptyForm: ForwardFormState = {
  assignedTo: '11',
  description: '',
  telegramScreenshot: '',
  telegramScreenshotDescription: '',
  budgetExpectationReference: '',
};

// ── Mock data (5 extra tasks) ──────────────────────────────────────────
const MOCK_TASKS: QuantityReviewTask[] = [
  {
    id: 'mock-task-1',
    jobId: 'JOB-101',
    designWorkReference: 'DW-501',
    telegramScreenshot: 'https://via.placeholder.com/150/3B82F6/FFFFFF?text=Screen+1',
    telegramScreenshotDescription: 'Initial sketch from designer',
    description: 'Two‑storey residential extension with cantilever balcony.',
    designerName: 'Alice Johnson',
    submissionDate: new Date('2026-05-20T09:00:00Z').toISOString(),
    budgetExpectationReference: 'BUD-901',
    submissionHistory: [
      'Designer submission received in Telegram.',
      'Manager forwarded for quantity review.',
    ],
    status: 'pending_review',
    createdBy: 'user-1',
    assignedTo: '11',
    createdAt: new Date('2026-05-20T09:05:00Z').toISOString(),
    updatedAt: new Date('2026-05-20T09:05:00Z').toISOString(),
  },
  {
    id: 'mock-task-2',
    jobId: 'JOB-102',
    designWorkReference: 'DW-502',
    telegramScreenshot: 'https://via.placeholder.com/150/10B981/FFFFFF?text=Screen+2',
    telegramScreenshotDescription: 'Interior layout option A',
    description: 'Open‑plan living area with kitchen island and skylights.',
    designerName: 'Bob Chen',
    submissionDate: new Date('2026-05-21T10:30:00Z').toISOString(),
    budgetExpectationReference: undefined,
    submissionHistory: [
      'Designer submission received in Telegram.',
      'CEO forwarded for quantity review.',
    ],
    status: 'pending_review',
    createdBy: 'user-2',
    assignedTo: '12',
    createdAt: new Date('2026-05-21T10:35:00Z').toISOString(),
    updatedAt: new Date('2026-05-21T10:35:00Z').toISOString(),
  },
  {
    id: 'mock-task-3',
    jobId: 'JOB-103',
    designWorkReference: 'DW-503',
    telegramScreenshot: 'https://via.placeholder.com/150/F59E0B/FFFFFF?text=Screen+3',
    telegramScreenshotDescription: 'Roof structural detail',
    description: 'Steel truss system for commercial warehouse.',
    designerName: 'Clara Mendez',
    submissionDate: new Date('2026-05-22T08:15:00Z').toISOString(),
    budgetExpectationReference: 'BUD-902',
    submissionHistory: [
      'Designer submission received in Telegram.',
      'General Manager forwarded.',
    ],
    status: 'pending_review',
    createdBy: 'user-3',
    assignedTo: '13',
    createdAt: new Date('2026-05-22T08:20:00Z').toISOString(),
    updatedAt: new Date('2026-05-22T08:20:00Z').toISOString(),
  },
  {
    id: 'mock-task-4',
    jobId: 'JOB-104',
    designWorkReference: 'DW-504',
    telegramScreenshot: 'https://via.placeholder.com/150/8B5CF6/FFFFFF?text=Screen+4',
    telegramScreenshotDescription: 'Facade cladding options',
    description: 'Aluminium composite panel system for high‑rise office.',
    designerName: 'David Park',
    submissionDate: new Date('2026-05-23T14:45:00Z').toISOString(),
    budgetExpectationReference: undefined,
    submissionHistory: [
      'Designer submission received in Telegram.',
      'Administrator forwarded.',
    ],
    status: 'pending_review',
    createdBy: 'user-4',
    assignedTo: '11',
    createdAt: new Date('2026-05-23T14:50:00Z').toISOString(),
    updatedAt: new Date('2026-05-23T14:50:00Z').toISOString(),
  },
  {
    id: 'mock-task-5',
    jobId: 'JOB-105',
    designWorkReference: 'DW-505',
    telegramScreenshot: 'https://via.placeholder.com/150/EC4899/FFFFFF?text=Screen+5',
    telegramScreenshotDescription: 'Landscape plan',
    description: 'Rooftop garden with irrigation and seating areas.',
    designerName: 'Elena Rossi',
    submissionDate: new Date('2026-05-24T07:00:00Z').toISOString(),
    budgetExpectationReference: 'BUD-903',
    submissionHistory: [
      'Designer submission received in Telegram.',
      'Manager forwarded for quantity review.',
    ],
    status: 'pending_review',
    createdBy: 'user-2',
    assignedTo: '12',
    createdAt: new Date('2026-05-24T07:10:00Z').toISOString(),
    updatedAt: new Date('2026-05-24T07:10:00Z').toISOString(),
  },
];

// ── Highlight / notification logic (same pattern as Paid Customers) ────
const HIGHLIGHTED_IDS = ['mock-task-1', 'mock-task-2', 'mock-task-3'];
const viewedQuantitySurveyorTaskCards = new Set<string>();

function publishBadgeCount(count: number) {
  window.dispatchEvent(
    new CustomEvent('quantity-surveyor-notifications-updated', { detail: count })
  );
}

export function QuantitySurveyorTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<QuantityReviewTask[]>(() => {
    const stored = loadQuantityReviewTasks();
    return [...MOCK_TASKS, ...stored];
  });
  const [evaluations, setEvaluations] = useState(() => _loadQuantityReviewEvaluations());
  const [notifications, setNotifications] = useState(() => loadQuantityReviewNotifications());
  const [form, setForm] = useState<ForwardFormState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // ── Highlight state ──────────────────────────────────────────────
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const seenThisSession = useRef<Set<string>>(new Set());
  const observedElements = useRef<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Seed customer data from localStorage already done above

  // Initialize highlighted IDs and publish initial badge count
  useEffect(() => {
    const unseen = new Set(
      HIGHLIGHTED_IDS.filter((id) => !viewedQuantitySurveyorTaskCards.has(id))
    );
    setHighlightedIds(unseen);
    publishBadgeCount(unseen.size);
  }, []);

  // IntersectionObserver: track which highlighted cards have been scrolled into view
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

  // Cleanup on unmount: mark seen items as read and update badge
  useEffect(() => {
    return () => {
      const idsSeen = Array.from(seenThisSession.current);
      if (idsSeen.length > 0) {
        idsSeen.forEach((id) => viewedQuantitySurveyorTaskCards.add(id));
        const remaining = new Set(
          HIGHLIGHTED_IDS.filter((id) => !viewedQuantitySurveyorTaskCards.has(id))
        );
        publishBadgeCount(remaining.size);
      }
    };
  }, []);

  // ── Business logic unchanged ─────────────────────────────────────
  if (!user) {
    return null;
  }

  const pendingLeadershipReview = evaluations.filter((evaluation) => evaluation.decisionStatus === 'pending').length;

  const persistTasks = (nextTasks: QuantityReviewTask[]) => {
    setTasks(nextTasks);
    saveQuantityReviewTasks(nextTasks);
  };

  const persistEvaluations = (next: any[]) => { setEvaluations(next); saveQuantityReviewEvaluations(next); };
  const persistNotifications = (next: any[]) => { setNotifications(next); saveQuantityReviewNotifications(next); };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setForm((c) => ({ ...c, telegramScreenshot: dataUrl }));
      setImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleForwardTask = (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    const nextTask: QuantityReviewTask = {
      id: createQuantityReviewTaskId(),
      jobId: `JOB-${Date.now()}`,
      designWorkReference: `DW-${Date.now()}`,
      telegramScreenshot: form.telegramScreenshot.trim(),
      telegramScreenshotDescription: form.telegramScreenshotDescription.trim() || undefined,
      description: form.description.trim(),
      designerName: '',
      submissionDate: new Date().toISOString(),
      budgetExpectationReference: form.budgetExpectationReference.trim() || undefined,
      submissionHistory: [
        'Designer submission received in Telegram.',
        `${user.role === 'ceo' ? 'CEO' : 'General Manager'} forwarded the submission for quantity review.`,
      ],
      status: 'pending_review',
      createdBy: user.id,
      assignedTo: form.assignedTo || '11',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const nextTasks = [nextTask, ...tasks];
    persistTasks(nextTasks);

    const notifications = loadQuantityReviewNotifications();
    saveQuantityReviewNotifications([createTaskAssignedNotification(nextTask), ...notifications]);

    setForm(emptyForm);
    setImagePreview(null);
    setIsSubmitting(false);
    setShowForm(false);
  };

  const [selectedTask, setSelectedTask] = useState<QuantityReviewTask | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  const canManage = user.role === 'ceo' || user.role === 'general_manager';

  const openDetail = (task: QuantityReviewTask) => {
    setSelectedTask(task);
    setShowDetail(true);
  };

  const closeDetail = () => { setSelectedTask(null); setShowDetail(false); };

  function pushNotification(notification: any) {
    try {
      const key = 'role-notifications';
      const saved = localStorage.getItem(key);
      const list = saved ? JSON.parse(saved) : [];
      list.unshift(notification);
      localStorage.setItem(key, JSON.stringify(list));
      persistNotifications([notification, ...notifications]);
    } catch (err) {
      // ignore
    }
  }

  const handleApprove = (task: QuantityReviewTask | null) => {
    if (!canManage || !task) return;
    const existing = evaluations.find((e) => e.taskId === task.id);
    const decisionEvaluation = existing ? { ...existing, decisionStatus: 'approved', decisionNotes: 'Approved by leadership', decidedBy: user.id, decidedByName: user.name, decidedAt: new Date().toISOString() } : {
      id: createQuantityReviewEvaluationId(), taskId: task.id, jobId: task.jobId, surveyorId: task.assignedTo, surveyorName: '', costValue: 0, evaluationNotes: '', recommendation: 'recommended_for_approval', submittedAt: new Date().toISOString(), decisionStatus: 'approved', decisionNotes: 'Approved by leadership', decidedBy: user.id, decidedByName: user.name, decidedAt: new Date().toISOString(),
    };
    const nextEvaluations = existing ? evaluations.map((e) => e.id === decisionEvaluation.id ? decisionEvaluation : e) : [decisionEvaluation, ...evaluations];
    persistEvaluations(nextEvaluations);
    pushNotification(createDecisionMadeNotification(task as any, decisionEvaluation as any));
    const nextTasks = tasks.map((t) => t.id === task.id ? { ...t, status: 'record_submitted', updatedAt: new Date().toISOString() } : t);
    persistTasks(nextTasks as QuantityReviewTask[]);
    setShowDetail(false);
  };

  const handleProvideFeedback = () => {
    if (!canManage || !selectedTask) return;
    if (!feedbackText.trim()) return;
    const task = selectedTask;
    const existing = evaluations.find((e) => e.taskId === task.id);
    const decisionEvaluation = existing ? { ...existing, decisionStatus: 'feedback', decisionNotes: feedbackText.trim(), decidedBy: user.id, decidedByName: user.name, decidedAt: new Date().toISOString() } : {
      id: createQuantityReviewEvaluationId(), taskId: task.id, jobId: task.jobId, surveyorId: task.assignedTo, surveyorName: '', costValue: 0, evaluationNotes: '', recommendation: 'recommends_revision', submittedAt: new Date().toISOString(), decisionStatus: 'feedback', decisionNotes: feedbackText.trim(), decidedBy: user.id, decidedByName: user.name, decidedAt: new Date().toISOString(),
    };
    const nextEvaluations = existing ? evaluations.map((e) => e.id === decisionEvaluation.id ? decisionEvaluation : e) : [decisionEvaluation, ...evaluations];
    persistEvaluations(nextEvaluations);
    pushNotification(createDecisionMadeNotification(task as any, decisionEvaluation as any));
    const nextTasks = tasks.map((t) => t.id === task.id ? { ...t, status: 'in_review', updatedAt: new Date().toISOString() } : t);
    persistTasks(nextTasks as QuantityReviewTask[]);
    setShowFeedbackModal(false);
    setShowDetail(false);
    setFeedbackText('');
  };

  const forwardedByCurrentUser = tasks.filter((task) => task.createdBy === user.id).length;

  // Sort: highlighted first, then by creation date descending
  const sortedTasks = [...tasks].sort((a, b) => {
    const aHL = highlightedIds.has(a.id) ? 1 : 0;
    const bHL = highlightedIds.has(b.id) ? 1 : 0;
    if (bHL !== aHL) return bHL - aHL;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Quantity Surveyor Assignment Desk</h2>
          <p className="mt-1 text-sm text-slate-600">
            Forward design submissions from Telegram to Quantity Surveyor with screenshot evidence and job details.
          </p>
          {highlightedIds.size > 0 && (
            <p className="text-sm text-blue-600 mt-2 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-semibold">
                {highlightedIds.size}
              </span>
              new {highlightedIds.size === 1 ? 'record' : 'records'} since your last visit
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline">Forwarded by you: {forwardedByCurrentUser}</Badge>
          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
            Pending leadership review: {pendingLeadershipReview}
          </Badge>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Forward Design Task
          </button>
        </div>
      </div>

      {/* Queue */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Forwarded design queue</h3>
        <p className="mt-1 text-sm text-slate-600">Latest Telegram design submissions sent for quantity review.</p>

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
                    ? 'border-2 border-blue-400 ring-4 ring-blue-100 shadow-blue-100'
                    : 'border border-slate-200',
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

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{task.jobId}</p>
                    <p className="text-sm text-slate-500">{task.designWorkReference}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        task.status === 'pending_review'
                          ? 'bg-amber-100 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }
                    >
                      {task.status.replace('_', ' ')}
                    </Badge>
                    {(() => {
                      const ev = evaluations.find((e) => e.taskId === task.id);
                      if (!ev) return null;
                      return (
                        <div className="flex items-center gap-2">
                          {ev.decisionStatus === 'feedback' && <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Feedback Provided</span>}
                          {ev.decisionStatus === 'approved' && <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>}
                          {ev.decisionStatus === 'pending' && <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Pending Decision</span>}
                          {ev.recommendation === 'recommends_revision' && <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Recommends Revision</span>}
                          {ev.recommendation === 'recommended_for_approval' && <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Within budget</span>}
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <div className="mt-3">
                  <button
                    onClick={() => openDetail(task)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Open Submission Detail
                  </button>
                </div>
                <p className="mt-2 text-sm text-slate-600">{task.description}</p>
                <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
                  Designer: {task.designerName}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Forward Design Task to Quantity Surveyor</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Fill in the details of the Telegram design submission.
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleForwardTask} className="px-6 py-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Assign Quantity Surveyor</label>
                  <select
                    required
                    value={form.assignedTo}
                    onChange={(e) => setForm((c) => ({ ...c, assignedTo: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="11">Oliver Grant</option>
                    <option value="12">Sam Lee</option>
                    <option value="13">Aisha Khan</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Budget Expectation Reference</label>
                  <input
                    value={form.budgetExpectationReference}
                    onChange={(e) => setForm((c) => ({ ...c, budgetExpectationReference: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="Optional budget reference"
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Telegram Screenshot</label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-700">
                    <Image className="w-4 h-4" />
                    Choose Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      required={!form.telegramScreenshot}
                    />
                  </label>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setForm((c) => ({ ...c, telegramScreenshot: '' }));
                        setImagePreview(null);
                      }}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {imagePreview && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-1">Preview:</p>
                    <img
                      src={imagePreview}
                      alt="Telegram screenshot preview"
                      className="max-w-full h-auto max-h-48 rounded-lg border object-contain"
                    />
                  </div>
                )}
                <div className="mt-3">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Screenshot description (optional)</label>
                  <input
                    value={form.telegramScreenshotDescription}
                    onChange={(e) => setForm((c) => ({ ...c, telegramScreenshotDescription: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="Short caption or context for the screenshot"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Description Text</label>
                <textarea
                  required
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="Describe the forwarded design submission and what should be reviewed."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !form.telegramScreenshot}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  <Send className="h-4 w-4" />
                  Submit Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {showDetail && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-6">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-semibold">{selectedTask.jobId} — {selectedTask.designWorkReference}</h3>
                <p className="text-sm text-gray-500">Submitted: {new Date(selectedTask.submissionDate).toLocaleString()}</p>
                <p className="mt-2 text-sm text-slate-600">Review this submission carefully: inspect the screenshot evidence, confirm the task statement, and either approve or provide actionable feedback. Decisions are recorded with timestamps and will notify the submitter.</p>
              </div>
              <div>
                <button onClick={closeDetail} className="px-3 py-2 rounded-lg border">Close</button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <h4 className="text-sm font-medium text-gray-600">Task statement</h4>
                <p className="mt-2 text-gray-800">{selectedTask.description}</p>

                <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                  <h5 className="text-sm font-medium text-gray-600">Submission history</h5>
                  <ul className="mt-2 text-sm text-gray-700 space-y-1">
                    {selectedTask.submissionHistory.map((h) => <li key={h}>• {h}</li>)}
                  </ul>
                </div>

                {(() => {
                  const ev = evaluations.find((e) => e.taskId === selectedTask.id);
                  if (!ev) return null;
                  return (
                    <div className="mt-4 p-4 bg-white rounded-lg border">
                      <h5 className="text-sm font-medium text-gray-600">Quantity Surveyor submission</h5>
                      <div className="mt-1 text-sm text-gray-700">Submitted by: {ev.surveyorName || 'Quantity Surveyor'} — {new Date(ev.submittedAt).toLocaleString()}</div>
                      {typeof ev.costValue === 'number' && (
                        <div className="mt-2 text-sm text-gray-700">Estimated cost: {ev.costValue.toLocaleString()}</div>
                      )}
                      <p className="mt-3 text-sm text-gray-800">{ev.evaluationNotes}</p>
                    </div>
                  );
                })()}

                <div className="mt-6">
                  <h5 className="text-sm font-medium text-gray-600">Uploaded screenshot evidence (Telegram preview)</h5>
                  <div className="mt-2">
                    <img src={selectedTask.telegramScreenshot} alt="telegram" className="w-full h-56 object-cover rounded-lg border" />
                  </div>
                  {selectedTask.telegramScreenshotDescription && (
                    <p className="mt-2 text-sm text-gray-600">{selectedTask.telegramScreenshotDescription}</p>
                  )}
                </div>
              </div>

              <aside className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <h5 className="text-sm font-medium text-gray-600">Submission metadata</h5>
                  <div className="mt-2 text-sm text-gray-700">
                    <div>Job ID: {selectedTask.jobId}</div>
                    <div>Designer: {selectedTask.designerName}</div>
                    <div>Submitted: {new Date(selectedTask.submissionDate).toLocaleString()}</div>
                    <div>Status: {selectedTask.status.replace('_', ' ')}</div>
                    {(() => {
                      const ev = evaluations.find((e) => e.taskId === selectedTask.id);
                      if (!ev) return null;
                      if (ev.recommendation === 'recommends_revision') {
                        return <div className="mt-2"><Badge className="bg-amber-100 text-amber-700 border-amber-200">Recommends Revision</Badge></div>;
                      }
                      if (ev.recommendation === 'recommended_for_approval') {
                        return <div className="mt-2"><Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Within budget</Badge></div>;
                      }
                      return null;
                    })()}
                  </div>
                </div>

                {canManage && (
                  <div className="p-4 bg-white rounded-lg border shadow-sm">
                    <h5 className="text-sm font-medium text-gray-600">Actions</h5>
                    <div className="mt-3 flex flex-col gap-2">
                      <button onClick={() => handleApprove(selectedTask)} className="w-full px-3 py-2 bg-green-600 text-white rounded-lg">Approve</button>
                      <button onClick={() => setShowFeedbackModal(true)} className="w-full px-3 py-2 border rounded-lg text-gray-700">Provide Feedback</button>
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>
      )}

      {/* Feedback modal */}
      {showFeedbackModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold">Provide Feedback</h4>
              <button onClick={() => setShowFeedbackModal(false)} className="px-3 py-2 rounded-lg border">Cancel</button>
            </div>
            <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} rows={6} className="w-full mt-4 rounded-lg border px-3 py-2 text-sm" placeholder="Enter feedback for the Quantity Surveyor" />
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setShowFeedbackModal(false)} className="px-4 py-2 rounded-lg border">Close</button>
              <button onClick={() => handleProvideFeedback()} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Send Feedback</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuantitySurveyorTasks;