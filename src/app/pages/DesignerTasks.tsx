import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { designerRoles } from './designerTaskShared';
import designerApi, {
  DesignerTaskItem,
  DesignerTaskListMeta,
  SubmissionItem,
  SubmissionsWithReviewsData,
  CreateSubmissionResponse,
} from '../../api/designerApi';
import notificationApi from '../../api/notificationApi';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Upload,
  XCircle,
  Briefcase,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Edit,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';

// ---------- Types ----------
type PhaseKey = 'caseStudy' | 'designStage' | 'rendering' | 'finalStage';

export interface DesignerSubmissionSnapshot {
  note: string;
  screenshot: string | null;
  submittedAt: string;
}

export interface PhaseHistoryEntry {
  status: 'feedback' | 'approved' | 'rejected' | 'pending';
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

const PHASES: { key: PhaseKey; label: string; backendStage: string }[] = [
  { key: 'caseStudy', label: 'Case Study', backendStage: 'case study' },
  { key: 'designStage', label: 'Design Stage', backendStage: 'designing' },
  { key: 'rendering', label: 'Rendering', backendStage: 'rendering' },
  { key: 'finalStage', label: 'Final Stage', backendStage: 'final stage' },
];

function phaseToBackendStage(phase: PhaseKey): string {
  return PHASES.find((p) => p.key === phase)?.backendStage ?? phase;
}

const REQUIRED_ATTACHMENT_STAGES: Set<PhaseKey> = new Set(['rendering', 'finalStage']);

const STORAGE_KEY = 'designer-submission-progress';
const API_TASKS_CACHE_KEY = 'designer-api-tasks-cache';

// ──────────── NOTIFICATIONS / HIGHLIGHT ────────────
export const DESIGNER_TASKS_NOTIFICATIONS_KEY = 'designer-tasks-notifications-updated';

const viewedDesignerTaskCards = new Set<string>();
let designerTaskNotificationIds = new Set<string>();
const markedTaskNotificationIds = new Set<string>();

function publishDesignerTasksBadgeCount(count: number) {
  window.dispatchEvent(
    new CustomEvent(DESIGNER_TASKS_NOTIFICATIONS_KEY, { detail: count })
  );
}

export function getUnseenDesignerTaskHighlightedIds() {
  return new Set(
    [...designerTaskNotificationIds].filter((id) => !viewedDesignerTaskCards.has(id))
  );
}

export function getUnseenDesignerTaskCount() {
  return getUnseenDesignerTaskHighlightedIds().size;
}

// ---------- Helpers ----------
function loadSubmissionProgress(): SubmissionProgress {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? normalizeSubmissionProgress(JSON.parse(stored)) : {};
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

      // Always add a history entry for the submission itself (even without reviews)
      // so the phase has displayable content and gating works
      if (submission.reviews.length === 0) {
        history.push({
          status: 'pending',
          message: subNote || `Submission for ${PHASES.find((p) => p.backendStage === submission.stage)?.label || submission.stage}`,
          timestamp: submission.created_at,
          designerSubmission: {
            note: subNote,
            screenshot: subScreenshot ?? createSubmissionScreenshot('Submission'),
            submittedAt: submission.created_at,
          },
          hasNotification: submission.hasNotification,
        });
      }

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
    }

    result[phaseKey] = {
      note: latestSubmission.description || '',
      screenshot,
      history,
    };
  }

  return result as Record<PhaseKey, PhaseData>;
}

function getCurrentStatus(phase: PhaseData): PhaseHistoryEntry['status'] | 'pending' {
  const history = phase.history ?? [];
  if (history.length === 0) return 'pending';
  return history[history.length - 1].status;
}

