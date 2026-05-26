import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  createEvaluationSubmittedNotification,
  createDecisionMadeNotification,
  createQuantityReviewEvaluationId,
  loadQuantityReviewEvaluations,
  loadQuantityReviewNotifications,
  loadQuantityReviewTasks,
  markRoleNotificationsRead,
  QuantityReviewNotification,
  QuantityReviewDecision,
  QuantityReviewEvaluation,
  QuantityReviewRecommendation,
  QuantityReviewTask,
  saveQuantityReviewEvaluations,
  saveQuantityReviewNotifications,
  saveQuantityReviewTasks,
} from '../data/quantitySurveyorWorkflow';
import {
  CheckCircle2,
  Clock3,
  FileText,
  ImageIcon,
  MessageSquareWarning,
  ShieldCheck,
  X,
} from 'lucide-react';

// ─── Global “viewed” set – persists across route changes, resets on page refresh ───
const viewedQuantitySurveyorTaskCards = new Set<string>();

function publishBadgeCount(count: number) {
  window.dispatchEvent(
    new CustomEvent('quantity-surveyor-notifications-updated', { detail: count })
  );
}

type PanelKey = 'active' | 'approval';
type EvaluationFormState = {
  designCostValue: string;
  evaluationNotes: string;
  recommendation: QuantityReviewRecommendation;
};
const emptyForm: EvaluationFormState = {
  designCostValue: '',
  evaluationNotes: '',
  recommendation: 'recommended_for_approval',
};

function formatDate(v: string) {
  return new Date(v).toLocaleDateString();
}
function formatDateTime(v?: string) {
  return v ? new Date(v).toLocaleString() : 'Not decided yet';
}
function getRecommendationLabel(r: QuantityReviewRecommendation) {
  return r === 'recommended_for_approval' ? 'Recommended for Approval' : 'Recommends Revision';
}
function getDecisionLabel(d: QuantityReviewDecision) {
  return d === 'approved' ? 'Approved' : d === 'feedback' ? 'Feedback' : 'Pending Decision';
}

