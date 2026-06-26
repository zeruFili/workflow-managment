import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getTaskAssigneeLabel,
  loadDesignerApplications,
} from './designerTaskShared';
import {
  setDesignerAssignmentNotificationIds,
  getPendingReviewHighlightedIds,
  markPendingReviewCardsViewed,
  publishDesignerAssignmentsBadgeCount,
  resetDesignerAssignmentsHighlightState,
} from './designerAssignmentHighlights';
import designerApi, {
  DesignerTaskItem,
  DesignerTaskListMeta,
  SubmissionItem,
  SubmissionsWithReviewsData,
  TaskReviewData,
} from '../../api/designerApi';
import { designerTaskCache } from '../data/designerTaskCache';
import notificationApi from '../../api/notificationApi';
import userApi, { UserItem } from '../../api/userApi';
import {
  createGeneralNotification,
  loadQuantityReviewNotifications,
  saveQuantityReviewNotifications,
} from '../data/quantitySurveyorWorkflow';
import { DesignerTaskApplication, TaskStatus } from '../types';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Edit,
  Image,
  XCircle,
  Briefcase,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Send,
  Star,
  Paperclip,
  PauseCircle,
  Trash2,
  X,
} from 'lucide-react';
import AttachmentViewer from '../components/AttachmentViewer';

const emptyNewTask = {
  title: '',
  description: '',
  instruction: '',
  storyPoints: '',
  projectId: '',
  deadline: '',
  telegramScreenshot: '',
  is_public: false,
  assigned_to_user_id: '',
};

type PhaseKey = 'caseStudy' | 'designStage' | 'rendering' | 'finalStage';

export interface DesignerSubmissionSnapshot {
  note: string;
  screenshot: string | null;
  submittedAt: string;
}

export interface PhaseHistoryEntry {
  status: 'feedback' | 'approved' | 'rejected';
  message: string;
  timestamp: string;
  designerSubmission: DesignerSubmissionSnapshot;
  hasNotification: boolean;
}

export interface PhaseData {
  note: string;
  screenshot: string | null;
  history: PhaseHistoryEntry[];
}

type SubmissionProgress = Record<string, Record<PhaseKey, PhaseData>>;

interface ReviewData {
  reviewerName: string;
  reviewText: string;
  ratings: {
    creativity: number;
    timeliness: number;
    clientUnderstanding: number;
    rendering: number;
  };
  submittedAt: string;
}

const PHASES: { key: PhaseKey; label: string; backendStage: string }[] = [
  { key: 'caseStudy', label: 'Case Study', backendStage: 'case study' },
  { key: 'designStage', label: 'Design Stage', backendStage: 'designing' },
  { key: 'rendering', label: 'Rendering', backendStage: 'rendering' },
  { key: 'finalStage', label: 'Final Stage', backendStage: 'final stage' },
];

const STORAGE_KEY = 'designer-submission-progress';
const REVIEW_STORAGE_KEY = 'designer-task-reviews';
const ROWS_PER_DISPLAY = 10;

const markedTaskNotificationIds = new Set<string>();
let hasResetForSessionOnce = false;

// ---------- Helpers ----------
function loadSubmissionProgress(): SubmissionProgress {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? normalizeSubmissionProgress(JSON.parse(stored)) : {};
  } catch {
    return {};
  }
}