function findFirstNonApprovedPhaseIndex(
  phases: typeof PHASES,
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

function isTaskRejected(progress: Record<PhaseKey, PhaseData> | null): boolean {
  if (!progress) return false;
  for (const phase of PHASES) {
    const data = progress[phase.key];
    if (data && data.history && data.history.length > 0) {
      if (getCurrentStatus(data) === 'rejected') return true;
    }
  }
  return false;
}

function getAssigneeDisplayName(task: DesignerTaskItem): string {
  if (task.assigned_to_user?.full_name) return task.assigned_to_user.full_name;
  if (task.assigned_to_user_id) return `User ${task.assigned_to_user_id.slice(0, 8)}`;
  return 'Open for application';
}

function getCreatorDisplayName(task: DesignerTaskItem): string {
  if (task.assigned_by_user?.full_name) return task.assigned_by_user.full_name;
  return `User ${task.assigned_by_user_id.slice(0, 8)}`;
}

const ROWS_PER_DISPLAY = 10;

// Module-level cache — survives HashRouter navigation but resets on full page refresh
let cachedTasks: DesignerTaskItem[] | null = null;
let cachedMeta: DesignerTaskListMeta | null = null;
let cachedRawData: Record<string, SubmissionsWithReviewsData> | null = null;
let cachedProgress: SubmissionProgress | null = null;

export function DesignerTasks() {
  const { user } = useAuth();
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<DesignerTaskItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [tasks, setTasks] = useState<DesignerTaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [apiPage, setApiPage] = useState(1);
  const [meta, setMeta] = useState<DesignerTaskListMeta | null>(null);
  const [displayOffset, setDisplayOffset] = useState(0);

  // Submission progress (localStorage-backed user input + API submissions)
  const [submissionProgress, setSubmissionProgress] = useState<SubmissionProgress>({});
  const [submissionsLoading, setSubmissionsLoading] = useState<Record<string, boolean>>({});

  // Modal UI state
  const [expandedPhase, setExpandedPhase] = useState<PhaseKey | null>(null);
  const [expandedHistoryIdx, setExpandedHistoryIdx] = useState<Record<string, Record<PhaseKey, number | null>>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, Record<PhaseKey, string>>>({});
  const [draftScreenshots, setDraftScreenshots] = useState<Record<string, Record<PhaseKey, string | null>>>({});
  const draftFilesRef = useRef<Record<string, Record<PhaseKey, File[]>>>({});
  const uploadInputRef = useRef<Record<string, Record<PhaseKey, HTMLInputElement | null>>>({});
  const [phaseErrors, setPhaseErrors] = useState<Record<string, Record<PhaseKey, string>>>({});
  const [submissionDraftLoading, setSubmissionDraftLoading] = useState<Record<string, Record<PhaseKey, boolean>>>({});

  // Raw API submission data (for Edit functionality)
  const [submissionsRawData, setSubmissionsRawData] = useState<Record<string, SubmissionsWithReviewsData>>({});
  const [editingSubmission, setEditingSubmission] = useState<{ taskId: string; phase: PhaseKey; submissionId: string } | null>(null);

  // Highlight state
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const seenThisSession = useRef<Set<string>>(new Set());
  const observedElements = useRef<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const tasksRef = useRef<DesignerTaskItem[]>([]);
  const pendingTaskNotifIds = useRef<Map<string, string>>(new Map());
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  useEffect(() => {
    if (tasks.length === 0) return;
    designerTaskNotificationIds = new Set(
      tasks.filter((t) => designerTaskHasAnyNotification(t)).map((t) => t.id)
    );
    const remaining = new Set(
      [...designerTaskNotificationIds].filter((id) => !viewedDesignerTaskCards.has(id))
    );
    setHighlightedIds(remaining);
    publishDesignerTasksBadgeCount(remaining.size);
  }, [tasks]);

  // ── Determine role-based limits ──
  const isLeadership = user?.role === 'ceo' || user?.role === 'general_manager';
  const apiLimit = isLeadership ? 20 : 10;

  // ── Fetch tasks from API ──
  const fetchTasks = useCallback(async (page: number, force = false) => {
    if (!user) return;
    if (!force && cachedTasks && cachedMeta) {
      setTasks(cachedTasks);
      setMeta(cachedMeta);
      if (cachedRawData) setSubmissionsRawData(cachedRawData);
      if (cachedProgress) setSubmissionProgress(cachedProgress);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await designerApi.getDesignerTasks({ page, limit: apiLimit });
      if (response.success) {
        setTasks(response.data);
        setMeta(response.meta);
        cachedTasks = response.data;
        cachedMeta = response.meta;
        setDisplayOffset(0);

        const progressUpdates: SubmissionProgress = {};
        const rawDataUpdates: Record<string, SubmissionsWithReviewsData> = {};
        for (const task of response.data) {
          if (task.submissionsWithReviews) {
            rawDataUpdates[task.id] = task.submissionsWithReviews;
            progressUpdates[task.id] = apiSubmissionsToProgress(task.submissionsWithReviews);
          }
        }
        cachedRawData = rawDataUpdates;
        cachedProgress = { ...progressUpdates };
        setSubmissionsRawData((prev) => ({ ...prev, ...rawDataUpdates }));
        setSubmissionProgress((prev) => ({ ...prev, ...progressUpdates }));

        // Compute highlighted task IDs from notifications
        designerTaskNotificationIds = new Set(
          response.data
            .filter((t) => designerTaskHasAnyNotification(t))
            .map((t) => t.id)
        );
        const unseenNotif = new Set([...designerTaskNotificationIds].filter((id) => !viewedDesignerTaskCards.has(id)));
        setHighlightedIds(unseenNotif);
        publishDesignerTasksBadgeCount(unseenNotif.size);
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

  // ── Load user submission progress from localStorage as fallback ──
  useEffect(() => {
    // Only use localStorage if no API data has been loaded yet
    if (Object.keys(submissionProgress).length === 0) {
      const stored = loadSubmissionProgress();
      if (Object.keys(stored).length > 0) {
        setSubmissionProgress(stored);
      }
    }
  }, []);

  // Persist progress on change
  useEffect(() => {
    if (Object.keys(submissionProgress).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(submissionProgress));
    }
  }, [submissionProgress]);

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
    return () => {
      observer.disconnect();
      observedElements.current.clear();
    };
  }, [highlightedIds]);

  const commitSeenSession = () => {
    if (seenThisSession.current.size === 0 && pendingTaskNotifIds.current.size === 0) return;
    
    const currentTasks = tasksRef.current;
    
    seenThisSession.current.forEach((id) => {
      const task = currentTasks.find((t) => t.id === id);
      if (!task || !hasNestedDesignerNotifications(task)) {
        viewedDesignerTaskCards.add(id);
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
          if (cachedTasks) {
            cachedTasks = cachedTasks.map((t) =>
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
            ) as DesignerTaskItem[];
          }
          designerTaskNotificationIds = new Set(
            updatedTasks
              .filter((t) => designerTaskHasAnyNotification(t))
              .map((t) => t.id)
          );
          const remaining = new Set(
            [...designerTaskNotificationIds].filter((id) => !viewedDesignerTaskCards.has(id))
          );
          setHighlightedIds(remaining);
          publishDesignerTasksBadgeCount(remaining.size);
        })
        .catch(() => {
          markedTaskNotificationIds.delete(notifId);
        });
    }
    
    designerTaskNotificationIds = new Set(
      currentTasks
        .filter((t) => designerTaskHasAnyNotification(t))
        .map((t) => t.id)
    );
    const remainingUnseen = new Set(
      [...designerTaskNotificationIds].filter((id) => !viewedDesignerTaskCards.has(id))
    );
    setHighlightedIds(remainingUnseen);
    publishDesignerTasksBadgeCount(remainingUnseen.size);
  };

  useEffect(() => { return () => { commitSeenSession(); }; }, []);

  if (!user) return null;
  if (!designerRoles.has(user.role) && user.role !== 'ceo' && user.role !== 'general_manager') {
    return (
      <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">Access denied.</p>
      </div>
    );
  }

  // ── Pagination logic ──
  const displayItems = tasks.slice(displayOffset, displayOffset + ROWS_PER_DISPLAY);
  const totalDisplayPages = Math.ceil(tasks.length / ROWS_PER_DISPLAY);
  const currentDisplayPage = Math.floor(displayOffset / ROWS_PER_DISPLAY);
  const canGoPrev = displayOffset > 0 || apiPage > 1;
  const canGoNext = displayOffset + ROWS_PER_DISPLAY < tasks.length || (meta ? apiPage < meta.totalPages : false);

  const goNext = () => {
    if (displayOffset + ROWS_PER_DISPLAY < tasks.length) {
      setDisplayOffset(displayOffset + ROWS_PER_DISPLAY);
    } else {
      cachedTasks = null;
      cachedMeta = null;
      cachedRawData = null;
      cachedProgress = null;
      setApiPage((p) => p + 1);
    }
  };

  const goPrev = () => {
    if (displayOffset - ROWS_PER_DISPLAY >= 0) {
      setDisplayOffset(displayOffset - ROWS_PER_DISPLAY);
    } else {
      cachedTasks = null;
      cachedMeta = null;
      cachedRawData = null;
      cachedProgress = null;
      setApiPage((p) => Math.max(1, p - 1));
    }
  };

  // ── Detail modal ──
  const getDisplayProgress = (taskId: string): Record<PhaseKey, PhaseData> => {
    return submissionProgress[taskId] || {
      caseStudy: defaultPhase(),
      designStage: defaultPhase(),
      rendering: defaultPhase(),
      finalStage: defaultPhase(),
    };
  };

  const openDetail = (task: DesignerTaskItem) => {
    setSelectedTaskDetail(task);
    const progress = getDisplayProgress(task.id);
    const notesDraft: Record<PhaseKey, string> = {} as Record<PhaseKey, string>;
    const screenshotsDraft: Record<PhaseKey, string | null> = {} as Record<PhaseKey, string | null>;
    PHASES.forEach((p) => {
      notesDraft[p.key] = '';
      screenshotsDraft[p.key] = null;
    });
    setDraftNotes((prev) => ({ ...prev, [task.id]: notesDraft }));
    setDraftScreenshots((prev) => ({ ...prev, [task.id]: screenshotsDraft }));
    setPhaseErrors((prev) => ({ ...prev, [task.id]: {} as Record<PhaseKey, string> }));
    draftFilesRef.current = { ...draftFilesRef.current, [task.id]: { caseStudy: [], designStage: [], rendering: [], finalStage: [] } };
    setExpandedPhase('caseStudy');
    setExpandedHistoryIdx((prev) => ({
      ...prev,
      [task.id]: { caseStudy: null, designStage: null, rendering: null, finalStage: null },
    }));
    setShowDetail(true);

    // Use submissions data already embedded in the task response
    const swr = task.submissionsWithReviews;
    if (swr) {
      setSubmissionsRawData((prev) => ({ ...prev, [task.id]: swr }));
      const apiProgress = apiSubmissionsToProgress(swr);
      setSubmissionProgress((prev) => {
        const existing = prev[task.id] || {
          caseStudy: defaultPhase(),
          designStage: defaultPhase(),
          rendering: defaultPhase(),
          finalStage: defaultPhase(),
        };
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
            caseStudy: (swr.caseStudy || []).map(stripSubmissionNotifications),
            designing: (swr.designing || []).map(stripSubmissionNotifications),
            rendering: (swr.rendering || []).map(stripSubmissionNotifications),
            finalStage: (swr.finalStage || []).map(stripSubmissionNotifications),
          }
        : swr;

      const clearedTask = { ...task, hasNestedNotification: false, submissionsWithReviews: clearedSwr } as DesignerTaskItem;
      setSelectedTaskDetail(clearedTask);

      const updatedTasks = tasksRef.current.map((t) =>
        t.id === task.id ? clearedTask : t
      );
      setTasks(updatedTasks);
      tasksRef.current = updatedTasks;
      if (cachedTasks) {
        cachedTasks = cachedTasks.map((t) => (t.id === task.id ? clearedTask : t));
      }

      if (!designerTaskHasAnyNotification(clearedTask)) {
        viewedDesignerTaskCards.add(task.id);
      }
      designerTaskNotificationIds = new Set(
        updatedTasks
          .filter((t) => designerTaskHasAnyNotification(t))
          .map((t) => t.id)
      );
      const remaining = new Set(
        [...designerTaskNotificationIds].filter((id) => !viewedDesignerTaskCards.has(id))
      );
      setHighlightedIds(remaining);
      publishDesignerTasksBadgeCount(remaining.size);
    }
  };

  const closeDetail = () => {
    const taskId = selectedTaskDetail?.id;
    if (taskId && draftFilesRef.current[taskId]) {
      const taskDrafts = draftScreenshots[taskId];
      if (taskDrafts) {
        Object.values(taskDrafts).forEach((url) => {
          if (url) URL.revokeObjectURL(url);
        });
      }
    }
    setSelectedTaskDetail(null);
    setShowDetail(false);
    setExpandedPhase(null);
    setEditingSubmission(null);
  };

  const handleEditSubmission = (taskId: string, phase: PhaseKey, submissionId: string) => {
    const rawData = submissionsRawData[taskId];
    if (!rawData) return;

    const stageMap: Record<PhaseKey, string> = {
      caseStudy: 'caseStudy',
      designStage: 'designing',
      rendering: 'rendering',
      finalStage: 'finalStage',
    };
    const apiKey = stageMap[phase];
    const submissions: SubmissionItem[] = (rawData as Record<string, SubmissionItem[]>)[apiKey] || [];
    const submission = submissions.find((s) => s.id === submissionId);
    if (!submission) return;

    // Pre-populate form fields
    setDraftNotes((prev) => ({
      ...prev,
      [taskId]: { ...prev[taskId], [phase]: submission.description || '' },
    }));
    setEditingSubmission({ taskId, phase, submissionId });

    // Expand the phase to show the form
    setExpandedPhase(phase);
  };

  const handleSubmitPhaseProgress = async (taskId: string, phase: PhaseKey) => {
    const note = draftNotes[taskId]?.[phase] ?? '';
    const files = draftFilesRef.current[taskId]?.[phase] ?? [];

    // Validate required attachments for rendering and final stage
    if (REQUIRED_ATTACHMENT_STAGES.has(phase) && files.length === 0) {
      setPhaseErrors((prev) => ({
        ...prev,
        [taskId]: { ...prev[taskId], [phase]: 'At least one file attachment is required for this stage.' },
      }));
      return;
    }

    setSubmissionDraftLoading((prev) => ({
      ...prev,
      [taskId]: { ...prev[taskId], [phase]: true },
    }));

    try {
      const formData = new FormData();
      formData.append('stage', phaseToBackendStage(phase));
      formData.append('description', note.trim() || `Submission for ${phaseToBackendStage(phase)}`);

      for (const file of files) {
        formData.append('attachmentFiles', file);
      }

      const isEditing = editingSubmission?.taskId === taskId && editingSubmission?.phase === phase;
      const response = isEditing
        ? await designerApi.updateSubmission(editingSubmission!.submissionId, formData)
        : await designerApi.createSubmission(taskId, formData);

      if (response.success && response.data) {
        // Update the task card immediately with new status/stage from backend
        setTasks((prev) => {
          const updated = prev.map((t) =>
            t.id === taskId
              ? { ...t, status: 'pending', stage: phaseToBackendStage(phase), updated_at: new Date().toISOString() }
              : t
          );
          cachedTasks = updated;
          return updated;
        });

        // Save note/screenshot locally for UI display
        const screenshotUrl = files.length > 0
          ? URL.createObjectURL(files[0])
          : null;

        setSubmissionProgress((prev) => {
          const taskProgress = prev[taskId] ?? getDisplayProgress(taskId);
          const updatedPhase: PhaseData = {
            ...taskProgress[phase],
            note: note.trim(),
            screenshot: screenshotUrl ?? taskProgress[phase].screenshot,
          };
          return { ...prev, [taskId]: { ...taskProgress, [phase]: updatedPhase } };
        });

        // Refresh submissions by refetching current page
        setSubmissionsLoading((prev) => ({ ...prev, [taskId]: true }));
        try {
          await fetchTasks(apiPage, true);
          if (cachedTasks) {
            const refreshed = cachedTasks.find((t) => t.id === taskId);
            if (refreshed) {
              setSelectedTaskDetail(refreshed);
              // Also update progress directly from the refreshed task's data
              if (refreshed.submissionsWithReviews) {
                const freshProgress = apiSubmissionsToProgress(refreshed.submissionsWithReviews);
                setSubmissionProgress((prev) => ({ ...prev, [taskId]: freshProgress }));
                setSubmissionsRawData((prev) => ({ ...prev, [taskId]: refreshed.submissionsWithReviews }));
              }
            }
          }
        } finally {
          setSubmissionsLoading((prev) => ({ ...prev, [taskId]: false }));
        }
      } else {
        setPhaseErrors((prev) => ({
          ...prev,
          [taskId]: { ...prev[taskId], [phase]: response.message || 'Submission failed' },
        }));
        return;
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setPhaseErrors((prev) => ({
        ...prev,
        [taskId]: { ...prev[taskId], [phase]: msg || 'Unable to connect to server' },
      }));
      return;
    } finally {
      setSubmissionDraftLoading((prev) => ({
        ...prev,
        [taskId]: { ...prev[taskId], [phase]: false },
      }));
    }

    // Clear form on success
    setEditingSubmission(null);
    const oldUrl = draftScreenshots[taskId]?.[phase] ?? null;
    if (oldUrl) URL.revokeObjectURL(oldUrl);
    setDraftScreenshots((prev) => ({ ...prev, [taskId]: { ...prev[taskId], [phase]: null } }));
    setDraftNotes((prev) => ({ ...prev, [taskId]: { ...prev[taskId], [phase]: '' } }));
    setPhaseErrors((prev) => ({ ...prev, [taskId]: { ...prev[taskId], [phase]: '' } }));
    draftFilesRef.current = {
      ...draftFilesRef.current,
      [taskId]: { ...draftFilesRef.current[taskId], [phase]: [] },
    };
  };

  const handleFilesChange = (taskId: string, phase: PhaseKey, fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      // User clicked "Remove all" - clear files
      const oldUrl = draftScreenshots[taskId]?.[phase] ?? null;
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      setDraftScreenshots((prev) => ({ ...prev, [taskId]: { ...prev[taskId], [phase]: null } }));
      draftFilesRef.current = {
        ...draftFilesRef.current,
        [taskId]: { ...draftFilesRef.current[taskId], [phase]: [] },
      };
      return;
    }

    // Revoke old preview URLs
    const oldUrl = draftScreenshots[taskId]?.[phase] ?? null;
    if (oldUrl) URL.revokeObjectURL(oldUrl);

    const files = Array.from(fileList);
    draftFilesRef.current = {
      ...draftFilesRef.current,
      [taskId]: { ...draftFilesRef.current[taskId], [phase]: files },
    };

    // Show preview of first file
    const objectUrl = URL.createObjectURL(files[0]);
    setDraftScreenshots((prev) => ({
      ...prev,
      [taskId]: { ...prev[taskId], [phase]: objectUrl },
    }));
    setPhaseErrors((prev) => ({
      ...prev,
      [taskId]: { ...prev[taskId], [phase]: '' },
    }));
  };

  const toggleHistoryEntry = (taskId: string, phase: PhaseKey, idx: number) => {
    setExpandedHistoryIdx((prev) => {
      const taskIdx = prev[taskId] ?? { caseStudy: null, designStage: null, rendering: null, finalStage: null };
      return { ...prev, [taskId]: { ...taskIdx, [phase]: taskIdx[phase] === idx ? null : idx } };
    });
  };

  const getCurrentPhaseInfo = (task: DesignerTaskItem) => {
    // Find latest review across all phases to determine the most relevant stage/status
    const raw = submissionsRawData[task.id];
    const stageLabels = ['Case Study', 'Design Stage', 'Rendering', 'Final Stage'];
    const stageKeys: PhaseKey[] = ['caseStudy', 'designStage', 'rendering', 'finalStage'];
    const stages = raw ? [raw.caseStudy || [], raw.designing || [], raw.rendering || [], raw.finalStage || []] : [[], [], [], []];
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

  // ── Find latest activity (submission or review) across all phases ──
  const getLatestActivity = (taskId: string): {
    description: string;
    kind: 'review' | 'submission';
    outcome: string;
    stage?: string;
  } | null => {
    const raw = submissionsRawData[taskId];
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

  // Filter: only assigned tasks
  const assignedTasks = tasks.filter((task) => !!task.assigned_to_user_id);
  const visibleTasks = user.role === 'designer'
    ? assignedTasks.filter((task) => task.assigned_to_user_id === user.id)
    : assignedTasks;

  // Sort by latest activity (task, submission, or review timestamps) descending
  const sortedTasks = [...visibleTasks].sort((a, b) => {
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

  const statusDisplay = (status: string | null): string => {
    if (!status) return 'pending';
    return status.replace('_', ' ');
  };

  const statusColor = (status: string | null): string => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'feedback': return 'bg-yellow-100 text-yellow-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
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
          <h2 className="text-2xl font-bold text-gray-900">Designer Tasks</h2>
          <p className="text-gray-600 mt-1">Submit your work and view feedback on assigned tasks.</p>
          {highlightedIds.size > 0 && (
            <p className="text-sm text-blue-600 mt-2 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-semibold">
                {highlightedIds.size}
              </span>
              new {highlightedIds.size === 1 ? 'record' : 'records'} since your last visit
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      )}

      {visibleTasks.length === 0 && !isLoading ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No assigned designer tasks yet.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sortedTasks.slice(displayOffset, displayOffset + ROWS_PER_DISPLAY).map((task) => {
              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'approved';
              const { currentPhaseKey, currentPhaseLabel, currentPhaseStatus } = getCurrentPhaseInfo(task);
              const isHighlighted = highlightedIds.has(task.id);

              return (
                <div
                  key={task.id}
                  data-highlighted-id={isHighlighted ? task.id : undefined}
                  className={`bg-white rounded-xl p-6 shadow-sm border transition-all duration-300 hover:shadow-md ${
                    isHighlighted
                      ? 'border-2 border-blue-400 ring-4 ring-blue-100 shadow-blue-100'
                      : 'border-gray-200'
                  }`}
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
                      <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                        currentPhaseStatus === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : currentPhaseStatus === 'feedback'
                          ? 'bg-yellow-100 text-yellow-700'
                          : currentPhaseStatus === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
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
                      <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${statusColor(task.status)}`}>
                        {statusDisplay(task.status)}
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
                    const activity = getLatestActivity(task.id);
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
                <p className="mt-1 text-sm text-gray-500">Submit your work and view feedback</p>
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
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColor(selectedTaskDetail.status)}`}>
                      {statusDisplay(selectedTaskDetail.status)}
                    </span>
                  </div>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Description</h5>
                  <p className="mt-2 text-sm text-gray-700">{selectedTaskDetail.description}</p>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-4">
                    Submission Progress &amp; Review Feedback
                  </h5>

                  {(() => {
                    const progress = getDisplayProgress(selectedTaskDetail.id);
                    const taskRejected = isTaskRejected(progress);
                    const apiTaskRejected = selectedTaskDetail.status === 'rejected';
                    const overallRejected = taskRejected || apiTaskRejected;

                    // Find the last phase with content
                    const lastPopulated = getLastPopulatedPhaseIndex(progress);

                    // Check if any phase is rejected
                    const rejectedIdx = PHASES.findIndex((p) => {
                      const d = progress[p.key];
                      return d && d.history && d.history.length > 0 && getCurrentStatus(d) === 'rejected';
                    });

                    // Determine the last visible phase index
                    let lastVisibleIdx = PHASES.length - 1;
                    if (rejectedIdx !== -1) {
                      // If rejected, stop at the rejected phase (hide subsequent phases)
                      lastVisibleIdx = rejectedIdx;
                    } else if (lastPopulated !== -1) {
                      // Show one more phase after the last populated one so designer can submit
                      lastVisibleIdx = Math.min(lastPopulated + 1, PHASES.length - 1);
                    } else {
                      // No phases have content yet — show only Case Study
                      lastVisibleIdx = 0;
                    }

                    const visiblePhases = PHASES.filter((_p, idx) => {
                      if (idx > lastVisibleIdx) return false;
                      if (idx === lastVisibleIdx) {
                        // Show last phase even if empty (so designer can submit)
                        return true;
                      }
                      return phaseHasDisplayableContent(progress[_p.key]);
                    });

                    if (visiblePhases.length === 0) {
                      return <p className="text-sm text-gray-500">No submission data yet.</p>;
                    }

                    return (
                      <div className="space-y-3">
                        {overallRejected && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-red-600" />
                            <span className="text-sm font-medium text-red-700">
                              This task has been rejected. No further submissions can be made.
                            </span>
                          </div>
                        )}
                        {visiblePhases.map((phase) => {
                          const taskId = selectedTaskDetail.id;
                          const phaseData = progress[phase.key] ?? defaultPhase();
                          const isExpanded = expandedPhase === phase.key;
                          const currentStatus = getCurrentStatus(phaseData);
                          const history = phaseData.history || [];
                          const isApproved = currentStatus === 'approved';
                          const canSubmit = !overallRejected && selectedTaskDetail.task_state === 'active';
                          const noteDraft = draftNotes[taskId]?.[phase.key] ?? '';
                          const newScreenshot = draftScreenshots[taskId]?.[phase.key] ?? null;
                          const existingScreenshot = phaseData.screenshot;
                          const phaseError = phaseErrors[taskId]?.[phase.key] ?? '';
                          const taskHistoryIdx = expandedHistoryIdx[taskId]?.[phase.key];

                          const statusBadge = {
                            feedback: { label: 'Feedback Given', icon: MessageSquare, color: 'bg-yellow-100 text-yellow-700' },
                            approved: { label: 'Approved', icon: ThumbsUp, color: 'bg-green-100 text-green-700' },
                            rejected: { label: 'Rejected', icon: ThumbsDown, color: 'bg-red-100 text-red-700' },
                            pending: { label: 'Pending Review', icon: Clock, color: 'bg-blue-100 text-blue-700' },
                          }[currentStatus];

                          // Check if this phase has any notifications
                          const rawData = submissionsRawData[taskId];
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
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-gray-500" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-500" />
                                )}
                              </button>

                              {isExpanded && (
                                <div className="p-4 space-y-4 bg-white">
                                  {canSubmit && (
                                    <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-blue-50/50">
                                      <h6 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4" />
                                        {editingSubmission?.taskId === taskId && editingSubmission?.phase === phase.key ? 'Update' : 'Submit'} to {phase.label}
                                      </h6>
                                      <div className="space-y-3">
                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 mb-1">
                                            Description
                                          </label>
                                          <textarea
                                            rows={3}
                                            value={noteDraft}
                                            onChange={(e) =>
                                              setDraftNotes((prev) => ({
                                                ...prev,
                                                [taskId]: { ...prev[taskId], [phase.key]: e.target.value },
                                              }))
                                            }
                                            placeholder="Describe your submission..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            required
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 mb-1">
                                            File Attachments{' '}
                                            {REQUIRED_ATTACHMENT_STAGES.has(phase.key) ? (
                                              <span className="text-red-500">(required - at least 1)</span>
                                            ) : (
                                              <span className="text-gray-400 text-xs ml-1">(optional)</span>
                                            )}
                                          </label>
                                          <div className="flex items-center gap-2">
                                            <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-700">
                                              <Upload className="w-4 h-4" />
                                              {draftFilesRef.current[taskId]?.[phase.key]?.length
                                                ? `${draftFilesRef.current[taskId][phase.key].length} file(s) selected`
                                                : newScreenshot || existingScreenshot
                                                ? 'Change Files'
                                                : 'Choose Files'}
                                              <input
                                                type="file"
                                                multiple
                                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.rar"
                                                ref={(el) => {
                                                  if (!uploadInputRef.current[taskId]) {
                                                    uploadInputRef.current[taskId] = {} as Record<PhaseKey, HTMLInputElement | null>;
                                                  }
                                                  uploadInputRef.current[taskId][phase.key] = el;
                                                }}
                                                onChange={(e) => handleFilesChange(taskId, phase.key, e.target.files)}
                                                className="hidden"
                                              />
                                            </label>
                                            {(newScreenshot || existingScreenshot || (draftFilesRef.current[taskId]?.[phase.key]?.length ?? 0) > 0) && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const oldUrl = draftScreenshots[taskId]?.[phase.key] ?? null;
                                                  if (oldUrl) URL.revokeObjectURL(oldUrl);
                                                  setDraftScreenshots((prev) => ({
                                                    ...prev,
                                                    [taskId]: { ...prev[taskId], [phase.key]: null },
                                                  }));
                                                  draftFilesRef.current = {
                                                    ...draftFilesRef.current,
                                                    [taskId]: { ...draftFilesRef.current[taskId], [phase.key]: [] },
                                                  };
                                                }}
                                                className="text-sm text-red-600 hover:underline"
                                              >
                                                Remove All
                                              </button>
                                            )}
                                          </div>
                                          {phaseError && (
                                            <p className="mt-1 text-xs text-red-600">{phaseError}</p>
                                          )}
                                          {newScreenshot && (
                                            <img
                                              src={newScreenshot}
                                              alt="preview"
                                              className="mt-2 w-full max-h-40 rounded-lg border object-contain"
                                            />
                                          )}
                                          {!newScreenshot && existingScreenshot && (
                                            <img
                                              src={existingScreenshot}
                                              alt="current screenshot"
                                              className="mt-2 w-full max-h-40 rounded-lg border object-contain"
                                            />
                                          )}
                                          {!newScreenshot && !existingScreenshot && (
                                            <p className="mt-1 text-xs text-gray-400">No preview available.</p>
                                          )}
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                          <button
                                            onClick={() => handleSubmitPhaseProgress(taskId, phase.key)}
                                            disabled={submissionDraftLoading[taskId]?.[phase.key]}
                                            className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-sm transition-colors"
                                          >
                                            {submissionDraftLoading[taskId]?.[phase.key]
                                              ? (editingSubmission ? 'Updating...' : 'Submitting...')
                                              : (editingSubmission ? 'Update' : 'Submit')}
                                          </button>
                                          <button
                                            onClick={() => {
                                              const oldUrl = draftScreenshots[taskId]?.[phase.key] ?? null;
                                              if (oldUrl) URL.revokeObjectURL(oldUrl);
                                              setDraftNotes((prev) => ({
                                                ...prev,
                                                [taskId]: { ...prev[taskId], [phase.key]: '' },
                                              }));
                                              setDraftScreenshots((prev) => ({
                                                ...prev,
                                                [taskId]: { ...prev[taskId], [phase.key]: null },
                                              }));
                                              draftFilesRef.current = {
                                                ...draftFilesRef.current,
                                                [taskId]: { ...draftFilesRef.current[taskId], [phase.key]: [] },
                                              };
                                            }}
                                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
                                          >
                                            Clear
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* ── Submissions list per phase (expandable, reviews nested) ── */}
                                  {stageSubmissions.length > 0 && (() => {
                                    const editableSubmissions = stageSubmissions.filter((s) => s.reviews.length === 0);
                                    const latestEditable = editableSubmissions.length > 0 ? editableSubmissions[editableSubmissions.length - 1] : null;
                                    const taskActive = selectedTaskDetail.task_state === 'active';
                                    const canEdit = latestEditable && taskActive && !overallRejected && user?.role === 'designer';
                                    const latestEditableId = canEdit ? latestEditable!.id : null;
                                    const isEditingThis = editingSubmission?.taskId === taskId && editingSubmission?.phase === phase.key;

                                    return (
                                    <div className="border-t border-gray-100 pt-4">
                                      <h6 className="text-sm font-medium text-gray-700 mb-3">
                                        {stageSubmissions.length} Submission{stageSubmissions.length !== 1 ? 's' : ''}
                                      </h6>
                                      <div className="space-y-2">
                                        {stageSubmissions.map((sub, sIdx) => {
                                          const isSubExpanded = expandedHistoryIdx[taskId]?.[phase.key] === sIdx;
                                          const subReviewCount = (sub.reviews || []).length;
                                          const isThisEditable = sub.id === latestEditableId;
                                          return (
                                            <div key={sub.id} className={`border rounded-lg overflow-hidden ${sub.hasNotification ? 'border-blue-400 ring-1 ring-blue-100' : 'border-gray-200'}`}>
                                              <button
                                                type="button"
                                                onClick={() => toggleHistoryEntry(taskId, phase.key, sIdx)}
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
                                                      <div className="flex gap-2 flex-wrap">
                                                        {sub.attachment_urls.map((url, aIdx) => (
                                                          <img
                                                            key={aIdx}
                                                            src={url}
                                                            alt={`attachment-${aIdx}`}
                                                            className="h-24 w-auto rounded border object-cover cursor-pointer hover:ring-2 hover:ring-blue-400 transition-shadow"
                                                          />
                                                        ))}
                                                      </div>
                                                    </div>
                                                  )}
                                                  {isThisEditable && (
                                                    <div className="pt-2">
                                                      {isEditingThis ? (
                                                        <button
                                                          type="button"
                                                          onClick={() => {
                                                            setEditingSubmission(null);
                                                            setDraftNotes((prev) => ({
                                                              ...prev,
                                                              [taskId]: { ...prev[taskId], [phase.key]: '' },
                                                            }));
                                                          }}
                                                          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-medium"
                                                        >
                                                          <XCircle className="w-3.5 h-3.5" />
                                                          Cancel Edit
                                                        </button>
                                                      ) : (
                                                        <button
                                                          type="button"
                                                          onClick={() => handleEditSubmission(taskId, phase.key, sub.id)}
                                                          className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                                                        >
                                                          <Edit className="w-3.5 h-3.5" />
                                                          Edit Latest Submission
                                                        </button>
                                                      )}
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
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
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
    </div>
  );
}

export default DesignerTasks;