export function QuantitySurveyorDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<QuantityReviewTask[]>(() => loadQuantityReviewTasks());
  const [evaluations, setEvaluations] = useState<QuantityReviewEvaluation[]>(() =>
    loadQuantityReviewEvaluations()
  );
  const [notifications, setNotifications] = useState<QuantityReviewNotification[]>(() =>
    loadQuantityReviewNotifications()
  );
  const [activePanel, setActivePanel] = useState<PanelKey>('active');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<string | null>(null);
  const [form, setForm] = useState<EvaluationFormState>(emptyForm);
  const [decisionFeedback, setDecisionFeedback] = useState('');
  const [showEvidencePreview, setShowEvidencePreview] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // ── Highlighted tasks = pending_review and not yet globally viewed ──
  // Initialize with correct set immediately to avoid flash of 0 badge count
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(() => {
    const unseen = tasks
      .filter((t) => t.status === 'pending_review' && !viewedQuantitySurveyorTaskCards.has(t.id))
      .map((t) => t.id);
    return new Set(unseen);
  });

  // Publish badge count whenever highlightedIds changes
  useEffect(() => {
    publishBadgeCount(highlightedIds.size);
  }, [highlightedIds]);

  // Sync highlightedIds when tasks change (e.g., after status updates)
  useEffect(() => {
    const unseen = tasks
      .filter((t) => t.status === 'pending_review' && !viewedQuantitySurveyorTaskCards.has(t.id))
      .map((t) => t.id);
    setHighlightedIds(new Set(unseen));
  }, [tasks]);

  const pageMode = location.pathname.includes('/quantity-surveyor-review')
    ? 'review'
    : location.pathname.includes('/quantity-surveyor-live')
      ? 'live'
      : 'dashboard';
  const isDashboardMode = pageMode === 'dashboard';

  useEffect(() => {
    return () => {
      setSelectedTaskId(null);
      setSelectedEvaluationId(null);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const currentUser = user;
    if (!currentUser) return;
    persistNotifications(markRoleNotificationsRead(notifications, currentUser.role, 'task_assigned'));
  }, []);

  useEffect(() => {
    if (pageMode === 'review') {
      setActivePanel('approval');
    } else {
      setActivePanel('active');
    }
    setSelectedTaskId(null);
    setSelectedEvaluationId(null);
  }, [pageMode]);

  if (!user) return null;

  const approvedEvaluations = evaluations.filter((e) => e.decisionStatus === 'approved');
  const feedbackEvaluations = evaluations.filter((e) => e.decisionStatus === 'feedback');
  const pendingDecisionEvaluations = evaluations.filter((e) => e.decisionStatus === 'pending');

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;
  const selectedEvaluation = evaluations.find((e) => e.id === selectedEvaluationId) ?? null;
  const selectedTaskEvaluation = selectedTask
    ? evaluations.find((e) => e.taskId === selectedTask.id) ?? null
    : null;

  useEffect(() => {
    if (!selectedTask) {
      setForm(emptyForm);
      return;
    }
    setForm({
      designCostValue: selectedTaskEvaluation ? String(selectedTaskEvaluation.costValue) : '',
      evaluationNotes: selectedTaskEvaluation?.evaluationNotes ?? '',
      recommendation: selectedTaskEvaluation?.recommendation ?? 'recommended_for_approval',
    });
  }, [selectedTask, selectedTaskEvaluation]);

  useEffect(() => {
    setDecisionFeedback(selectedEvaluation?.decisionNotes ?? '');
  }, [selectedEvaluation]);

  const persistTasks = (next: QuantityReviewTask[]) => {
    setTasks(next);
    saveQuantityReviewTasks(next);
  };
  const persistEvaluations = (next: QuantityReviewEvaluation[]) => {
    setEvaluations(next);
    saveQuantityReviewEvaluations(next);
  };
  const persistNotifications = (next: QuantityReviewNotification[]) => {
    setNotifications(next);
    saveQuantityReviewNotifications(next);
  };

  // Clear all current highlights (used ONLY when navigating to approval/review page)
  const clearAllHighlights = () => {
    if (highlightedIds.size > 0) {
      highlightedIds.forEach((id) => viewedQuantitySurveyorTaskCards.add(id));
      setHighlightedIds(new Set());
      // Badge count will be published by the highlightedIds effect
    }
  };

  const openTask = (task: QuantityReviewTask) => {
    // Mark task as globally viewed when user opens detail
    if (highlightedIds.has(task.id)) {
      viewedQuantitySurveyorTaskCards.add(task.id);
      setHighlightedIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }

    let nextId = task.id;
    if (task.status === 'pending_review') {
      const updated: QuantityReviewTask = {
        ...task,
        status: 'in_review',
        updatedAt: new Date().toISOString(),
      };
      persistTasks(tasks.map((t) => (t.id === task.id ? updated : t)));
      nextId = updated.id;
    }
    setSelectedTaskId(nextId);
    setSelectedEvaluationId(null);
  };

  const openEvaluation = (evaluation: QuantityReviewEvaluation) => {
    setSelectedEvaluationId(evaluation.id);
    setSelectedTaskId(evaluation.taskId);
  };

  const closeDetail = () => {
    setSelectedTaskId(null);
    setSelectedEvaluationId(null);
  };

  const openPanelPage = (panel: PanelKey) => {
    // Only clear highlights when opening the Review (approval) page
    if (panel === 'approval') {
      clearAllHighlights();
    }
    if (isDashboardMode) {
      navigate(panel === 'active' ? '/quantity-surveyor-live' : '/quantity-surveyor-review');
      return;
    }
    setActivePanel(panel);
  };

  const handleDecision = (decision: QuantityReviewDecision) => {
    if (!selectedEvaluation || !selectedTask) return;

    const isApproved = decision === 'approved';
    const notes = isApproved ? 'Approved by CEO/General Manager.' : decisionFeedback.trim();

    if (!isApproved && !notes) {
      setToast('Enter feedback before sending it to the Quantity Surveyor.');
      return;
    }

    const nextEvaluation: QuantityReviewEvaluation = {
      ...selectedEvaluation,
      decisionStatus: decision,
      decisionNotes: notes,
      decidedBy: user.id,
      decidedByName: user.name,
      decidedAt: new Date().toISOString(),
    };

    persistEvaluations(
      evaluations.map((evaluation) => (evaluation.id === nextEvaluation.id ? nextEvaluation : evaluation))
    );
    persistNotifications([
      createDecisionMadeNotification(selectedTask, nextEvaluation),
      ...notifications,
    ]);
    setDecisionFeedback(nextEvaluation.decisionNotes ?? '');
    setToast(
      isApproved
        ? 'Task approved and Quantity Surveyor notified.'
        : 'Feedback sent and Quantity Surveyor notified.'
    );
    closeDetail();
  };

  const saveEvaluation = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTask) return;
    const next: QuantityReviewEvaluation = {
      id: selectedTaskEvaluation?.id ?? createQuantityReviewEvaluationId(),
      taskId: selectedTask.id,
      jobId: selectedTask.jobId,
      surveyorId: user.id,
      surveyorName: user.name,
      costValue: Number(form.designCostValue),
      budgetExpectationReference: selectedTask.budgetExpectationReference,
      evaluationNotes: form.evaluationNotes.trim(),
      recommendation: form.recommendation,
      submittedAt: selectedTaskEvaluation?.submittedAt ?? new Date().toISOString(),
      decisionStatus: selectedTaskEvaluation?.decisionStatus ?? 'pending',
      decisionNotes: selectedTaskEvaluation?.decisionNotes,
      decidedBy: selectedTaskEvaluation?.decidedBy,
      decidedByName: selectedTaskEvaluation?.decidedByName,
      decidedAt: selectedTaskEvaluation?.decidedAt,
    };
    const nextEvaluations = selectedTaskEvaluation
      ? evaluations.map((e) => (e.id === next.id ? next : e))
      : [next, ...evaluations];
    const nextTasks = tasks.map(
      (t): QuantityReviewTask =>
        t.id === selectedTask.id
          ? {
              ...t,
              status: 'record_submitted',
              evaluationId: next.id,
              updatedAt: new Date().toISOString(),
            }
          : t
    );
    persistEvaluations(nextEvaluations);
    persistTasks(nextTasks);
    persistNotifications([createEvaluationSubmittedNotification(selectedTask, next), ...notifications]);
    closeDetail();
    openPanelPage('approval');
  };

  // Sorted tasks – highlighted always first
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aHL = highlightedIds.has(a.id) ? 1 : 0;
      const bHL = highlightedIds.has(b.id) ? 1 : 0;
      if (bHL !== aHL) return bHL - aHL;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [tasks, highlightedIds]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Quantity Surveyor Dashboard</h2>
              <p className="text-gray-600 mt-0.5">
                Review costed design submissions forwarded from Telegram.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              {
                label: 'Active Tasks',
                value: String(tasks.length),
                badge: 'Open',
                color: 'bg-blue-50 text-blue-700',
              },
              {
                label: 'Live',
                value: String(
                  tasks.filter((task) => task.status === 'pending_review' || task.status === 'in_review')
                    .length
                ),
                badge: 'Open',
                color: 'bg-amber-50 text-amber-700',
              },
              {
                label: 'Approval',
                value: String(pendingDecisionEvaluations.length),
                badge: 'Ready',
                color: 'bg-green-50 text-green-700',
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 min-w-[110px]"
              >
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="text-2xl font-bold text-gray-900">{s.value}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.color}`}>
                    {s.badge}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dashboard shortcuts */}
      {isDashboardMode ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {[
            {
              key: 'active' as const,
              label: 'Live',
              count: 'Open Live Page',
              badge: 'Open',
              helper: 'Open the live queue and inspect each submission in detail.',
            },
            {
              key: 'approval' as const,
              label: 'Review',
              count: 'Open Review Page',
              badge: 'Open',
              helper: 'Open the review page to inspect approvals and feedback items.',
            },
          ].map((panel) => (
            <button
              key={panel.key}
              type="button"
              onClick={() => openPanelPage(panel.key)}
              className="rounded-xl border border-gray-200 bg-white p-5 text-left text-gray-700 shadow-sm transition-all hover:border-blue-300 hover:shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {panel.label}
                  </p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">{panel.count}</p>
                </div>
                <div className="flex items-center gap-2">
                  {panel.key === 'active' && highlightedIds.size > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-blue-600 px-2 py-1 text-xs font-semibold text-white">
                      {highlightedIds.size} new
                    </span>
                  )}
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                    {panel.badge}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-500">{panel.helper}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {pageMode === 'review' ? 'Review Page' : 'Live Page'}
            </p>
            <p className="text-sm text-gray-500">Dedicated quantity surveyor view.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to Dashboard
          </button>
        </div>
      )}

      {/* Active panel – task list with improved highlights */}
      {(pageMode === 'live' || (isDashboardMode && activePanel === 'active')) && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-gray-900">Active Task</h3>
                {highlightedIds.size > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-blue-600 px-2 py-1 text-xs font-semibold text-white">
                    {highlightedIds.size} new
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                All forwarded submissions ready for quantity review.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
              Open
            </span>
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <div className="hidden grid-cols-[110px_140px_1.6fr_140px_140px_170px] gap-4 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 lg:grid">
              <span>Job ID</span>
              <span>Screenshot</span>
              <span>Description</span>
              <span>Designer</span>
              <span>Date</span>
              <span>Status / Actions</span>
            </div>
            <div className="divide-y divide-gray-100 lg:divide-y">
              {sortedTasks.map((task) => {
                const evaluation = evaluations.find((e) => e.taskId === task.id);
                const isSelected = selectedTaskId === task.id;
                const isNew = highlightedIds.has(task.id);
                const statusBadge = (
                  <span
                    className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium ${
                      task.status === 'pending_review'
                        ? 'bg-amber-100 text-amber-700'
                        : task.status === 'in_review'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {task.status.replace('_', ' ')}
                  </span>
                );

                return (
                  <div key={task.id}>
                    {/* Desktop row – improved highlight design */}
                    <div
                      className={`hidden w-full items-center gap-4 px-4 py-4 text-left transition-all duration-300 lg:grid ${
                        isSelected
                          ? 'bg-blue-50'
                          : isNew
                          ? 'bg-gradient-to-r from-blue-50/80 via-blue-50/40 to-white border-l-4 border-blue-400 shadow-sm'
                          : 'hover:bg-gray-50'
                      }`}
                      style={{ gridTemplateColumns: '110px 140px 1.6fr 140px 140px 170px' }}
                    >
                      {isNew && (
                        <div className="col-span-full mb-1">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            New
                          </span>
                        </div>
                      )}
                      <span className="font-semibold text-gray-900">{task.jobId}</span>
                      <div className="flex items-center gap-2">
                        <img
                          src={task.telegramScreenshot}
                          alt="screenshot"
                          className="h-10 w-14 rounded-lg border border-gray-200 object-cover"
                        />
                        <span className="text-xs text-gray-500">evidence</span>
                      </div>
                      <span className="text-sm text-gray-700 line-clamp-2">{task.description}</span>
                      <span className="text-sm text-gray-700">{task.designerName}</span>
                      <span className="text-sm text-gray-700">
                        {formatDate(task.submissionDate)}
                      </span>
                      <div className="flex items-center justify-end gap-2">
                        {statusBadge}
                        <button
                          type="button"
                          onClick={() => openTask(task)}
                          className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          Details
                        </button>
                      </div>
                    </div>

                    {/* Mobile card – improved highlight design */}
                    <div
                      className={`w-full px-4 py-4 text-left transition-all duration-300 lg:hidden ${
                        isSelected
                          ? 'bg-blue-50'
                          : isNew
                          ? 'bg-gradient-to-r from-blue-50/80 via-blue-50/40 to-white border-l-4 border-blue-400 shadow-sm'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      {isNew && (
                        <div className="mb-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            New
                          </span>
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{task.jobId}</p>
                          <p className="mt-0.5 text-xs text-gray-500">{task.designWorkReference}</p>
                        </div>
                        {statusBadge}
                      </div>
                      <div className="mt-3 flex items-start gap-3">
                        <img
                          src={task.telegramScreenshot}
                          alt="screenshot"
                          className="h-12 w-16 rounded-lg border border-gray-200 object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-700 line-clamp-2">{task.description}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {task.designerName} · {formatDate(task.submissionDate)}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">
                            {evaluation ? 'Evaluation created' : 'New task'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => openTask(task)}
                          className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Approval panel – unchanged logic, only display */}
      {(pageMode === 'review' || (isDashboardMode && activePanel === 'approval')) && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Approval</h3>
                <p className="text-sm text-gray-500">
                  Approved and feedback items returned from GM or CEO.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                  Approvals
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                  Feedback
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                  Recent
                </span>
              </div>
            </div>

            {/* Pending decisions ... (unchanged) */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3 text-gray-700">
                <Clock3 className="w-4 h-4" />
                <h4 className="font-semibold text-sm">Pending decisions</h4>
              </div>
              {pendingDecisionEvaluations.length > 0 ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {pendingDecisionEvaluations.map((ev) => {
                    const task = tasks.find((t) => t.id === ev.taskId);
                    const isSelected = selectedEvaluationId === ev.id;
                    return (
                      <div
                        key={ev.id}
                        className={`rounded-xl border p-4 text-left transition-colors ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-900">{ev.jobId}</p>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {task?.designerName ?? ev.surveyorName}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              Pending
                            </span>
                            <button
                              type="button"
                              onClick={() => openEvaluation(ev)}
                              className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                            >
                              Details
                            </button>
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                          {ev.evaluationNotes}
                        </p>
                        <p className="mt-2 text-xs text-gray-400 uppercase tracking-wide">
                          Submission: {formatDateTime(ev.submittedAt)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                  No pending decisions right now.
                </div>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-700 mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <h4 className="font-semibold text-sm">Approval cards</h4>
                </div>
                {approvedEvaluations.length > 0 ? (
                  approvedEvaluations.map((ev) => {
                    const task = tasks.find((t) => t.id === ev.taskId);
                    const isSelected = selectedEvaluationId === ev.id;
                    return (
                      <div
                        key={ev.id}
                        className={`w-full rounded-xl border p-4 text-left transition-colors ${
                          isSelected
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 bg-white hover:border-green-200 hover:bg-green-50/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-900">{ev.jobId}</p>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {task?.designerName ?? ev.surveyorName}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              Approved
                            </span>
                            <button
                              type="button"
                              onClick={() => openEvaluation(ev)}
                              className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                            >
                              Details
                            </button>
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">
                          Cost: {ev.costValue.toLocaleString()}
                        </p>
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                          {ev.evaluationNotes}
                        </p>
                        <p className="mt-2 text-xs text-gray-400 uppercase tracking-wide">
                          Decision: {formatDateTime(ev.decidedAt)}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                    No approved items yet.
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-red-700 mb-1">
                  <MessageSquareWarning className="w-4 h-4" />
                  <h4 className="font-semibold text-sm">Feedback cards</h4>
                </div>
                {feedbackEvaluations.length > 0 ? (
                  feedbackEvaluations.map((ev) => {
                    const task = tasks.find((t) => t.id === ev.taskId);
                    const isSelected = selectedEvaluationId === ev.id;
                    return (
                      <div
                        key={ev.id}
                        className={`w-full rounded-xl border p-4 text-left transition-colors ${
                          isSelected
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200 bg-white hover:border-red-200 hover:bg-red-50/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-900">{ev.jobId}</p>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {task?.designerName ?? ev.surveyorName}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              Feedback
                            </span>
                            <button
                              type="button"
                              onClick={() => openEvaluation(ev)}
                              className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                            >
                              Details
                            </button>
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">
                          Cost: {ev.costValue.toLocaleString()}
                        </p>
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                          {ev.decisionNotes ?? ev.evaluationNotes}
                        </p>
                        <p className="mt-2 text-xs text-gray-400 uppercase tracking-wide">
                          Decision: {formatDateTime(ev.decidedAt)}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                    No feedback items yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Active Task Detail Modal ── */}
      {selectedTask && activePanel === 'active' && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-6">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Review Detail</h3>
                <p className="text-sm text-gray-500">
                  {selectedTask.jobId} – {selectedTask.designWorkReference}
                </p>
              </div>
              <button onClick={closeDetail} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Design Work Reference
                    </p>
                    <p className="font-semibold text-gray-900 mt-0.5">
                      {selectedTask.designWorkReference}
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    {selectedTask.jobId}
                  </span>
                </div>
                <div className="mt-4 space-y-3 text-sm text-gray-700">
                  <div className="flex items-start gap-2">
                    <ImageIcon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Telegram evidence</p>
                      <img
                        src={selectedTask.telegramScreenshot}
                        alt="screenshot"
                        className="mt-2 h-40 w-full rounded-xl border border-gray-200 object-cover"
                      />
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Submission history</p>
                      <ul className="mt-1 space-y-1 text-gray-600">
                        {selectedTask.submissionHistory.map((h) => (
                          <li key={h} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gray-400 shrink-0" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={saveEvaluation} className="space-y-4 rounded-xl border border-gray-200 p-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Design Cost Value
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={form.designCostValue}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, designCostValue: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="Enter design cost value"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Budget Expectation Reference
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={
                      selectedTask.budgetExpectationReference ?? 'No budget reference available'
                    }
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Evaluation Notes
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={form.evaluationNotes}
                    onChange={(e) =>
                      setForm((c) => ({ ...c, evaluationNotes: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="Explain the cost comparison and evaluation notes"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Evaluation Status
                  </label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {[
                      {
                        value: 'recommended_for_approval' as const,
                        label: 'Recommended for Approval',
                      },
                      {
                        value: 'recommends_revision' as const,
                        label: 'Recommends Revision',
                      },
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ${
                          form.recommendation === opt.value
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="eval-status"
                          value={opt.value}
                          checked={form.recommendation === opt.value}
                          onChange={() =>
                            setForm((c) => ({ ...c, recommendation: opt.value }))
                          }
                          className="sr-only"
                        />
                        <span className="h-2 w-2 rounded-full bg-current shrink-0" />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {selectedTaskEvaluation
                    ? 'Update Quantity Review Record'
                    : 'Create Quantity Review Record'}
                </button>
              </form>

              {selectedTaskEvaluation && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                  <p className="font-medium text-gray-800 mb-2">Current review record</p>
                  <p>ID: {selectedTaskEvaluation.id}</p>
                  <p>Submitted by: {selectedTaskEvaluation.surveyorName}</p>
                  <p>
                    Status: {getRecommendationLabel(selectedTaskEvaluation.recommendation)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Approval Evaluation Detail Modal ── */}
      {selectedEvaluation && activePanel === 'approval' && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-6">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Selected Item</h3>
                <p className="text-sm text-gray-500">
                  {selectedEvaluation.jobId} –{' '}
                  {selectedTask?.designWorkReference ?? selectedEvaluation.jobId}
                </p>
              </div>
              <button onClick={closeDetail} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Task statement
                </p>
                <p className="mt-2 text-sm text-gray-700">
                  {selectedTask?.description ?? selectedEvaluation.evaluationNotes}
                </p>

                <div className="mt-4 flex items-start gap-2 text-sm text-gray-700">
                  <FileText className="mt-0.5 h-4 w-4 text-gray-400" />
                  <div>
                    <p className="font-medium">Quantity surveyor submission notes</p>
                    <p className="text-gray-600">{selectedEvaluation.evaluationNotes}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-start gap-2 text-sm text-gray-700">
                  <ImageIcon className="mt-0.5 h-4 w-4 text-gray-400" />
                  <div className="w-full">
                    <p className="font-medium">Uploaded screenshot evidence</p>
                    <button
                      type="button"
                      onClick={() =>
                        selectedTask?.telegramScreenshot &&
                        setShowEvidencePreview(selectedTask.telegramScreenshot)
                      }
                      className="mt-2 block w-full overflow-hidden rounded-xl border border-gray-200 bg-white"
                    >
                      <img
                        src={selectedTask?.telegramScreenshot}
                        alt="Telegram destination preview"
                        className="h-48 w-full object-cover"
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Submission metadata
                </p>
                <div className="mt-3 space-y-2 text-sm text-gray-700">
                  <p>Job ID: {selectedEvaluation.jobId}</p>
                  <p>Surveyor: {selectedEvaluation.surveyorName}</p>
                  <p>Cost value: {selectedEvaluation.costValue.toLocaleString()}</p>
                  <p>
                    Recommendation: {getRecommendationLabel(selectedEvaluation.recommendation)}
                  </p>
                  <p>
                    Decision status: {getDecisionLabel(selectedEvaluation.decisionStatus)}
                  </p>
                  <p>Submission timestamp: {formatDateTime(selectedEvaluation.submittedAt)}</p>
                  <p>Decision timestamp: {formatDateTime(selectedEvaluation.decidedAt)}</p>
                  <p>Decided by: {selectedEvaluation.decidedByName ?? 'Not decided yet'}</p>
                </div>
              </div>
            </div>

            {selectedEvaluation.decisionStatus === 'pending' && selectedTask && (
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="font-semibold text-blue-900">Approve or provide feedback</p>
                <p className="mt-1 text-sm text-blue-800">
                  Approving marks this item as approved. Providing feedback sends a note to the
                  Quantity Surveyor.
                </p>
                <div className="mt-4 space-y-3">
                  <textarea
                    value={decisionFeedback}
                    onChange={(event) => setDecisionFeedback(event.target.value)}
                    rows={4}
                    placeholder="Write feedback for the Quantity Surveyor..."
                    className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleDecision('approved')}
                      className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecision('feedback')}
                      className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Provide Feedback
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedEvaluation.decisionStatus !== 'pending' && (
              <div className="mt-4 rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-700">
                {selectedEvaluation.decisionStatus === 'approved'
                  ? selectedEvaluation.decisionNotes ?? 'Approved with no additional notes.'
                  : selectedEvaluation.decisionNotes ?? 'Feedback sent with no additional notes.'}
              </div>
            )}
          </div>
        </div>
      )}

      {showEvidencePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3 pb-3">
              <p className="text-sm font-semibold text-gray-900">
                Telegram destination preview
              </p>
              <button
                onClick={() => setShowEvidencePreview(null)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
            <img
              src={showEvidencePreview}
              alt="Telegram destination preview fullscreen"
              className="max-h-[80vh] w-full rounded-xl object-contain bg-gray-100"
            />
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

export default QuantitySurveyorDashboard;