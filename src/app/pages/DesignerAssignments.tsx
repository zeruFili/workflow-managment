import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from './designerAssignmentHighlights';
import designerApi, {
  DesignerTaskItem,
  DesignerTaskListMeta,
  SubmissionItem,
  SubmissionsWithReviewsData,
} from '../../api/designerApi';
import { DesignerTaskApplication, TaskStatus } from '../types';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Edit,
  Image,
  Plus,
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
} from 'lucide-react';

const emptyNewTask = {
  title: '',
  description: '',
  instruction: '',
  storyPoints: '',
  projectId: '',
  deadline: '',
  telegramScreenshot: '',
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
    const submissions: SubmissionItem[] = (data as Record<string, SubmissionItem[]>)[apiStage] || [];
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
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<DesignerTaskItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [tasks, setTasks] = useState<DesignerTaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applications, setApplications] = useState<DesignerTaskApplication[]>(loadDesignerApplications);
  const [newTask, setNewTask] = useState(emptyNewTask);
  const [newTaskImagePreview, setNewTaskImagePreview] = useState<string | null>(null);
  const newTaskImageFileRef = useRef<File | null>(null);
  const [newTaskError, setNewTaskError] = useState('');

  // Pagination
  const [apiPage, setApiPage] = useState(1);
  const [meta, setMeta] = useState<DesignerTaskListMeta | null>(null);
  const [displayOffset, setDisplayOffset] = useState(0);

  const [submissionProgress, setSubmissionProgress] = useState<SubmissionProgress>(loadSubmissionProgress);
  const [submissionsLoading, setSubmissionsLoading] = useState<Record<string, boolean>>({});
  const [expandedPhase, setExpandedPhase] = useState<PhaseKey | null>(null);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, Record<PhaseKey, string>>>({});
  const [expandedHistoryIdx, setExpandedHistoryIdx] = useState<Record<string, Record<PhaseKey, number | null>>>({});

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

  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(
    new Set(Array.from(getPendingReviewHighlightedIds()))
  );

  // IntersectionObserver
  const seenThisSession = useRef<Set<string>>(new Set());
  const observedElements = useRef<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const tasksRef = useRef<DesignerTaskItem[]>([]);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  // Role-based limits
  const isLeadership = user?.role === 'ceo' || user?.role === 'general_manager';
  const apiLimit = isLeadership ? 20 : 10;

  // ── Fetch tasks from API ──
  const fetchTasks = useCallback(async (page: number) => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await designerApi.getDesignerTasks({ page, limit: apiLimit });
      if (response.success) {
        setTasks(response.data);
        setMeta(response.meta);
        setDisplayOffset(0);

        // Compute highlighted task IDs from notifications
        const notifIds = new Set(
          response.data
            .filter((t) => t.submissionsWithReviews?.taskNotification?.hasNotification || t.hasNestedNotification)
            .map((t) => t.id)
        );
        setDesignerAssignmentNotificationIds(notifIds);
        setHighlightedIds(new Set([...notifIds]));
      } else {
        setError(response.message || 'Failed to load tasks');
      }
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
      if (seenThisSession.current.size === 0) return;
      seenThisSession.current.forEach((id) => {
        markPendingReviewCardsViewed([id]);
      });
      seenThisSession.current.clear();
      observedElements.current.clear();
      setHighlightedIds(new Set([...getPendingReviewHighlightedIds()]));
      publishDesignerAssignmentsBadgeCount(getPendingReviewCount());
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

  const handleNewTaskImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (newTaskImagePreview) URL.revokeObjectURL(newTaskImagePreview);
    newTaskImageFileRef.current = file;
    const objectUrl = URL.createObjectURL(file);
    setNewTaskImagePreview(objectUrl);
    setNewTask((prev) => ({ ...prev, telegramScreenshot: '' }));
  };

  const createTask = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = newTask.title.trim();
    const description = newTask.description.trim();
    if (!title || !description) {
      setNewTaskError('Title and Description are required.');
      return;
    }

    let telegramScreenshot: string | undefined;
    const file = newTaskImageFileRef.current;
    if (file) {
      telegramScreenshot = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Unable to read file'));
        reader.readAsDataURL(file);
      });
    }

    // Create task locally (stored to list state)
    const nextTask: DesignerTaskItem = {
      id: `dtask-${Date.now()}`,
      title,
      description,
      story_point: Number(newTask.storyPoints),
      assigned_by_user_id: user.id,
      assigned_by_user: { id: user.id, full_name: user.full_name, role: user.role },
      assigned_to_user_id: null,
      assigned_to_user: null,
      updated_by_user: null,
      status: 'pending',
      stage: null,
      is_paused: false,
      is_public: true,
      task_state: 'active',
      due_date: newTask.deadline || null,
      attachment_urls: telegramScreenshot ? [telegramScreenshot] : null,
      updated_by: null,
      created_at: new Date().toISOString(),
      updated_at: null,
    };

    persistTasks([nextTask, ...tasks]);
    if (newTaskImagePreview) URL.revokeObjectURL(newTaskImagePreview);
    setNewTask(emptyNewTask);
    setNewTaskImagePreview(null);
    newTaskImageFileRef.current = null;
    setNewTaskError('');
    setShowCreateTask(false);
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
  } | null => {
    const raw = task.submissionsWithReviews;
    if (!raw) return null;
    let latestTs = 0;
    let latest: { description: string; kind: 'review' | 'submission'; outcome: string } | null = null;
    const stages = [raw.caseStudy || [], raw.designing || [], raw.rendering || [], raw.finalStage || []];
    for (const submissions of stages) {
      for (const s of submissions) {
        const sTs = Math.max(new Date(s.created_at).getTime(), s.updated_at ? new Date(s.updated_at).getTime() : 0);
        if (sTs > latestTs) {
          latestTs = sTs;
          latest = { description: s.description || '', kind: 'submission', outcome: 'pending' };
        }
        for (const r of (s.reviews || [])) {
          const rTs = Math.max(new Date(r.created_at).getTime(), r.updated_at ? new Date(r.updated_at).getTime() : 0);
          if (rTs > latestTs) {
            latestTs = rTs;
            latest = { description: r.description || '', kind: 'review', outcome: r.review_outcome };
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

  const handleSubmitFeedback = (taskId: string, phase: PhaseKey) => {
    const draft = feedbackDrafts[taskId]?.[phase] ?? '';
    addHistoryEntry(taskId, phase, {
      status: 'feedback',
      message: draft.trim() || '(No message)',
      timestamp: new Date().toISOString(),
      hasNotification: false,
    });
    updateDraft(taskId, phase, '');
  };

  const handleApprove = (taskId: string, phase: PhaseKey) => {
    const draft = feedbackDrafts[taskId]?.[phase] ?? '';
    addHistoryEntry(taskId, phase, {
      status: 'approved',
      message: draft.trim() || 'Approved',
      timestamp: new Date().toISOString(),
      hasNotification: false,
    });
    updateDraft(taskId, phase, '');
  };

  const handleReject = (taskId: string, phase: PhaseKey) => {
    const draft = feedbackDrafts[taskId]?.[phase]?.trim();
    if (!draft) return;
    addHistoryEntry(taskId, phase, {
      status: 'rejected',
      message: draft,
      timestamp: new Date().toISOString(),
      hasNotification: false,
    });
    updateDraft(taskId, phase, '');
  };

  const handleReset = (taskId: string, phase: PhaseKey) => {
    resetPhaseHistory(taskId, phase);
  };

  const toggleHistoryEntry = (taskId: string, phase: PhaseKey, idx: number) => {
    setExpandedHistoryIdx((prev) => {
      const taskIdx = prev[taskId] ?? { caseStudy: null, designStage: null, rendering: null, finalStage: null };
      return { ...prev, [taskId]: { ...taskIdx, [phase]: taskIdx[phase] === idx ? null : idx } };
    });
  };

  const currentProgress = selectedTaskDetail
    ? getDisplayProgress(selectedTaskDetail.id)
    : null;

  const lastPopulatedIdx = getLastPopulatedPhaseIndex(currentProgress);
  const visiblePhases = lastPopulatedIdx >= 0 ? PHASES.slice(0, lastPopulatedIdx + 1) : [];

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

  const submitRating = (taskId: string) => {
    const ratings = reviewRatings[taskId];
    const comment = reviewComments[taskId]?.trim() || '';
    if (!ratings) return;

    const reviewerName = user?.full_name || 'CEO';
    const newReview: ReviewData = {
      reviewerName,
      reviewText: comment,
      ratings: { ...ratings },
      submittedAt: new Date().toISOString(),
    };

    setReviews((prev) => ({ ...prev, [taskId]: newReview }));
    setReviewTaskId(null);
    setReviewComments((prev) => ({ ...prev, [taskId]: '' }));
  };

  const toggleReviewPanel = (taskId: string) => {
    if (reviewTaskId === taskId) {
      setReviewTaskId(null);
      return;
    }
    const existingReview = reviews[taskId];
    if (existingReview) {
      setReviewRatings((prev) => ({
        ...prev,
        [taskId]: { ...existingReview.ratings },
      }));
      setReviewComments((prev) => ({ ...prev, [taskId]: existingReview.reviewText }));
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
        {canCreateTask && (
          <button
            onClick={() => setShowCreateTask(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Create Designer Task</span>
          </button>
        )}
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
              const existingReview = reviews[task.id];

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
                    {currentPhaseKey ? (
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

                  <button
                    onClick={() => openDetail(task)}
                    className="mb-4 text-sm text-blue-600 hover:underline"
                  >
                    Open Submission Detail
                  </button>

                  {/* Latest Activity */}
                  {(() => {
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
                        </div>
                        <p className="text-sm text-gray-700">{activity.description}</p>
                      </div>
                    );
                  })()}

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
                            <button onClick={() => setReviewTaskId(null)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100">Cancel</button>
                            <button onClick={() => submitRating(task.id)} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                              {existingReview ? 'Update Review' : 'Submit Review'}
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

                {/* Submission Progress & Review */}
                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-4">
                    Submission Progress & Review
                  </h5>

                  {(() => {
                    const summaryIdx = getLastPopulatedPhaseIndex(currentProgress);
                    if (summaryIdx !== -1) {
                      const phaseKey = PHASES[summaryIdx].key;
                      const phaseLabel = PHASES[summaryIdx].label;
                      const phaseData = currentProgress?.[phaseKey];
                      if (phaseData) {
                        const history = phaseData.history ?? [];
                        if (history.length > 0) {
                          const latestEntry = history[history.length - 1];
                          const status = latestEntry.status;
                          const message = latestEntry.message;
                          const isApproved = status === 'approved';
                          const isRejected = status === 'rejected';
                          const isFeedback = status === 'feedback';
                          const BadgeIcon = isApproved ? CheckCircle2 : isRejected ? XCircle : AlertCircle;
                          const displayLabel = isApproved
                            ? `${phaseLabel} - Approved`
                            : isFeedback ? 'Feedback' : `${phaseLabel} - Rejected`;
                          return (
                            <div className={`p-4 rounded-lg border mb-4 ${
                              isApproved ? 'bg-green-50 border-green-200' : isRejected ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
                            }`}>
                              <div className="flex items-center gap-2 mb-2">
                                <BadgeIcon className={`w-4 h-4 ${isApproved ? 'text-green-600' : isRejected ? 'text-red-600' : 'text-yellow-600'}`} />
                                <p className="text-sm font-medium text-gray-800">{displayLabel}</p>
                              </div>
                              {message && <p className="text-sm text-gray-700 italic">"{message}"</p>}
                            </div>
                          );
                        }
                      }
                    }
                    return null;
                  })()}

                  {visiblePhases.length === 0 ? (
                    <p className="text-sm text-gray-500">No submission data yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {visiblePhases.map((phase) => {
                        const taskId = selectedTaskDetail.id;
                        const phaseData = currentProgress?.[phase.key] ?? defaultPhase();
                        const isExpanded = expandedPhase === phase.key;
                        const currentStatus = getCurrentStatus(phaseData);
                        const history = phaseData.history || [];
                        const draft = feedbackDrafts[taskId]?.[phase.key] ?? '';
                        const taskHistoryIdx = expandedHistoryIdx[taskId]?.[phase.key];

                        const statusBadge = {
                          feedback: { label: 'Feedback Given', icon: MessageSquare, color: 'bg-yellow-100 text-yellow-700' },
                          approved: { label: 'Approved', icon: ThumbsUp, color: 'bg-green-100 text-green-700' },
                          rejected: { label: 'Rejected', icon: ThumbsDown, color: 'bg-red-100 text-red-700' },
                          pending: { label: 'Pending Review', icon: Clock, color: 'bg-blue-100 text-blue-700' },
                        }[currentStatus];

                        // Check if this phase has any notifications
                        const rawData = selectedTaskDetail.submissionsWithReviews;
                        const stageMap: Record<PhaseKey, string> = {
                          caseStudy: 'caseStudy', designStage: 'designing', rendering: 'rendering', finalStage: 'finalStage',
                        };
                        const apiKey = stageMap[phase.key];
                        const stageSubmissions: SubmissionItem[] = rawData ? (rawData as Record<string, SubmissionItem[]>)[apiKey] || [] : [];
                        const phaseHasNotification = stageSubmissions.some(
                          (s) => s.hasNotification || (s.reviews || []).some((r) => r.hasNotification)
                        );

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
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.color}`}>
                                  <statusBadge.icon className="w-3 h-3" />
                                  {statusBadge.label}
                                </span>
                              </div>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                            </button>

                            {isExpanded && (
                              <div className="p-4 space-y-4 bg-white">
                                <div>
                                  <h6 className="text-sm font-medium text-gray-700 mb-1">Designer's Progress Note</h6>
                                  {phaseData.note ? (
                                    <div className="text-sm text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100 whitespace-pre-wrap">
                                      {phaseData.note}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-400 italic">No progress note submitted.</p>
                                  )}
                                </div>

                                <div>
                                  <h6 className="text-sm font-medium text-gray-700 mb-1">
                                    Telegram Screenshot{' '}
                                    {phase.key === 'finalStage' && <span className="text-red-500">(required)</span>}
                                    {phase.key !== 'finalStage' && <span className="text-gray-400 text-xs ml-1">(optional)</span>}
                                  </h6>
                                  {phaseData.screenshot ? (
                                    <div className="mt-2">
                                      <img src={phaseData.screenshot} alt={`${phase.label} evidence`} className="max-w-full h-auto max-h-64 rounded-lg border object-contain" />
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-400 italic">
                                      {phase.key === 'finalStage' ? 'No screenshot provided (required for final stage).' : 'No screenshot provided.'}
                                    </p>
                                  )}
                                </div>

                                {history.length > 0 && (
                                  <div className="border-t border-gray-100 pt-4">
                                    <h6 className="text-sm font-medium text-gray-700 mb-2">Prior Feedback Messages</h6>
                                    <div className="space-y-2">
                                      {history.map((entry, idxEntry) => {
                                        const isEntryExpanded = taskHistoryIdx === idxEntry;
                                        const entryBadge = entry.status === 'feedback' ? 'Feedback Given' : entry.status.charAt(0).toUpperCase() + entry.status.slice(1);
                                        const EntryIcon = entry.status === 'approved' ? ThumbsUp : entry.status === 'rejected' ? ThumbsDown : MessageSquare;
                                        const entryColor = entry.status === 'approved' ? 'bg-green-100 text-green-700' : entry.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700';
                                        return (
                                          <div key={idxEntry} className={`border rounded-lg overflow-hidden ${entry.hasNotification ? 'border-blue-400 ring-1 ring-blue-100' : 'border-gray-200'}`}>
                                            <button
                                              type="button"
                                              onClick={() => toggleHistoryEntry(taskId, phase.key, idxEntry)}
                                              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
                                            >
                                              <div className="flex items-center gap-2">
                                                {entry.hasNotification && (
                                                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                                )}
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${entryColor}`}>
                                                  <EntryIcon className="w-3 h-3" />{entryBadge}
                                                </span>
                                                <span className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleString()}</span>
                                              </div>
                                              {isEntryExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                                            </button>
                                            {isEntryExpanded && (
                                              <div className="p-3 bg-white space-y-3">
                                                <p className="text-sm text-gray-800 whitespace-pre-wrap font-medium">"{entry.message}"</p>
                                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Designer's Submission at this point</p>
                                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.designerSubmission.note || <span className="italic text-gray-400">No note</span>}</p>
                                                  {entry.designerSubmission.screenshot ? (
                                                    <img src={entry.designerSubmission.screenshot} alt="designer screenshot" className="mt-2 max-w-full h-auto max-h-40 rounded border object-contain" />
                                                  ) : (
                                                    <p className="text-xs text-gray-400 italic mt-1">No screenshot</p>
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                <div className="border-t border-gray-100 pt-4">
                                  <h6 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4" />Your Review & Decision
                                  </h6>
                                  <div className="mb-3">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Add new message/reason</label>
                                    <textarea
                                      rows={3}
                                      value={draft}
                                      onChange={(e) => updateDraft(taskId, phase.key, e.target.value)}
                                      placeholder="Your feedback or reason..."
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    />
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {currentStatus !== 'approved' && (
                                      <button onClick={() => handleApprove(taskId, phase.key)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-300 hover:bg-green-100 transition-colors">
                                        <ThumbsUp className="w-3.5 h-3.5" /> Approve
                                      </button>
                                    )}
                                    {currentStatus !== 'rejected' && (
                                      <button onClick={() => handleReject(taskId, phase.key)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-300 hover:bg-red-100 transition-colors">
                                        <ThumbsDown className="w-3.5 h-3.5" /> Reject
                                      </button>
                                    )}
                                    <button onClick={() => handleSubmitFeedback(taskId, phase.key)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100 transition-colors">
                                      <Send className="w-3.5 h-3.5" /> Submit Feedback
                                    </button>
                                    {history.length > 0 && (
                                      <button onClick={() => handleReset(taskId, phase.key)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200">
                                        Clear Review
                                      </button>
                                    )}
                                  </div>
                                </div>
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

      {/* Create Task Modal */}
      {showCreateTask && canCreateTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Create Available Designer Task</h3>
            <p className="text-sm text-gray-600 mb-4">
              This task will be visible to designers so they can apply for it.
            </p>
            <form className="space-y-4" onSubmit={createTask}>
              {newTaskError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{newTaskError}</p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Task Title</label>
                <input
                  type="text" value={newTask.title}
                  onChange={(event) => setNewTask({ ...newTask, title: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter task title" required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  rows={4} value={newTask.description}
                  onChange={(event) => setNewTask({ ...newTask, description: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe the work to be done" required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Story Points</label>
                <input
                  type="number" min="1" max="100" value={newTask.storyPoints}
                  onChange={(event) => setNewTask({ ...newTask, storyPoints: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter story points" required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Telegram Screenshot (optional)</label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-700">
                    <Image className="w-4 h-4" />Choose Image
                    <input type="file" accept="image/*" onChange={handleNewTaskImageUpload} className="hidden" />
                  </label>
                  {newTaskImagePreview && (
                    <button type="button" onClick={() => { URL.revokeObjectURL(newTaskImagePreview); setNewTask({ ...newTask, telegramScreenshot: '' }); setNewTaskImagePreview(null); newTaskImageFileRef.current = null; }} className="text-sm text-red-600 hover:underline">Remove</button>
                  )}
                </div>
                {newTaskImagePreview && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-1">Preview:</p>
                    <img src={newTaskImagePreview} alt="preview" className="max-w-full h-auto max-h-48 rounded-lg border object-contain" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Instruction</label>
                <textarea
                  rows={4} value={newTask.instruction}
                  onChange={(event) => setNewTask({ ...newTask, instruction: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe what the designer must collect or measure" required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Deadline</label>
                <input
                  type="date" value={newTask.deadline}
                  onChange={(event) => setNewTask({ ...newTask, deadline: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { if (newTaskImagePreview) URL.revokeObjectURL(newTaskImagePreview); setNewTask(emptyNewTask); setNewTaskImagePreview(null); newTaskImageFileRef.current = null; setNewTaskError(''); setShowCreateTask(false); }} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DesignerAssignments;