function loadReviews(): Record<string, ReviewData> {
  try {
    const stored = localStorage.getItem(REVIEW_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function defaultPhase(): PhaseData {
  return { note: '', screenshot: null, history: [] };
}

function stripSubmissionNotifications(sub: SubmissionItem): SubmissionItem {
  return {
    ...sub,
    hasNotification: false,
    notificationId: null,
    reviews: (sub.reviews || []).map((r) => ({ ...r, hasNotification: false, notificationId: null })),
  };
}

function designerTaskHasAnyNotification(task: DesignerTaskItem): boolean {
  if ((task as any).taskNotification?.hasNotification) return true;
  const swr = task.submissionsWithReviews;
  if (!swr) return task.hasNestedNotification;
  if (swr.taskNotification?.hasNotification) return true;
  const stages: (keyof SubmissionsWithReviewsData)[] = ['caseStudy', 'designing', 'rendering', 'finalStage'];
  for (const stage of stages) {
    const subs: SubmissionItem[] = (swr as any)?.[stage] || [];
    for (const sub of subs) {
      if (sub.hasNotification) return true;
      for (const r of sub.reviews || []) {
        if (r.hasNotification) return true;
      }
    }
  }
  return task.hasNestedNotification;
}

function hasNestedDesignerNotifications(task: DesignerTaskItem): boolean {
  const swr = task.submissionsWithReviews;
  if (!swr) return task.hasNestedNotification;
  const stages: (keyof SubmissionsWithReviewsData)[] = ['caseStudy', 'designing', 'rendering', 'finalStage'];
  for (const stage of stages) {
    const subs: SubmissionItem[] = (swr as any)?.[stage] || [];
    for (const sub of subs) {
      if (sub.hasNotification) return true;
      for (const r of sub.reviews || []) {
        if (r.hasNotification) return true;
      }
    }
  }
  return task.hasNestedNotification;
}

function createSubmissionScreenshot(phaseLabel: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="480" viewBox="0 0 800 480">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>
      </defs>
      <rect width="800" height="480" fill="url(#bg)" rx="28" />
      <rect x="56" y="56" width="688" height="368" rx="24" fill="#ffffff" fill-opacity="0.06" stroke="#cbd5e1" stroke-opacity="0.18" />
      <text x="400" y="205" fill="#f8fafc" font-size="30" font-family="Arial,Helvetica,sans-serif" text-anchor="middle" font-weight="700">Designer Submission</text>
      <text x="400" y="255" fill="#cbd5e1" font-size="20" font-family="Arial,Helvetica,sans-serif" text-anchor="middle">${phaseLabel}</text>
      <text x="400" y="308" fill="#94a3b8" font-size="15" font-family="Arial,Helvetica,sans-serif" text-anchor="middle">No uploaded screenshot was available, so a placeholder was created.</text>
    </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

function buildDesignerSubmissionSnapshot(
  phaseLabel: string,
  phaseData?: PhaseData,
  submittedAt?: string,
): DesignerSubmissionSnapshot {
  const note = phaseData?.note?.trim() || `Designer submission for ${phaseLabel}`;
  return {
    note,
    screenshot: phaseData?.screenshot ?? createSubmissionScreenshot(phaseLabel),
    submittedAt: submittedAt ?? phaseData?.history?.[0]?.timestamp ?? new Date().toISOString(),
  };
}

function normalizeSubmissionProgress(progress: SubmissionProgress): SubmissionProgress {
  const normalized: SubmissionProgress = {};
  for (const [taskId, taskProgress] of Object.entries(progress)) {
    const mergedProgress = Object.assign(
      { caseStudy: defaultPhase(), designStage: defaultPhase(), rendering: defaultPhase(), finalStage: defaultPhase() },
      taskProgress as Record<PhaseKey, PhaseData>
    );
    normalized[taskId] = {
      caseStudy: {
        ...mergedProgress.caseStudy,
        history: (mergedProgress.caseStudy.history ?? []).map((entry) => ({
          ...entry,
          designerSubmission: entry.designerSubmission
            ?? buildDesignerSubmissionSnapshot('Case Study', mergedProgress.caseStudy, entry.timestamp),
        })),
      },
      designStage: {
        ...mergedProgress.designStage,
        history: (mergedProgress.designStage.history ?? []).map((entry) => ({
          ...entry,
          designerSubmission: entry.designerSubmission
            ?? buildDesignerSubmissionSnapshot('Design Stage', mergedProgress.designStage, entry.timestamp),
        })),
      },
      rendering: {
        ...mergedProgress.rendering,
        history: (mergedProgress.rendering.history ?? []).map((entry) => ({
          ...entry,
          designerSubmission: entry.designerSubmission
            ?? buildDesignerSubmissionSnapshot('Rendering', mergedProgress.rendering, entry.timestamp),
        })),
      },
      finalStage: {
        ...mergedProgress.finalStage,
        history: (mergedProgress.finalStage.history ?? []).map((entry) => ({
          ...entry,
          designerSubmission: entry.designerSubmission
            ?? buildDesignerSubmissionSnapshot('Final Stage', mergedProgress.finalStage, entry.timestamp),
        })),
      },
    };
  }
  return normalized;
}

function defaultTaskProgress(): Record<PhaseKey, PhaseData> {
  return {
    caseStudy: defaultPhase(),
    designStage: defaultPhase(),
    rendering: defaultPhase(),
    finalStage: defaultPhase(),
  };
}

function getCurrentStatus(phase: PhaseData): PhaseHistoryEntry['status'] | 'pending' {
  const history = phase.history ?? [];
  if (history.length === 0) return 'pending';
  return history[history.length - 1].status;
}

function findFirstNonApprovedPhaseIndex(
  phases: { key: PhaseKey }[],
  progress: Record<PhaseKey, PhaseData> | null,
): number {
  if (!progress) return -1;
  for (let i = 0; i < phases.length; i++) {
    const phaseData = progress[phases[i].key];
    if (phaseData && phaseData.history && phaseData.history.length > 0 && getCurrentStatus(phaseData) !== 'approved') {
      return i;
    }
  }
  return -1;
}

function phaseHasDisplayableContent(p: PhaseData | undefined): boolean {
  if (!p) return false;
  return (p.history && p.history.length > 0) || !!p.screenshot;
}

function getLastPopulatedPhaseIndex(progress: Record<PhaseKey, PhaseData> | null): number {
  if (!progress) return -1;
  for (let i = PHASES.length - 1; i >= 0; i--) {
    if (phaseHasDisplayableContent(progress[PHASES[i].key])) {
      return i;
    }
  }
  return -1;
}

function isTaskRejectedFromProgress(progress: Record<PhaseKey, PhaseData> | null): boolean {
  if (!progress) return false;
  for (const phase of PHASES) {
    const data = progress[phase.key];
    if (data && data.history && data.history.length > 0) {
      if (getCurrentStatus(data) === 'rejected') return true;
    }
  }
  return false;
}

function isFinalStageApprovedFromProgress(progress: Record<PhaseKey, PhaseData> | null): boolean {
  if (!progress) return false;
  const finalData = progress.finalStage;
  if (!finalData || !finalData.history || finalData.history.length === 0) return false;
  return getCurrentStatus(finalData) === 'approved';
}

// ── Map API submissions-with-reviews → SubmissionProgress ──
function apiSubmissionsToProgress(data: SubmissionsWithReviewsData): Record<PhaseKey, PhaseData> {
  const result: Record<string, PhaseData> = {
    caseStudy: defaultPhase(),
    designStage: defaultPhase(),
    rendering: defaultPhase(),
    finalStage: defaultPhase(),
  };

  const stageMap: Record<string, PhaseKey> = {
    caseStudy: 'caseStudy',
    designing: 'designStage',
    rendering: 'rendering',
    finalStage: 'finalStage',
  };

  for (const [apiStage, phaseKey] of Object.entries(stageMap)) {
    const submissions: SubmissionItem[] = (data as any)[apiStage] || [];
    if (submissions.length === 0) continue;

    const latestSubmission = submissions[submissions.length - 1];
    const screenshot = latestSubmission.attachment_urls && latestSubmission.attachment_urls.length > 0
      ? latestSubmission.attachment_urls[0]
      : null;

    const history: PhaseHistoryEntry[] = [];
    for (const submission of submissions) {
      const subScreenshot = submission.attachment_urls && submission.attachment_urls.length > 0
        ? submission.attachment_urls[0]
        : null;
      const subNote = submission.description || '';

      for (const review of submission.reviews) {
        const reviewOutcome = review.review_outcome as 'approved' | 'rejected' | 'feedback';
        history.push({
          status: reviewOutcome,
          message: review.description || '',
          timestamp: review.created_at,
          designerSubmission: {
            note: subNote,
            screenshot: subScreenshot ?? createSubmissionScreenshot('Submission'),
            submittedAt: submission.created_at,
          },
          hasNotification: review.hasNotification,
        });
      }

      if (submission.reviews.length === 0 && submission.hasNotification) {
        history.push({
          status: 'feedback',
          message: `Submission for ${PHASES.find((p) => p.backendStage === submission.stage)?.label || submission.stage}`,
          timestamp: submission.created_at,
          designerSubmission: {
            note: subNote,
            screenshot: subScreenshot ?? createSubmissionScreenshot('Submission'),
            submittedAt: submission.created_at,
          },
          hasNotification: true,
        });
      }
    }

    result[phaseKey] = {
      note: latestSubmission.description || '',
      screenshot,
      history,
    };
  }

  return result as Record<PhaseKey, PhaseData>;
}

// ── Display helpers ──
function getAssigneeDisplayName(task: DesignerTaskItem): string {
  if (task.assigned_to_user?.full_name) return task.assigned_to_user.full_name;
  if (task.assigned_to_user_id) return `User ${task.assigned_to_user_id.slice(0, 8)}`;
  return 'Open for application';
}

function getCreatorDisplayName(task: DesignerTaskItem): string {
  if (task.assigned_by_user?.full_name) return task.assigned_by_user.full_name;
  return `User ${task.assigned_by_user_id.slice(0, 8)}`;
}

function statusDisplayName(status: string | null): string {
  if (!status) return 'pending';
  return status.replace('_', ' ');
}

function statusColorClass(status: string | null): string {
  switch (status) {
    case 'approved': return 'bg-green-100 text-green-700';
    case 'rejected': return 'bg-red-100 text-red-700';
    case 'feedback': return 'bg-yellow-100 text-yellow-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

export function DesignerAssignments() {
  const { user } = useAuth();
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<DesignerTaskItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [tasks, setTasks] = useState<DesignerTaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applications, setApplications] = useState<DesignerTaskApplication[]>(loadDesignerApplications);
  const [designers, setDesigners] = useState<UserItem[]>([]);

  // ── Edit Task state ──
  const [showEditTask, setShowEditTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyNewTask });
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const editImageFileRef = useRef<File | null>(null);
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});
  const [editError, setEditError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // ── Delete Task state ──
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Pagination
  const [apiPage, setApiPage] = useState(1);
  const [meta, setMeta] = useState<DesignerTaskListMeta | null>(null);
  const [displayOffset, setDisplayOffset] = useState(0);

  const [submissionProgress, setSubmissionProgress] = useState<SubmissionProgress>(loadSubmissionProgress);
  const [submissionsLoading, setSubmissionsLoading] = useState<Record<string, boolean>>({});
  const [expandedPhase, setExpandedPhase] = useState<PhaseKey | null>(null);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, Record<PhaseKey, string>>>({});
  const [expandedHistoryIdx, setExpandedHistoryIdx] = useState<Record<string, Record<PhaseKey, number | null>>>({});
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<Record<string, string>>({});

  const [reviews, setReviews] = useState<Record<string, ReviewData>>(loadReviews);
  const [reviewTaskId, setReviewTaskId] = useState<string | null>(null);
  const [reviewRatings, setReviewRatings] = useState<Record<string, {
    creativity: number;
    timeliness: number;
    clientUnderstanding: number;
    rendering: number;
  }>>({});
  const [reviewComments, setReviewComments] = useState<Record<string, string>>({});
  const [ratingSubmitted, setRatingSubmitted] = useState<Record<string, boolean>>({});
  const [taskReviewIds, setTaskReviewIds] = useState<Record<string, string>>({});
  const [reviewSubmitting, setReviewSubmitting] = useState<Record<string, boolean>>({});
  // IntersectionObserver
  const seenThisSession = useRef<Set<string>>(new Set());
  const observedElements = useRef<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const tasksRef = useRef<DesignerTaskItem[]>([]);
  const pendingTaskNotifIds = useRef<Map<string, string>>(new Map());
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  useEffect(() => {
    if (user && !hasResetForSessionOnce) {
      resetDesignerAssignmentsHighlightState();
      markedTaskNotificationIds.clear();
      designerTaskCache.invalidate();
      hasResetForSessionOnce = true;
    }
    if (!user) {
      hasResetForSessionOnce = false;
    }
  }, [user]);

  const highlightedIds = (() => {
    if (tasks.length === 0) return new Set<string>();
    const notifIds = new Set(
      tasks.filter((t) => designerTaskHasAnyNotification(t)).map((t) => t.id)
    );
    setDesignerAssignmentNotificationIds(notifIds);
    return getPendingReviewHighlightedIds();
  })();

  // Role-based limits
  const isLeadership = user?.role === 'ceo' || user?.role === 'general_manager';
  const apiLimit = isLeadership ? 20 : 10;

  // ── Fetch tasks from API ──
  const fetchTasks = useCallback(async (page: number, force = false): Promise<DesignerTaskItem[] | undefined> => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      let data: DesignerTaskItem[];
      if (force) {
        designerTaskCache.invalidate({ page, limit: apiLimit });
      }
      data = await designerTaskCache.fetch({ page, limit: apiLimit });
      setTasks(data);
      setMeta((meta: any) => ({ ...meta, page, limit: apiLimit, total: data.length } as any));
      setDisplayOffset(0);

      const progressUpdates: SubmissionProgress = {};
      for (const task of data) {
        if (task.submissionsWithReviews) {
          progressUpdates[task.id] = apiSubmissionsToProgress(task.submissionsWithReviews);
        }
      }
      if (Object.keys(progressUpdates).length > 0) {
        setSubmissionProgress((prev) => ({ ...prev, ...progressUpdates }));
      }

      const notifIds = new Set(
        data
          .filter((t) => designerTaskHasAnyNotification(t))
          .map((t) => t.id)
      );
      setDesignerAssignmentNotificationIds(notifIds);
      return data;
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg || 'Unable to connect to server');
    } finally {
      setIsLoading(false);
    }
  }, [user, apiLimit]);

  useEffect(() => {
    if (!user) return;
    fetchTasks(apiPage);
  }, [user, apiPage, fetchTasks]);

  // ── Auto-open detail from query parameter ──
  const [searchParams, setSearchParams] = useSearchParams();
  const autoOpenTaskId = searchParams.get('openDetail');
  const autoOpenedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!autoOpenTaskId || autoOpenedRef.current === autoOpenTaskId || isLoading) return;
    const task = tasks.find((t) => t.id === autoOpenTaskId);
    if (task) {
      autoOpenedRef.current = autoOpenTaskId;
      openDetail(task);
      searchParams.delete('openDetail');
      setSearchParams(searchParams, { replace: true });
    }
  }, [autoOpenTaskId, isLoading, tasks]);

  // ── Load submission progress from localStorage ──
  useEffect(() => {
    setSubmissionProgress(loadSubmissionProgress());
  }, []);

  // Persist progress on change
  useEffect(() => {
    if (Object.keys(submissionProgress).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(submissionProgress));
    }
  }, [submissionProgress]);

  // Persist reviews on change
  useEffect(() => {
    if (Object.keys(reviews).length > 0) {
      localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(reviews));
    }
  }, [reviews]);

  // ── Publish badge count ──
  useEffect(() => {
    publishDesignerAssignmentsBadgeCount(highlightedIds.size);
  }, [highlightedIds.size]);

  // ── Intersection Observer ──
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
              const task = tasksRef.current.find((t) => t.id === id);
              const topNotif = (task as any)?.taskNotification;
              const swrNotif = task?.submissionsWithReviews?.taskNotification;
              if ((topNotif?.hasNotification && topNotif.notificationId) || (swrNotif?.hasNotification && swrNotif.notificationId)) {
                pendingTaskNotifIds.current.set(id, topNotif?.notificationId || swrNotif!.notificationId);
              }
            }
          }
        });
      },
      { threshold: [0.7] }
    );
    observerRef.current = observer;
    highlightedIds.forEach((id) => {
      const el = document.querySelector(`[data-highlighted-id="${id}"]`);
      if (el && !observedElements.current.has(id)) observer.observe(el);
    });
    return () => { observer.disconnect(); observedElements.current.clear(); };
  }, [highlightedIds]);

  // Commit seen session on unmount
  useEffect(() => {
    return () => {
      if (seenThisSession.current.size === 0 && pendingTaskNotifIds.current.size === 0) return;
      
      const currentTasks = tasksRef.current;
      
      seenThisSession.current.forEach((id) => {
        const task = currentTasks.find((t) => t.id === id);
        if (!task || !hasNestedDesignerNotifications(task)) {
          markPendingReviewCardsViewed([id]);
        }
      });
      seenThisSession.current.clear();
      observedElements.current.clear();
      
      const pending = new Map(pendingTaskNotifIds.current);
      pendingTaskNotifIds.current.clear();
      
      for (const [taskId, notifId] of pending) {
        if (markedTaskNotificationIds.has(notifId)) continue;
        markedTaskNotificationIds.add(notifId);
        
        notificationApi.markRead(notifId)
          .then(() => {
            const tasks = tasksRef.current;
            const updatedTasks = tasks.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    taskNotification: null,
                    submissionsWithReviews: {
                      ...t.submissionsWithReviews,
                      taskNotification: { hasNotification: false, notificationId: null },
                    },
                  }
                : t
            );
            setTasks(updatedTasks as DesignerTaskItem[]);
            tasksRef.current = updatedTasks as DesignerTaskItem[];
            const newNotifIds = new Set(
              updatedTasks
                .filter((t) => designerTaskHasAnyNotification(t))
                .map((t) => t.id)
            );
            setDesignerAssignmentNotificationIds(newNotifIds);
          })
          .catch(() => {
            markedTaskNotificationIds.delete(notifId);
          });
      }
    };
  }, []);

  if (!user) return null;

  const allowedRoles = new Set(['ceo', 'general_manager', 'designer']);
  if (!allowedRoles.has(user.role)) {
    return (
      <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">Access denied.</p>
      </div>
    );
  }

  const canCreateTask = user.role === 'ceo' || user.role === 'general_manager';

  // ── Pagination logic ──
  const canGoPrev = displayOffset > 0 || apiPage > 1;
  const canGoNext = displayOffset + ROWS_PER_DISPLAY < tasks.length || (meta ? apiPage < meta.totalPages : false);

  const goNext = () => {
    if (displayOffset + ROWS_PER_DISPLAY < tasks.length) {
      setDisplayOffset(displayOffset + ROWS_PER_DISPLAY);
    } else {
      setApiPage((p) => p + 1);
    }
  };

  const goPrev = () => {
    if (displayOffset - ROWS_PER_DISPLAY >= 0) {
      setDisplayOffset(displayOffset - ROWS_PER_DISPLAY);
    } else {
      setApiPage((p) => Math.max(1, p - 1));
    }
  };

  const persistTasks = (updatedTasks: DesignerTaskItem[]) => {
    setTasks(updatedTasks);
  };

  const hasDesignerSubmissions = (task: DesignerTaskItem): boolean => {
    const swr = task.submissionsWithReviews;
    if (!swr) return false;
    return (
      (swr.caseStudy || []).length > 0 ||
      (swr.designing || []).length > 0 ||
      (swr.rendering || []).length > 0 ||
      (swr.finalStage || []).length > 0
    );
  };

  const canDeleteDesignerTask = (task: DesignerTaskItem): boolean => {
    if (hasDesignerSubmissions(task)) return false;

    if (task.assigned_to_user_id) {
      const assignmentDate = task.assigned_at ? new Date(task.assigned_at) : (task.updated_at ? new Date(task.updated_at) : null);
      if (assignmentDate) {
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
        if (Date.now() - assignmentDate.getTime() > threeDaysMs) return false;
      }
    }
    return true;
  };

  const openEditTask = (task: DesignerTaskItem) => {
    setEditingTaskId(task.id);
    setEditForm({
      title: task.title,
      description: task.description,
      instruction: '',
      storyPoints: String(task.story_point),
      projectId: '',
      deadline: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
      telegramScreenshot: '',
      is_public: task.is_public ?? false,
      assigned_to_user_id: task.assigned_to_user_id || '',
    });
    setEditImagePreview(null);
    editImageFileRef.current = null;
    setEditFormErrors({});
    setEditError('');
    setShowEditTask(true);
    userApi.getDesigners().then((res) => {
      if (res.success) setDesigners(res.data);
    }).catch(() => {});
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
        setTaskSuccessMsg(response.message || 'Designer task updated successfully');
        setShowEditTask(false);
        setEditingTaskId(null);
        setEditFormErrors({});
        await fetchTasks(apiPage, true);
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
        setTaskSuccessMsg(response.message || 'Designer task deleted successfully');
        setShowDeleteConfirm(false);
        setDeletingTaskId(null);
        await fetchTasks(apiPage, true);
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

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, status: newStatus as string } : task))
    );
    setEditingTask(null);
  };

  const getDisplayProgress = (taskId: string): Record<PhaseKey, PhaseData> => {
    return submissionProgress[taskId] || defaultTaskProgress();
  };

  const isFinalStageApproved = (taskId: string): boolean => {
    return isFinalStageApprovedFromProgress(getDisplayProgress(taskId));
  };

  const getCurrentPhaseInfo = (task: DesignerTaskItem) => {
    // If task is paused, show the current stage with paused status
    if (task.is_paused) {
      const found = PHASES.find((p) => p.backendStage === task.stage);
      return {
        currentPhaseKey: (found?.key ?? null) as PhaseKey | null,
        currentPhaseLabel: found?.label ?? (task.stage || ''),
        currentPhaseStatus: 'paused' as PhaseHistoryEntry['status'],
      };
    }

    // Find the latest review across all phases to determine the most relevant stage/status
    const swr = task.submissionsWithReviews;
    const stageLabels = ['Case Study', 'Design Stage', 'Rendering', 'Final Stage'];
    const stageKeys: PhaseKey[] = ['caseStudy', 'designStage', 'rendering', 'finalStage'];
    const stages = swr ? [swr.caseStudy || [], swr.designing || [], swr.rendering || [], swr.finalStage || []] : [[], [], [], []];
    let latestReviewTs = 0;
    let latestPhaseKey: PhaseKey | null = null;
    let latestPhaseLabel = '';
    let latestReviewOutcome: string | null = null;

    for (let si = 0; si < stages.length; si++) {
      for (const s of stages[si]) {
        for (const r of (s.reviews || [])) {
          const rTs = new Date(r.created_at).getTime();
          if (rTs > latestReviewTs) {
            latestReviewTs = rTs;
            latestPhaseKey = stageKeys[si];
            latestPhaseLabel = stageLabels[si];
            latestReviewOutcome = r.review_outcome;
          }
        }
      }
    }

    // If there's a review, use its stage and outcome; otherwise fall back to backend task stage/status
    if (latestReviewOutcome) {
      return {
        currentPhaseKey: latestPhaseKey,
        currentPhaseLabel: latestPhaseLabel,
        currentPhaseStatus: latestReviewOutcome as PhaseHistoryEntry['status'],
      };
    }

    const found = PHASES.find((p) => p.backendStage === task.stage);
    const currentPhaseKey: PhaseKey | null = found?.key ?? null;
    const currentPhaseLabel = found?.label ?? (task.stage || '');
    const apiStatus = task.status;
    let currentPhaseStatus: PhaseHistoryEntry['status'] | 'pending' = 'pending';
    if (apiStatus === 'approved' || apiStatus === 'rejected') {
      currentPhaseStatus = apiStatus;
    } else if (apiStatus === 'feedback') {
      currentPhaseStatus = 'feedback';
    }
    return { currentPhaseKey, currentPhaseLabel, currentPhaseStatus };
  };

  const getLatestActivity = (task: DesignerTaskItem): {
    description: string;
    kind: 'review' | 'submission';
    outcome: string;
    stage?: string;
  } | null => {
    const raw = task.submissionsWithReviews;
    if (!raw) return null;
    const stageLabels = ['Case Study', 'Design Stage', 'Rendering', 'Final Stage'];
    const stages = [raw.caseStudy || [], raw.designing || [], raw.rendering || [], raw.finalStage || []];
    let latestTs = 0;
    let latest: { description: string; kind: 'review' | 'submission'; outcome: string; stage?: string } | null = null;
    for (let si = 0; si < stages.length; si++) {
      const submissions = stages[si];
      const stageLabel = stageLabels[si];
      for (const s of submissions) {
        const sTs = Math.max(new Date(s.created_at).getTime(), s.updated_at ? new Date(s.updated_at).getTime() : 0);
        if (sTs > latestTs) {
          latestTs = sTs;
          latest = { description: s.description || '', kind: 'submission', outcome: 'pending', stage: stageLabel };
        }
        for (const r of (s.reviews || [])) {
          const rTs = Math.max(new Date(r.created_at).getTime(), r.updated_at ? new Date(r.updated_at).getTime() : 0);
          if (rTs > latestTs) {
            latestTs = rTs;
            latest = { description: r.description || '', kind: 'review', outcome: r.review_outcome, stage: stageLabel };
          }
        }
      }
    }
    return latest;
  };

  const openDetail = (task: DesignerTaskItem) => {
    setSelectedTaskDetail(task);
    setShowDetail(true);
    setExpandedPhase('caseStudy');

    setFeedbackDrafts((prev) => ({
      ...prev,
      [task.id]: { caseStudy: '', designStage: '', rendering: '', finalStage: '' },
    }));
    setExpandedHistoryIdx((prev) => ({
      ...prev,
      [task.id]: { caseStudy: null, designStage: null, rendering: null, finalStage: null },
    }));

    // Use submissions data already embedded in the task response
    const swr = task.submissionsWithReviews;
    if (swr) {
      const apiProgress = apiSubmissionsToProgress(swr);
      setSubmissionProgress((prev) => {
        const existing = prev[task.id] || defaultTaskProgress();
        const merged: Record<PhaseKey, PhaseData> = {} as Record<PhaseKey, PhaseData>;
        for (const phase of PHASES) {
          const apiPhase = apiProgress[phase.key];
          const existingPhase = existing[phase.key] || defaultPhase();
          merged[phase.key] = {
            note: apiPhase?.note || existingPhase.note,
            screenshot: apiPhase?.screenshot || existingPhase.screenshot,
            history: apiPhase?.history?.length ? apiPhase.history : existingPhase.history || [],
          };
        }
        return { ...prev, [task.id]: merged };
      });
    }

    // Bulk-mark notification IDs from submissions & reviews
    const notifIds: string[] = [];
    const topNotif = (task as any).taskNotification;
    if (topNotif?.hasNotification && topNotif.notificationId && !markedTaskNotificationIds.has(topNotif.notificationId)) {
      notifIds.push(topNotif.notificationId);
    }
    if (swr?.taskNotification?.hasNotification && swr.taskNotification.notificationId && !markedTaskNotificationIds.has(swr.taskNotification.notificationId)) {
      notifIds.push(swr.taskNotification.notificationId);
    }
    const stages: (keyof SubmissionsWithReviewsData)[] = ['caseStudy', 'designing', 'rendering', 'finalStage'];
    for (const stage of stages) {
      const subs: SubmissionItem[] = (swr as any)?.[stage] || [];
      for (const sub of subs) {
        if (sub.hasNotification && sub.notificationId) notifIds.push(sub.notificationId);
        for (const r of sub.reviews || []) {
          if (r.hasNotification && r.notificationId) notifIds.push(r.notificationId);
        }
      }
    }

    if (notifIds.length > 0) {
      notificationApi.bulkMarkRead(notifIds).catch(() => {});

      const clearedSwr = swr
        ? {
            ...swr,
            taskNotification: { hasNotification: false, notificationId: null },
            caseStudy: (swr.caseStudy || []).map(stripSubmissionNotifications),
            designing: (swr.designing || []).map(stripSubmissionNotifications),
            rendering: (swr.rendering || []).map(stripSubmissionNotifications),
            finalStage: (swr.finalStage || []).map(stripSubmissionNotifications),
          }
        : swr;

      const clearedTask = { ...task, taskNotification: null, hasNestedNotification: false, submissionsWithReviews: clearedSwr } as DesignerTaskItem;
      setSelectedTaskDetail(clearedTask);

      const updatedTasks = tasksRef.current.map((t) =>
        t.id === task.id ? clearedTask : t
      );
      setTasks(updatedTasks);
      tasksRef.current = updatedTasks;

      markPendingReviewCardsViewed([task.id]);
      const newNotifIds = new Set(
        updatedTasks
          .filter((t) => designerTaskHasAnyNotification(t))
          .map((t) => t.id)
      );
      setDesignerAssignmentNotificationIds(newNotifIds);
    }
  };

  const closeDetail = () => {
    setSelectedTaskDetail(null);
    setShowDetail(false);
    setExpandedPhase(null);
  };

  const addHistoryEntry = (taskId: string, phase: PhaseKey, entry: Omit<PhaseHistoryEntry, 'designerSubmission'>) => {
    setSubmissionProgress((prev) => {
      const taskProgress = prev[taskId] ?? defaultTaskProgress();
      const phaseData = taskProgress[phase] ?? defaultPhase();
      const phaseLabel = PHASES.find((candidate) => candidate.key === phase)?.label ?? phase;
      const designerSubmission = buildDesignerSubmissionSnapshot(phaseLabel, phaseData, entry.timestamp);
      const fullEntry: PhaseHistoryEntry = { ...entry, designerSubmission };
      return {
        ...prev,
        [taskId]: {
          ...taskProgress,
          [phase]: {
            ...phaseData,
            history: [...(phaseData.history || []), fullEntry],
          },
        },
      };
    });
  };

  const resetPhaseHistory = (taskId: string, phase: PhaseKey) => {
    setSubmissionProgress((prev) => {
      const taskProgress = prev[taskId];
      if (!taskProgress) return prev;
      return {
        ...prev,
        [taskId]: {
          ...taskProgress,
          [phase]: { ...taskProgress[phase], history: [] },
        },
      };
    });
  };

  const updateDraft = (taskId: string, phase: PhaseKey, text: string) => {
    setFeedbackDrafts((prev) => ({
      ...prev,
      [taskId]: { ...prev[taskId], [phase]: text },
    }));
  };

  const handleSubmitFeedback = async (taskId: string, phase: PhaseKey) => {
    const draft = feedbackDrafts[taskId]?.[phase] ?? '';
    await submitReview(taskId, phase, draft, 'feedback');
  };

  const handleApprove = async (taskId: string, phase: PhaseKey) => {
    const draft = feedbackDrafts[taskId]?.[phase] ?? '';
    await submitReview(taskId, phase, draft, 'approved');
  };

  const handleReject = async (taskId: string, phase: PhaseKey) => {
    const draft = feedbackDrafts[taskId]?.[phase]?.trim();
    if (!draft) return;
    await submitReview(taskId, phase, draft, 'rejected');
  };

  const handleReset = async (taskId: string, phase: PhaseKey) => {
    // Reset locally for now — backend may not have a reset endpoint
    resetPhaseHistory(taskId, phase);
  };

  const submitReview = async (taskId: string, phase: PhaseKey, message: string, outcome: string) => {
    if (!selectedTaskDetail?.submissionsWithReviews) return;
    const stageMap: Record<PhaseKey, string> = {
      caseStudy: 'caseStudy', designStage: 'designing', rendering: 'rendering', finalStage: 'finalStage',
    };
    const apiKey = stageMap[phase];
    const submissions: SubmissionItem[] = (selectedTaskDetail.submissionsWithReviews as any)[apiKey] || [];
    if (submissions.length === 0) return;
    const latestSubmission = submissions[submissions.length - 1];

    const errorKey = `${taskId}_${phase}`;
    setReviewError((prev) => ({ ...prev, [errorKey]: '' }));

    try {
      const payload = {
        description: message.trim() || `Review: ${outcome}`,
        review_outcome: outcome,
        task_state: selectedTaskDetail.task_state,
      };
      if (editingReviewId) {
        const editingSubmission = submissions.find((s) =>
          s.reviews?.some((r) => r.id === editingReviewId)
        );
        if (!editingSubmission) {
          setEditingReviewId(null);
          return;
        }
        await designerApi.updateReview(editingReviewId, {
          ...payload,
          submission_id: editingSubmission.id,
          task_id: taskId,
        });
        setEditingReviewId(null);
      } else {
        await designerApi.createReview(latestSubmission.id, payload);
      }
      updateDraft(taskId, phase, '');
      const refreshedTasks = await fetchTasks(apiPage, true);
      if (refreshedTasks) {
        const refreshed = refreshedTasks.find((t) => t.id === taskId);
        if (refreshed) {
          setSelectedTaskDetail(refreshed);
          if (refreshed.submissionsWithReviews) {
            const freshProgress = apiSubmissionsToProgress(refreshed.submissionsWithReviews);
            setSubmissionProgress((prev) => ({ ...prev, [taskId]: freshProgress }));
          }
        }
      }

      if (user) {
        const existing = loadQuantityReviewNotifications();
        const phaseLabel = PHASES.find((p) => p.key === phase)?.label || phase;
        saveQuantityReviewNotifications([
          createGeneralNotification({
            type: 'designer_review',
            taskId,
            actorRole: user.role,
            message: `Designer task reviewed: ${outcome} (${phaseLabel})`,
            description: `Review submitted for designer task ${selectedTaskDetail?.title || taskId} (${phaseLabel}: ${outcome})`,
          }),
          ...existing,
        ]);
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setReviewError((prev) => ({ ...prev, [errorKey]: msg || 'Unable to submit review. Please try again.' }));
    }
  };

  const toggleHistoryEntry = (taskId: string, phase: PhaseKey, idx: number | null) => {
    setExpandedHistoryIdx((prev) => {
      const taskIdx = prev[taskId] ?? { caseStudy: null, designStage: null, rendering: null, finalStage: null };
      if (idx === null) return { ...prev, [taskId]: { ...taskIdx, [phase]: null } };
      return { ...prev, [taskId]: { ...taskIdx, [phase]: taskIdx[phase] === idx ? null : idx } };
    });
  };

  const currentProgress = selectedTaskDetail
    ? getDisplayProgress(selectedTaskDetail.id)
    : null;

  const visiblePhases = (() => {
    const swr = selectedTaskDetail?.submissionsWithReviews;
    if (!swr) return [];
    const stageMap: Record<PhaseKey, keyof SubmissionsWithReviewsData> = {
      caseStudy: 'caseStudy',
      designStage: 'designing',
      rendering: 'rendering',
      finalStage: 'finalStage',
    };
    return PHASES.filter((p) => {
      const subs = (swr as any)[stageMap[p.key]] as SubmissionItem[] | undefined;
      return subs && subs.length > 0;
    });
  })();

  const assignedTasks = tasks.filter((task) => !!task.assigned_to_user_id);
  // Sort by latest activity (task, submission, or review timestamps) descending
  const sortedTasks = [...assignedTasks].sort((a, b) => {
    const getLatestTs = (t: DesignerTaskItem): number => {
      let max = Math.max(
        new Date(t.created_at).getTime(),
        t.updated_at ? new Date(t.updated_at).getTime() : 0
      );
      const swr = t.submissionsWithReviews;
      if (swr) {
        const stages = [swr.caseStudy || [], swr.designing || [], swr.rendering || [], swr.finalStage || []];
        for (const submissions of stages) {
          for (const s of submissions) {
            if (s.created_at) max = Math.max(max, new Date(s.created_at).getTime());
            if (s.updated_at) max = Math.max(max, new Date(s.updated_at).getTime());
            for (const r of (s.reviews || [])) {
              if (r.created_at) max = Math.max(max, new Date(r.created_at).getTime());
              if (r.updated_at) max = Math.max(max, new Date(r.updated_at).getTime());
            }
          }
        }
      }
      return max;
    };
    return getLatestTs(b) - getLatestTs(a);
  });

  // ── Rating helpers ──
  const initializeRatingsForTask = (taskId: string) => {
    setReviewRatings((prev) => {
      if (prev[taskId]) return prev;
      return { ...prev, [taskId]: { creativity: 0, timeliness: 0, clientUnderstanding: 0, rendering: 0 } };
    });
  };

  const updateRating = (taskId: string, criterion: keyof typeof reviewRatings[string], value: number) => {
    const clamped = Math.min(5, Math.max(0, value));
    setReviewRatings((prev) => ({
      ...prev,
      [taskId]: { ...prev[taskId], [criterion]: clamped },
    }));
  };

  const submitRating = async (taskId: string) => {
    const ratings = reviewRatings[taskId];
    const comment = reviewComments[taskId]?.trim() || '';
    if (!ratings) return;

    setReviewSubmitting((prev) => ({ ...prev, [taskId]: true }));
    try {
      const existingId = taskReviewIds[taskId];

      if (existingId) {
        // Update existing review via API
        const response = await designerApi.updateTaskReview(existingId, {
          Creativity: ratings.creativity,
          Timeliness: ratings.timeliness,
          Rendering_quality: ratings.rendering,
          Client_understanding: ratings.clientUnderstanding,
          description: comment || undefined,
        });
        if (response.success && response.data) {
          const reviewerName = user?.full_name || 'CEO';
          const newReview: ReviewData = {
            reviewerName,
            reviewText: comment,
            ratings: { ...ratings },
            submittedAt: response.data.submittedAt,
          };
          setReviews((prev) => ({ ...prev, [taskId]: newReview }));
          setRatingSubmitted((prev) => ({ ...prev, [taskId]: true }));
        }
      } else {
        // Create new review via API
        const response = await designerApi.createTaskReview(taskId, {
          Creativity: ratings.creativity,
          Timeliness: ratings.timeliness,
          Rendering_quality: ratings.rendering,
          Client_understanding: ratings.clientUnderstanding,
          description: comment || undefined,
        });
        if (response.success && response.data) {
          const reviewerName = user?.full_name || 'CEO';
          const newReview: ReviewData = {
            reviewerName,
            reviewText: comment,
            ratings: { ...ratings },
            submittedAt: response.data.submittedAt,
          };
          setReviews((prev) => ({ ...prev, [taskId]: newReview }));
          setTaskReviewIds((prev) => ({ ...prev, [taskId]: response.data!.id }));
          setRatingSubmitted((prev) => ({ ...prev, [taskId]: true }));
        }
      }
    } catch {
      // Fallback to localStorage only
      const reviewerName = user?.full_name || 'CEO';
      const newReview: ReviewData = {
        reviewerName,
        reviewText: comment,
        ratings: { ...ratings },
        submittedAt: new Date().toISOString(),
      };
      setReviews((prev) => ({ ...prev, [taskId]: newReview }));
    } finally {
      setReviewSubmitting((prev) => ({ ...prev, [taskId]: false }));
      setReviewTaskId(null);
      setReviewComments((prev) => ({ ...prev, [taskId]: '' }));
    }
  };

  const toggleReviewPanel = (taskId: string) => {
    if (reviewTaskId === taskId) {
      setReviewTaskId(null);
      return;
    }

    // Check API-provided review first, then localStorage
    const task = tasks.find((t) => t.id === taskId);
    const apiReview = task?.taskReview;
    const existingReview = apiReview
      ? {
          reviewerName: apiReview.reviewerName,
          reviewText: apiReview.reviewText,
          ratings: apiReview.ratings,
          submittedAt: apiReview.submittedAt,
        }
      : reviews[taskId];

    if (existingReview) {
      setReviewRatings((prev) => ({
        ...prev,
        [taskId]: { ...existingReview.ratings },
      }));
      setReviewComments((prev) => ({ ...prev, [taskId]: existingReview.reviewText }));
      if (apiReview?.id) {
        setTaskReviewIds((prev) => ({ ...prev, [taskId]: apiReview.id }));
      }
    } else {
      initializeRatingsForTask(taskId);
      setReviewComments((prev) => ({ ...prev, [taskId]: '' }));
    }
    setReviewTaskId(taskId);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-col md:flex-row">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Designer Assignments</h2>
          <p className="text-gray-600 mt-1">
            Manage created designer tasks, assignments, and progress updates.
          </p>
          {highlightedIds.size > 0 && (
            <p className="text-sm text-blue-600 mt-2 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-semibold">
                {highlightedIds.size}
              </span>
              new pending review{highlightedIds.size > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      )}

      {/* Task Cards */}
      {sortedTasks.length === 0 && !isLoading ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No assigned designer tasks yet.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sortedTasks.slice(displayOffset, displayOffset + ROWS_PER_DISPLAY).map((task) => {
              const isHighlighted = highlightedIds.has(task.id);
              const isOverdue =
                task.due_date && new Date(task.due_date) < new Date() && task.status !== 'approved';

              const { currentPhaseKey, currentPhaseLabel, currentPhaseStatus } = getCurrentPhaseInfo(task);

              const finalStageApproved = isFinalStageApproved(task.id);
              const showReview = finalStageApproved;
              const apiReview = task.taskReview;
              const existingReview: ReviewData | null = apiReview
                ? {
                    reviewerName: apiReview.reviewerName,
                    reviewText: apiReview.reviewText,
                    ratings: apiReview.ratings,
                    submittedAt: apiReview.submittedAt,
                  }
                : reviews[task.id] || null;

              return (
                <div
                  key={task.id}
                  data-highlighted-id={isHighlighted ? task.id : undefined}
                  className={[
                    'bg-white rounded-xl p-6 shadow-sm border transition-all duration-300',
                    isHighlighted
                      ? 'border-2 border-blue-400 ring-4 ring-blue-100 shadow-blue-100'
                      : 'border-gray-200 hover:shadow-md',
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

                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{task.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Assigned to: {getAssigneeDisplayName(task)}
                      </p>
                    </div>
                    {task.is_paused ? (
                      <span className="px-2 py-1 rounded text-xs font-medium whitespace-nowrap bg-amber-100 text-amber-700">
                        {currentPhaseLabel || 'Current Stage'} - Paused
                      </span>
                    ) : currentPhaseKey ? (
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                          currentPhaseStatus === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : currentPhaseStatus === 'feedback'
                            ? 'bg-yellow-100 text-yellow-700'
                            : currentPhaseStatus === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {currentPhaseLabel} -{' '}
                        {currentPhaseStatus === 'approved'
                          ? 'Approved'
                          : currentPhaseStatus === 'feedback'
                          ? 'Feedback Given'
                          : currentPhaseStatus === 'rejected'
                          ? 'Rejected'
                          : 'Pending'}
                      </span>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${statusColorClass(task.status)}`}>
                        {statusDisplayName(task.status)}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
                      Story Points: {task.story_point}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                      Created by {getCreatorDisplayName(task)}
                    </span>
                    {task.assigned_to_user_id && (
                      <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                        Assigned to {getAssigneeDisplayName(task)}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-3">{task.description}</p>

                  <div className="flex items-center gap-3 mb-4">
                    <button
                      onClick={() => openDetail(task)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Open Submission Detail
                    </button>
                    {!hasDesignerSubmissions(task) && (
                      <button
                        onClick={() => openEditTask(task)}
                        className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit Task
                      </button>
                    )}
                    {canCreateTask && canDeleteDesignerTask(task) && (
                      <button
                        type="button"
                        onClick={() => openDeleteConfirm(task.id)}
                        className="text-sm text-red-600 hover:underline flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Task
                      </button>
                    )}
                  </div>

                  {/* Latest Activity - show pause reason when paused */}
                  {task.is_paused && task.pause_reason ? (
                    <div className="mb-4 p-3 rounded-lg border bg-amber-50 border-amber-200">
                      <div className="flex items-center gap-2 mb-2">
                        <PauseCircle className="w-4 h-4 text-amber-600" />
                        <p className="text-sm font-medium text-amber-700">Task Paused</p>
                      </div>
                      <p className="text-sm text-amber-800">{task.pause_reason}</p>
                    </div>
                  ) : (
                    (() => {
                      const activity = getLatestActivity(task);
                      if (!activity || !activity.description) return null;
                      const outcome = activity.outcome;
                      const isApproved = outcome === 'approved';
                      const isRejected = outcome === 'rejected';
                      const isFeedback = outcome === 'feedback';
                      const BadgeIcon = isApproved ? CheckCircle2 : isRejected ? XCircle : isFeedback ? AlertCircle : MessageSquare;
                      const containerColor = isApproved
                        ? 'bg-green-50 border-green-200'
                        : isRejected
                        ? 'bg-red-50 border-red-200'
                        : isFeedback
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-blue-50 border-blue-200';
                      const textColor = isApproved
                        ? 'text-green-700'
                        : isRejected
                        ? 'text-red-700'
                        : isFeedback
                        ? 'text-yellow-700'
                        : 'text-blue-700';
                      const iconColor = isApproved
                        ? 'text-green-600'
                        : isRejected
                        ? 'text-red-600'
                        : isFeedback
                        ? 'text-yellow-600'
                        : 'text-blue-600';
                      const statusLabel = isApproved ? 'Approved' : isRejected ? 'Rejected' : isFeedback ? 'Feedback Given' : 'Pending';
                      return (
                        <div className={`mb-4 p-3 rounded-lg border ${containerColor}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <BadgeIcon className={`w-4 h-4 ${iconColor}`} />
                            <p className={`text-sm font-medium ${textColor}`}>{statusLabel}</p>
                            {activity.stage && (
                              <span className="text-xs text-gray-400">in {activity.stage}</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700">{activity.description}</p>
                        </div>
                      );
                    })()
                  )}

                  <div className="space-y-2 text-sm">
                    {task.due_date && (
                      <div className={`flex items-center gap-2 ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                        <Calendar className="w-4 h-4" />
                        <span>Due: {new Date(task.due_date).toLocaleDateString()}{isOverdue && ' (Overdue)'}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>Created: {new Date(task.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Review Section */}
                  {showReview && (
                    <div className="mt-4 border-t pt-4">
                      {existingReview ? (
                        <div>
                          <div className="flex items-center gap-2 text-sm text-green-700 mb-2">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="font-medium">Reviewed by {existingReview.reviewerName}</span>
                            <span className="text-gray-500 text-xs">
                              {new Date(existingReview.submittedAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="mb-2">
                            <p className="text-xs font-medium text-gray-500">Ratings:</p>
                            <div className="flex flex-wrap gap-2 text-xs mt-1">
                              <span className="bg-gray-100 px-2 py-0.5 rounded-full">Creativity: {existingReview.ratings.creativity}</span>
                              <span className="bg-gray-100 px-2 py-0.5 rounded-full">Timeliness: {existingReview.ratings.timeliness}</span>
                              <span className="bg-gray-100 px-2 py-0.5 rounded-full">Client Understanding: {existingReview.ratings.clientUnderstanding}</span>
                              <span className="bg-gray-100 px-2 py-0.5 rounded-full">Rendering: {existingReview.ratings.rendering}</span>
                            </div>
                            <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-full text-xs font-semibold text-indigo-700">
                                <Star className="w-3 h-3 fill-indigo-500 text-indigo-500" />
                                Average: {(() => {
                                  const r = existingReview.ratings;
                                  return ((r.creativity + r.timeliness + r.clientUnderstanding + r.rendering) / 4).toFixed(1);
                                })()}
                              </span>
                            </div>
                          </div>
                          {existingReview.reviewText && (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-gray-500">Comment:</p>
                              <p className="text-sm text-gray-700 italic mt-1">"{existingReview.reviewText}"</p>
                            </div>
                          )}
                          <button
                            onClick={() => toggleReviewPanel(task.id)}
                            className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Edit Review
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => toggleReviewPanel(task.id)}
                          className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          <Star className="w-4 h-4" />
                          Review
                        </button>
                      )}

                      {reviewTaskId === task.id && (
                        <div className="mt-3 bg-gray-50 rounded-lg border border-gray-200 p-4">
                          <h6 className="text-sm font-semibold text-gray-700 mb-3">
                            {existingReview ? 'Edit Review' : 'Rate this task'}
                          </h6>
                          <div className="space-y-3">
                            {(
                              [
                                { key: 'creativity', label: 'Creativity' },
                                { key: 'timeliness', label: 'Timeliness' },
                                { key: 'clientUnderstanding', label: 'Client Understanding' },
                                { key: 'rendering', label: 'Rendering' },
                              ] as const
                            ).map(({ key, label }) => {
                              const rating = reviewRatings[task.id]?.[key] ?? 0;
                              const fillPercent = (rating / 5) * 100;
                              return (
                                <div key={key} className="flex items-center gap-3">
                                  <label className="text-sm text-gray-600 w-28 flex-shrink-0">{label}</label>
                                  <input
                                    type="range"
                                    min="0" max="5" step="0.1"
                                    value={rating}
                                    onChange={(e) => updateRating(task.id, key, parseFloat(e.target.value))}
                                    style={{ background: `linear-gradient(to right, #1d4ed8 ${fillPercent}%, #e5e7eb ${fillPercent}%)` }}
                                    className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                                  />
                                  <input
                                    type="number" min="0" max="5" step="0.1"
                                    value={rating}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      if (raw === '' || raw === '0') { updateRating(task.id, key, 0); return; }
                                      const val = parseFloat(raw);
                                      if (!isNaN(val)) updateRating(task.id, key, Math.min(val, 5));
                                    }}
                                    onFocus={(e) => { if (rating === 0) e.target.value = ''; }}
                                    onBlur={(e) => { if (e.target.value === '') updateRating(task.id, key, 0); }}
                                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                                  />
                                </div>
                              );
                            })}
                            <div className="pt-2">
                              <label className="text-sm text-gray-600 block mb-1">Review Comment (optional)</label>
                              <textarea
                                rows={2}
                                value={reviewComments[task.id] || ''}
                                onChange={(e) => setReviewComments((prev) => ({ ...prev, [task.id]: e.target.value }))}
                                placeholder="Add a written review..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                          <div className="mt-4 flex gap-2 justify-end">
                            <button onClick={() => setReviewTaskId(null)} disabled={reviewSubmitting[task.id]} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50">Cancel</button>
                            <button onClick={() => submitRating(task.id)} disabled={reviewSubmitting[task.id]} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                              {reviewSubmitting[task.id] ? 'Submitting...' : existingReview ? 'Update Review' : 'Submit Review'}
                            </button>
                          </div>
                          {ratingSubmitted[task.id] && (
                            <p className="text-xs text-green-600 mt-2">Review submitted successfully!</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {meta && (meta.totalPages > 1 || tasks.length > ROWS_PER_DISPLAY) && (
            <div className="flex items-center justify-center gap-4 py-4">
              <button
                onClick={goPrev}
                disabled={!canGoPrev}
                className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="text-sm text-gray-600">
                {isLeadership && tasks.length > ROWS_PER_DISPLAY
                  ? `Showing ${displayOffset + 1}–${Math.min(displayOffset + ROWS_PER_DISPLAY, tasks.length)} of ${meta.total}`
                  : `Page ${apiPage} of ${meta.totalPages} (${meta.total} total)`
                }
              </span>
              <button
                onClick={goNext}
                disabled={!canGoNext}
                className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {showDetail && selectedTaskDetail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 py-6 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">Submission Detail</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Review designer submissions and provide feedback
                </p>
                {submissionsLoading[selectedTaskDetail.id] && (
                  <p className="text-xs text-blue-600 mt-1">Loading submission data...</p>
                )}
              </div>
              <button onClick={closeDetail} className="rounded-lg p-2 hover:bg-gray-100">
                <XCircle className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 px-6 py-5 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-5">
                {/* Task Info */}
                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900">{selectedTaskDetail.title}</h4>
                      <p className="mt-1 text-sm text-gray-500">ID: {selectedTaskDetail.id}</p>
                    </div>
                    <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">
                      Story Points: {selectedTaskDetail.story_point}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                      Created by {getCreatorDisplayName(selectedTaskDetail)}
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                      Assigned to {getAssigneeDisplayName(selectedTaskDetail)}
                    </span>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColorClass(selectedTaskDetail.status)}`}>
                      {statusDisplayName(selectedTaskDetail.status)}
                    </span>
                  </div>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Description</h5>
                  <p className="mt-2 text-sm text-gray-700">{selectedTaskDetail.description}</p>
                </section>

                {selectedTaskDetail.attachment_urls && selectedTaskDetail.attachment_urls.length > 0 && (
                  <section className="rounded-xl border border-gray-200 bg-white p-4">
                    <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-3 flex items-center gap-2">
                      <Paperclip className="w-4 h-4" />
                      Task Attachments
                    </h5>
                    <AttachmentViewer attachments={selectedTaskDetail.attachment_urls} />
                  </section>
                )}

                {/* Submission Progress & Review */}
                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-4">
                    Submission Progress & Review
                  </h5>

                  {(() => {
                    // Find the latest review across ALL phases, not just the last populated one
                    const swr = selectedTaskDetail.submissionsWithReviews;
                    const stageLabels = ['Case Study', 'Design Stage', 'Rendering', 'Final Stage'];
                    const stages = swr ? [swr.caseStudy || [], swr.designing || [], swr.rendering || [], swr.finalStage || []] : [[], [], [], []];
                    let latestReview: { message: string; status: string; stageLabel: string; reviewerName: string } | null = null;
                    let latestReviewTs = 0;
                    for (let si = 0; si < stages.length; si++) {
                      for (const s of stages[si]) {
                        for (const r of (s.reviews || [])) {
                          const rTs = new Date(r.created_at).getTime();
                          if (rTs > latestReviewTs) {
                            latestReviewTs = rTs;
                            latestReview = {
                              message: r.description || '',
                              status: r.review_outcome,
                              stageLabel: stageLabels[si],
                              reviewerName: r.reviewer_user?.full_name || `Reviewer`,
                            };
                          }
                        }
                      }
                    }
                    if (latestReview) {
                      const status = latestReview.status;
                      const isApproved = status === 'approved';
                      const isRejected = status === 'rejected';
                      const isFeedback = status === 'feedback';
                      const BadgeIcon = isApproved ? CheckCircle2 : isRejected ? XCircle : AlertCircle;
                      const displayLabel = isApproved
                        ? `${latestReview.stageLabel} - Approved`
                        : isRejected
                        ? `${latestReview.stageLabel} - Rejected`
                        : `${latestReview.stageLabel} - Feedback`;
                      return (
                        <div className={`p-4 rounded-lg border mb-4 ${
                          isApproved ? 'bg-green-50 border-green-200' : isRejected ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            <BadgeIcon className={`w-4 h-4 ${isApproved ? 'text-green-600' : isRejected ? 'text-red-600' : 'text-yellow-600'}`} />
                            <p className="text-sm font-medium text-gray-800">{displayLabel}</p>
                            <span className="text-xs text-gray-400">by {latestReview.reviewerName}</span>
                          </div>
                          {latestReview.message && <p className="text-sm text-gray-700 italic">{latestReview.message}</p>}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {visiblePhases.length === 0 ? (
                    <p className="text-sm text-gray-500">No submission data yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {visiblePhases.map((phase) => {
                        const allStages = selectedTaskDetail.submissionsWithReviews
                          ? [
                              selectedTaskDetail.submissionsWithReviews.caseStudy || [],
                              selectedTaskDetail.submissionsWithReviews.designing || [],
                              selectedTaskDetail.submissionsWithReviews.rendering || [],
                              selectedTaskDetail.submissionsWithReviews.finalStage || [],
                            ]
                          : [[], [], [], []];
                        const allSubs = allStages.flat();
                        const taskId = selectedTaskDetail.id;
                        const isExpanded = expandedPhase === phase.key;
                        const draft = feedbackDrafts[taskId]?.[phase.key] ?? '';
                        const taskHistoryIdx = expandedHistoryIdx[taskId]?.[phase.key];

                        // Check if this phase has any notifications
                        const rawData = selectedTaskDetail.submissionsWithReviews;
                        const stageMap: Record<PhaseKey, string> = {
                          caseStudy: 'caseStudy', designStage: 'designing', rendering: 'rendering', finalStage: 'finalStage',
                        };
                        const apiKey = stageMap[phase.key];
                        const stageSubmissions: SubmissionItem[] = rawData ? (rawData as any)[apiKey] || [] : [];
                        const phaseHasNotification = stageSubmissions.some(
                          (s) => s.hasNotification || (s.reviews || []).some((r) => r.hasNotification)
                        );

                        // Find the latest review for this specific stage to show as the badge
                        let latestStageReviewOutcome: string | null = null;
                        for (const s of stageSubmissions) {
                          for (const r of (s.reviews || [])) {
                            if (!latestStageReviewOutcome) {
                              latestStageReviewOutcome = r.review_outcome;
                            }
                          }
                        }

                        const taskApproved = selectedTaskDetail.status === 'approved';
                        const updatedAt = selectedTaskDetail.updated_at ? new Date(selectedTaskDetail.updated_at).getTime() : 0;
                        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                        const canReview = !taskApproved || updatedAt > oneWeekAgo;

                        return (
                          <div key={phase.key} className={`border rounded-lg overflow-hidden ${phaseHasNotification ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}`}>
                            <button
                              type="button"
                              onClick={() => setExpandedPhase(isExpanded ? null : phase.key)}
                              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-medium text-gray-800">{phase.label}</span>
                                {phaseHasNotification && (
                                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                )}
                                {latestStageReviewOutcome && (() => {
                                  const outcome = latestStageReviewOutcome as string;
                                  const isApproved = outcome === 'approved';
                                  const isRejected = outcome === 'rejected';
                                  const badgeIcon = isApproved ? ThumbsUp : isRejected ? ThumbsDown : MessageSquare;
                                  const badgeColor = isApproved ? 'bg-green-100 text-green-700' : isRejected ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700';
                                  const badgeLabel = isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Feedback Given';
                                  return (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}>
                                      <badgeIcon className="w-3 h-3" />
                                      {badgeLabel}
                                    </span>
                                  );
                                })()}
                              </div>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                            </button>

                            {isExpanded && (
                              <div className="p-4 space-y-4 bg-white">
                                {/* ── Submissions list per phase (expandable, reviews nested) ── */}
                                {stageSubmissions.length > 0 && (
                                  <div>
                                    <h6 className="text-sm font-medium text-gray-700 mb-3">
                                      {stageSubmissions.length} Submission{stageSubmissions.length !== 1 ? 's' : ''}
                                    </h6>
                                    <div className="space-y-2">
                                      {stageSubmissions.map((sub, sIdx) => {
                                        const isSubExpanded = taskHistoryIdx === sIdx;
                                        const subReviewCount = (sub.reviews || []).length;
                                        return (
                                          <div key={sub.id} className={`border rounded-lg overflow-hidden ${sub.hasNotification ? 'border-blue-400 ring-1 ring-blue-100' : 'border-gray-200'}`}>
                                            <button
                                              type="button"
                                              onClick={() => toggleHistoryEntry(taskId, phase.key, isSubExpanded ? null : sIdx)}
                                              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                                            >
                                              <div className="flex items-center gap-2 min-w-0">
                                                {sub.hasNotification && (
                                                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                                                )}
                                                <span className="text-xs font-medium text-gray-700">Submission {sIdx + 1}</span>
                                                <span className="text-xs text-gray-500">
                                                  {new Date(sub.created_at).toLocaleString()}
                                                </span>
                                                {subReviewCount > 0 && (
                                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                                                    {subReviewCount} review{subReviewCount !== 1 ? 's' : ''}
                                                  </span>
                                                )}
                                              </div>
                                              {isSubExpanded ? (
                                                <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                                              ) : (
                                                <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                                              )}
                                            </button>
                                            {isSubExpanded && (
                                              <div className="px-3 py-3 space-y-3 bg-white">
                                                {sub.description && (
                                                  <div>
                                                    <h6 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Note</h6>
                                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{sub.description}</p>
                                                  </div>
                                                )}
                                                {sub.attachment_urls && sub.attachment_urls.length > 0 && (
                                                  <div>
                                                    <h6 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Attachments</h6>
                                                    <AttachmentViewer attachments={sub.attachment_urls} />
                                                  </div>
                                                )}
                                                {subReviewCount > 0 && (
                                                  <div className="border-t border-gray-100 pt-3 space-y-2">
                                                    <span className="text-xs font-medium text-gray-500 uppercase">Reviews</span>
                                                      {sub.reviews.map((review) => {
                                                        const isRApproved = review.review_outcome === 'approved';
                                                        const isRRejected = review.review_outcome === 'rejected';
                                                        const RIcon = isRApproved ? ThumbsUp : isRRejected ? ThumbsDown : MessageSquare;
                                                        const RColor = isRApproved ? 'bg-green-100 text-green-700' : isRRejected ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700';
                                                        const RIcColor = isRApproved ? 'text-green-600' : isRRejected ? 'text-red-600' : 'text-yellow-600';
                                                        const RLabel = isRApproved ? 'Approved' : isRRejected ? 'Rejected' : 'Feedback';
                                                        const reviewTs = new Date(review.created_at).getTime();
                                                        const hoursSinceCreation = (Date.now() - reviewTs) / (1000 * 60 * 60);
                                                        const hasNewerReview = allSubs.some((s) =>
                                                          (s.reviews || []).some((r) => new Date(r.created_at).getTime() > reviewTs)
                                                        );
                                                        const hasNewerSubmission = allSubs.some((s) =>
                                                          new Date(s.created_at).getTime() > reviewTs
                                                        );
                                                        const canEditReview = review.reviewer_user_id === user?.id
                                                          && selectedTaskDetail.task_state === 'active'
                                                          && !hasNewerReview
                                                          && !hasNewerSubmission;
                                                        return (
                                                        <div key={review.id} className={`border rounded-lg overflow-hidden ${review.hasNotification ? 'border-blue-400 ring-1 ring-blue-100' : 'border-gray-200'}`}>
                                                          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50">
                                                            {review.hasNotification && (
                                                              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                                            )}
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${RColor}`}>
                                                              <RIcon className={`w-3 h-3 ${RIcColor}`} />
                                                              {RLabel}
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                              {new Date(review.created_at).toLocaleString()}
                                                            </span>
                                                            <span className="text-xs text-gray-400">
                                                              by {review.reviewer_user?.full_name || `User ${review.reviewer_user_id.slice(0, 8)}`}
                                                            </span>
                                                            {canEditReview && (
                                                              <button
                                                                type="button"
                                                                onClick={() => {
                                                                  setEditingReviewId(review.id);
                                                                  updateDraft(taskId, phase.key, review.description || '');
                                                                }}
                                                                className="ml-auto flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                                              >
                                                                <Edit className="w-3 h-3" /> Edit
                                                              </button>
                                                            )}
                                                          </div>
                                                          {review.description && (
                                                            <div className="px-3 py-2">
                                                              <p className="text-sm text-gray-800 whitespace-pre-wrap">{review.description}</p>
                                                            </div>
                                                          )}
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                )}
                                                {/* Review & Decision for this submission */}
                                                {canReview && (
                                                <div className="border-t border-gray-100 pt-3">
                                                  <h6 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                                    {editingReviewId ? 'Update Review' : 'Review &amp; Decision'}
                                                  </h6>
                                                  <textarea
                                                    rows={2}
                                                    value={draft}
                                                    onChange={(e) => updateDraft(taskId, phase.key, e.target.value)}
                                                    placeholder="Your feedback or reason..."
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm mb-2"
                                                  />
                                                  <div className="flex flex-wrap gap-2">
                                                      <button onClick={() => handleApprove(taskId, phase.key)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-300 hover:bg-green-100 transition-colors">
                                                        <ThumbsUp className="w-3.5 h-3.5" /> Approve
                                                      </button>
                                                      <button onClick={() => handleReject(taskId, phase.key)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-300 hover:bg-red-100 transition-colors">
                                                        <ThumbsDown className="w-3.5 h-3.5" /> Reject
                                                      </button>
                                                    <button onClick={() => handleSubmitFeedback(taskId, phase.key)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100 transition-colors">
                                                      <Send className="w-3.5 h-3.5" /> {editingReviewId ? 'Update Feedback' : 'Feedback'}
                                                    </button>
                                                    {editingReviewId && (
                                                      <button
                                                        onClick={() => {
                                                          setEditingReviewId(null);
                                                          updateDraft(taskId, phase.key, '');
                                                        }}
                                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200 transition-colors"
                                                      >
                                                        Cancel
                                                      </button>
                                                    )}
                                                  </div>
                                                  {reviewError[`${taskId}_${phase.key}`] && (
                                                    <p className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{reviewError[`${taskId}_${phase.key}`]}</p>
                                                  )}
                                                </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                {stageSubmissions.length === 0 && (
                                  <p className="text-sm text-gray-400 italic">No submissions for this phase yet.</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>

              <aside className="space-y-4">
                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Timeline</h5>
                  <div className="mt-2 space-y-2 text-sm text-gray-700">
                    <p>Deadline: {selectedTaskDetail.due_date ? new Date(selectedTaskDetail.due_date).toLocaleDateString() : 'No deadline'}</p>
                    <p>Created: {new Date(selectedTaskDetail.created_at).toLocaleDateString()}</p>
                    <p>Assigned by: {getCreatorDisplayName(selectedTaskDetail)}</p>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditTask && editingTaskId && canCreateTask && (
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
              {/* Title */}
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

              {/* Description */}
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

              {/* Story Points */}
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

              {/* Assign To */}
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

              {/* Is Public */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="edit_is_public"
                  checked={editForm.is_public}
                  onChange={(event) => setEditForm({ ...editForm, is_public: event.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={isUpdating}
                />
                <label htmlFor="edit_is_public" className="text-sm font-medium text-gray-700">
                  Public Task (visible to all designers)
                </label>
              </div>

              {/* Telegram Screenshot */}
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

              {/* Instruction */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instruction (optional)</label>
                <textarea
                  rows={4} value={editForm.instruction}
                  onChange={(event) => setEditForm({ ...editForm, instruction: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe what the designer must collect or measure" disabled={isUpdating}
                />
              </div>

              {/* Deadline */}
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

export default DesignerAssignments;