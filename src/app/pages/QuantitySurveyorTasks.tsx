import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotificationCounts } from '../contexts/NotificationCountsContext';
import quantitySurveyorApi, {
  QuantitySurveyorTaskItem,
  QuantitySurveyorTaskListMeta,
  QuantitySurveyorSubmissionRaw,
  QuantitySurveyorSubmissionWrapper,
  QuantitySurveyorSubmissionReview,
} from '../../api/quantitySurveyorApi';
import notificationApi from '../../api/notificationApi';
import userApi, { UserItem } from '../../api/userApi';
import {
  createGeneralNotification,
  loadQuantityReviewNotifications,
  saveQuantityReviewNotifications,
} from '../data/quantitySurveyorWorkflow';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Upload,
  XCircle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Edit,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Plus,
  Image,
  Send,
  X,
  Database,
  Paperclip,
  Trash2,
} from 'lucide-react';
import AttachmentViewer from '../components/AttachmentViewer';
import { quantitySurveyorTaskCache } from '../data/quantitySurveyorTaskCache';

// ------------ NOTIFICATIONS / HIGHLIGHT ------------
export const QUANTITY_SURVEYOR_NOTIFICATIONS_KEY = 'quantity-surveyor-notifications-updated';

const viewedQuantitySurveyorCards = new Set<string>();
let quantitySurveyorNotificationIds = new Set<string>();
const markedTaskNotificationIds = new Set<string>();
let hasResetForSessionOnce = false;

function publishBadgeCount(count: number) {
  window.dispatchEvent(
    new CustomEvent(QUANTITY_SURVEYOR_NOTIFICATIONS_KEY, { detail: count })
  );
}

export function getUnseenQuantitySurveyorHighlightedIds() {
  return new Set(
    [...quantitySurveyorNotificationIds].filter((id) => !viewedQuantitySurveyorCards.has(id))
  );
}

export function getUnseenQuantitySurveyorCount() {
  return getUnseenQuantitySurveyorHighlightedIds().size;
}

// ------------ HELPERS ------------

function getAssigneeDisplayName(task: QuantitySurveyorTaskItem): string {
  if (task.assigned_to_user?.full_name) return task.assigned_to_user.full_name;
  if (task.assigned_to_user_id) return `User ${task.assigned_to_user_id.slice(0, 8)}`;
  return 'Unassigned';
}

function getCreatorDisplayName(task: QuantitySurveyorTaskItem): string {
  if (task.assigned_by_user?.full_name) return task.assigned_by_user.full_name;
  return `User ${task.assigned_by_user_id.slice(0, 8)}`;
}

function statusDisplay(status: string | null): string {
  if (!status) return 'pending';
  return status.replace('_', ' ');
}

function statusColor(status: string | null): string {
  switch (status) {
    case 'approved': return 'bg-green-100 text-green-700';
    case 'rejected': return 'bg-red-100 text-red-700';
    case 'feedback': return 'bg-yellow-100 text-yellow-700';
    case 'completed': return 'bg-green-100 text-green-700';
    case 'in_progress': return 'bg-blue-100 text-blue-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function getSubmissions(task: QuantitySurveyorTaskItem): QuantitySurveyorSubmissionRaw[] {
  return (task.submissionsWithReviews?.submissions || []).map((w) => w.submission);
}

function getSubmissionWrappers(task: QuantitySurveyorTaskItem): QuantitySurveyorSubmissionWrapper[] {
  return task.submissionsWithReviews?.submissions || [];
}

function anyNotification(task: QuantitySurveyorTaskItem): boolean {
  if ((task as any).taskNotification?.hasNotification) return true;
  const swr = task.submissionsWithReviews;
  return !!(
    swr?.taskNotification?.hasNotification ||
    task.hasNestedNotification ||
    (swr?.submissions || []).some(
      (w) => w.hasNotification || (w.submission?.reviews || []).some((r) => r.hasNotification)
    )
  );
}

function hasNestedNotifications(task: QuantitySurveyorTaskItem): boolean {
  const swr = task.submissionsWithReviews;
  return (
    task.hasNestedNotification ||
    (swr?.submissions || []).some(
      (w) => w.hasNotification || (w.submission?.reviews || []).some((r) => r.hasNotification)
    )
  );
}

function canDeleteQuantitySurveyorTask(task: QuantitySurveyorTaskItem): boolean {
  const hasSubmissions = (task.submissionsWithReviews?.submissions || []).length > 0;
  if (hasSubmissions) return false;

  if (task.assigned_to_user_id) {
    const assignmentDate = task.updated_at ? new Date(task.updated_at) : null;
    if (assignmentDate) {
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      if (Date.now() - assignmentDate.getTime() > threeDaysMs) return false;
    }
  }
  return true;
}

const ROWS_PER_DISPLAY = 10;

const STORAGE_KEY = 'quantity-surveyor-tasks-v3';

// ── Seed data (matches backend response shape exactly) ──
const seedTasks: QuantitySurveyorTaskItem[] = [
  {
    id: 'qs-task-1',
    assigned_to_user_id: '11',
    assigned_by_user_id: '2',
    title: 'Budget estimate for residential extension',
    description: 'Prepare a detailed cost breakdown for the two-storey residential extension including materials, labour, and contingencies.',
    status: 'in_progress',
    task_state: 'active',
    due_date: '2026-06-25T23:59:59Z',
    attachment_urls: ['https://placehold.co/800x480/0f172a/f8fafc?text=Budget+Estimate'],
    updated_by: null,
    created_at: '2026-05-18T08:00:00Z',
    updated_at: '2026-05-19T12:10:00Z',
    assigned_by_user: { id: '2', full_name: 'Bob Smith', role: 'general_manager' },
    assigned_to_user: { id: '11', full_name: 'Oliver Grant', role: 'quantity_surveyor' },
    updated_by_user: null,
    taskNotification: { hasNotification: true, notificationId: 'notif-qs-t1' },
    submissionsWithReviews: {
      submissions: [
        {
          submissionId: 'qs-sub-1',
          hasNotification: true,
          notificationId: 'notif-qs-1',
          submission: {
            id: 'qs-sub-1',
            quantity_surveyor_task_id: 'qs-task-1',
            description: 'Completed cost breakdown. Materials estimated at $85k, labour at $42k, contingencies at $12k.',
            attachment_urls: ['https://placehold.co/800x480/0f172a/f8fafc?text=Cost+Breakdown'],
            created_at: '2026-05-19T12:10:00Z',
            updated_at: null,
            reviews: [
              {
                id: 'qs-rev-1',
                quantity_surveyor_submission_id: 'qs-sub-1',
                reviewer_user_id: '1',
                reviewer_user: { id: '1', full_name: 'Alice Johnson', role: 'ceo' },
                review_outcome: 'feedback',
                description: 'Good estimate, but please add a breakdown for finishing materials separately.',
                created_at: '2026-05-20T10:00:00Z',
                updated_at: null,
                hasNotification: true,
                notificationId: 'notif-qs-r1',
              },
            ],
          },
        },
      ],
      latestActivityTs: 1748350800000,
    },
    hasNestedNotification: true,
  },
  {
    id: 'qs-task-2',
    assigned_to_user_id: '12',
    assigned_by_user_id: '1',
    title: 'Cost analysis for lobby redesign',
    description: 'Review the lobby redesign package and provide a cost comparison against the original budget.',
    status: 'in_progress',
    task_state: 'active',
    due_date: '2026-06-22T23:59:59Z',
    attachment_urls: null,
    updated_by: null,
    created_at: '2026-05-17T10:00:00Z',
    updated_at: '2026-05-18T15:42:00Z',
    assigned_by_user: { id: '1', full_name: 'Alice Johnson', role: 'ceo' },
    assigned_to_user: { id: '12', full_name: 'Sam Lee', role: 'quantity_surveyor' },
    updated_by_user: null,
    taskNotification: { hasNotification: true, notificationId: 'notif-qs-t2' },
    submissionsWithReviews: {
      submissions: [
        {
          submissionId: 'qs-sub-2',
          hasNotification: true,
          notificationId: 'notif-qs-2',
          submission: {
            id: 'qs-sub-2',
            quantity_surveyor_task_id: 'qs-task-2',
            description: 'Cost comparison completed. Lobby redesign exceeds original budget by 15% due to expanded scope.',
            attachment_urls: ['https://placehold.co/800x480/1e293b/e2e8f0?text=Cost+Analysis'],
            created_at: '2026-05-18T15:42:00Z',
            updated_at: null,
            reviews: [],
          },
        },
      ],
      latestActivityTs: 1747582920000,
    },
    hasNestedNotification: true,
  },
  {
    id: 'qs-task-3',
    assigned_to_user_id: '13',
    assigned_by_user_id: '2',
    title: 'Material quantity take-off for warehouse',
    description: 'Perform a full material quantity take-off for the steel truss warehouse project.',
    status: 'completed',
    task_state: 'active',
    due_date: '2026-06-20T23:59:59Z',
    attachment_urls: ['https://placehold.co/800x480/334155/f8fafc?text=QTO+Warehouse'],
    updated_by: null,
    created_at: '2026-05-15T08:00:00Z',
    updated_at: '2026-05-20T10:00:00Z',
    assigned_by_user: { id: '2', full_name: 'Bob Smith', role: 'general_manager' },
    assigned_to_user: { id: '13', full_name: 'Aisha Khan', role: 'quantity_surveyor' },
    updated_by_user: null,
    taskNotification: { hasNotification: false, notificationId: null },
    submissionsWithReviews: {
      submissions: [
        {
          submissionId: 'qs-sub-3',
          hasNotification: false,
          notificationId: null,
          submission: {
            id: 'qs-sub-3',
            quantity_surveyor_task_id: 'qs-task-3',
            description: 'Full quantity take-off completed. Steel tonnage calculated at 42 metric tons.',
            attachment_urls: ['https://placehold.co/800x480/334155/f8fafc?text=QTO+Results'],
            created_at: '2026-05-17T09:30:00Z',
            updated_at: null,
            reviews: [
              {
                id: 'qs-rev-2',
                quantity_surveyor_submission_id: 'qs-sub-3',
                reviewer_user_id: '1',
                reviewer_user: { id: '1', full_name: 'Alice Johnson', role: 'ceo' },
                review_outcome: 'approved',
                description: 'Excellent work, thorough and well-documented.',
                created_at: '2026-05-20T10:00:00Z',
                updated_at: null,
                hasNotification: true,
                notificationId: 'notif-qs-r2',
              },
            ],
          },
        },
      ],
      latestActivityTs: 1748350800000,
    },
    hasNestedNotification: true,
  },
  {
    id: 'qs-task-4',
    assigned_to_user_id: null,
    assigned_by_user_id: '1',
    title: 'Tender document pricing schedule',
    description: 'Prepare the pricing schedule and bill of quantities for the upcoming office tower tender.',
    status: 'pending',
    task_state: 'active',
    due_date: '2026-06-27T23:59:59Z',
    attachment_urls: null,
    updated_by: null,
    created_at: '2026-05-19T08:00:00Z',
    updated_at: null,
    assigned_by_user: { id: '1', full_name: 'Alice Johnson', role: 'ceo' },
    assigned_to_user: null,
    updated_by_user: null,
    taskNotification: { hasNotification: false, notificationId: null },
    submissionsWithReviews: {
      submissions: [],
      latestActivityTs: 0,
    },
    hasNestedNotification: false,
  },
  {
    id: 'qs-task-5',
    assigned_to_user_id: '11',
    assigned_by_user_id: '2',
    title: 'Value engineering for facade cladding',
    description: 'Analyse and propose cost-saving alternatives for the aluminium composite panel facade system.',
    status: 'in_progress',
    task_state: 'active',
    due_date: '2026-06-23T23:59:59Z',
    attachment_urls: null,
    updated_by: null,
    created_at: '2026-05-16T10:00:00Z',
    updated_at: '2026-05-19T09:00:00Z',
    assigned_by_user: { id: '2', full_name: 'Bob Smith', role: 'general_manager' },
    assigned_to_user: { id: '11', full_name: 'Oliver Grant', role: 'quantity_surveyor' },
    updated_by_user: null,
    taskNotification: { hasNotification: false, notificationId: null },
    submissionsWithReviews: {
      submissions: [
        {
          submissionId: 'qs-sub-5',
          hasNotification: false,
          notificationId: null,
          submission: {
            id: 'qs-sub-5',
            quantity_surveyor_task_id: 'qs-task-5',
            description: 'Identified 3 alternative cladding systems that reduce cost by 8-12% while meeting spec.',
            attachment_urls: ['https://placehold.co/800x480/475569/e2e8f0?text=VE+Analysis'],
            created_at: '2026-05-18T16:00:00Z',
            updated_at: null,
            review_status: 'REVISION_REQUIRED',
            reviews: [
              {
                id: 'qs-rev-3',
                quantity_surveyor_submission_id: 'qs-sub-5',
                reviewer_user_id: '1',
                reviewer_user: { id: '1', full_name: 'Alice Johnson', role: 'ceo' },
                review_outcome: 'feedback',
                description: 'Good alternatives identified. Please also include installation cost comparisons.',
                created_at: '2026-05-19T09:00:00Z',
                updated_at: null,
                hasNotification: true,
                notificationId: 'notif-qs-r3',
              },
            ],
          },
        },
      ],
      latestActivityTs: 1747659600000,
    },
    hasNestedNotification: true,
  },
];

export function resetQuantitySurveyorHighlightState() {
  viewedQuantitySurveyorCards.clear();
  quantitySurveyorNotificationIds = new Set<string>();
  markedTaskNotificationIds.clear();
  quantitySurveyorTaskCache.invalidate();
}

function loadLocalTasks(): QuantitySurveyorTaskItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as QuantitySurveyorTaskItem[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

function persistLocalTasks(tasksToSave: QuantitySurveyorTaskItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasksToSave));
  } catch { /* ignore */ }
}

function initLocalWithSeed(): QuantitySurveyorTaskItem[] {
  const existing = loadLocalTasks();
  if (existing.length > 0) return existing;
  persistLocalTasks(seedTasks);
  return seedTasks;
}

export function QuantitySurveyorTasks() {
  const { user } = useAuth();
  const { decrement } = useNotificationCounts();
  const [tasks, setTasks] = useState<QuantitySurveyorTaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [apiPage, setApiPage] = useState(1);
  const [meta, setMeta] = useState<QuantitySurveyorTaskListMeta | null>(null);
  const [displayOffset, setDisplayOffset] = useState(0);

  const [selectedTask, setSelectedTask] = useState<QuantitySurveyorTaskItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [submissionsLoading, setSubmissionsLoading] = useState<Record<string, boolean>>({});
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  const [editingSubmissionId, setEditingSubmissionId] = useState<string | null>(null);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewDraft, setReviewDraft] = useState<Record<string, string>>({});

  const [draftNote, setDraftNote] = useState<Record<string, string>>({});
  const [draftScreenshots, setDraftScreenshots] = useState<Record<string, string | null>>({});
  const [draftStatus, setDraftStatus] = useState<Record<string, string>>({});
  const draftFilesRef = useRef<Record<string, File[]>>({});
  const [submissionDraftLoading, setSubmissionDraftLoading] = useState<Record<string, boolean>>({});
  const [submissionError, setSubmissionError] = useState<Record<string, string>>({});
  const [reviewError, setReviewError] = useState<Record<string, string>>({});

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    instruction: '',
    deadline: '',
    assigned_to_user_id: '',
  });
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const screenshotFileRef = useRef<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [taskSuccessMsg, setTaskSuccessMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [quantitySurveyors, setQuantitySurveyors] = useState<UserItem[]>([]);

  // ── Edit Task state ──
  const [showEditTask, setShowEditTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', instruction: '', deadline: '', assigned_to_user_id: '' });
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

  const seenThisSession = useRef<Set<string>>(new Set());
  const observedElements = useRef<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const tasksRef = useRef<QuantitySurveyorTaskItem[]>([]);
  const pendingTaskNotifIds = useRef<Map<string, string>>(new Map());
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  useEffect(() => {
    if (user && !hasResetForSessionOnce) {
      resetQuantitySurveyorHighlightState();
      hasResetForSessionOnce = true;
    }
    if (!user) {
      hasResetForSessionOnce = false;
    }
  }, [user]);

  const highlightedIds = (() => {
    if (tasks.length === 0) return new Set<string>();
    quantitySurveyorNotificationIds = new Set(
      tasks.filter((t) => anyNotification(t)).map((t) => t.id)
    );
    return new Set(
      [...quantitySurveyorNotificationIds].filter((id) => !viewedQuantitySurveyorCards.has(id))
    );
  })();

  useEffect(() => {
    publishBadgeCount(highlightedIds.size);
  }, [highlightedIds]);

  const canManage = user?.role === 'ceo' || user?.role === 'general_manager';
  const canSubmit = user?.role === 'quantity_surveyor';
  const taskAllowsSubmit = selectedTask
    ? selectedTask.status !== 'rejected' && selectedTask.task_state === 'active'
    : false;

  const fetchTasks = useCallback(async (page: number, force = false): Promise<QuantitySurveyorTaskItem[] | undefined> => {
    if (!user) return;
    const cacheParams = { page, limit: ROWS_PER_DISPLAY };

    if (!force) {
      const cached = quantitySurveyorTaskCache.get(cacheParams);
      if (cached) {
        setTasks(cached.data);
        setMeta({
          total: cached.total,
          page,
          limit: ROWS_PER_DISPLAY,
          totalPages: Math.ceil(cached.total / ROWS_PER_DISPLAY),
        });
        quantitySurveyorNotificationIds = new Set(
          cached.data.filter((t) => anyNotification(t)).map((t) => t.id)
        );
        setIsLoading(false);
        return cached.data;
      }
    } else {
      quantitySurveyorTaskCache.invalidate(cacheParams);
    }
    setIsLoading(true);
    setError(null);

    const applyTasks = (data: QuantitySurveyorTaskItem[], total: number): QuantitySurveyorTaskItem[] => {
      setTasks(data);
      setMeta({ total, page, limit: ROWS_PER_DISPLAY, totalPages: Math.ceil(total / ROWS_PER_DISPLAY) });
      setDisplayOffset(0);

      quantitySurveyorNotificationIds = new Set(
        data.filter((t) => anyNotification(t)).map((t) => t.id)
      );
      return data;
    };

    try {
      const result = await quantitySurveyorTaskCache.fetch(cacheParams);
      return applyTasks(result.data, result.total);
    } catch {
      const local = initLocalWithSeed();
      const start = (page - 1) * ROWS_PER_DISPLAY;
      const paged = local.slice(start, start + ROWS_PER_DISPLAY);
      applyTasks(paged, local.length);
      setError(null);
      return paged;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchTasks(apiPage);
  }, [user, apiPage, fetchTasks]);

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
      if (!task || !hasNestedNotifications(task)) {
        viewedQuantitySurveyorCards.add(id);
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
          decrement('quantitySurveyorTasks');
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
          setTasks(updatedTasks as QuantitySurveyorTaskItem[]);
          tasksRef.current = updatedTasks as QuantitySurveyorTaskItem[];
          quantitySurveyorTaskCache.invalidate();
        })
        .catch(() => {
          markedTaskNotificationIds.delete(notifId);
        });
    }
  };

  useEffect(() => { return () => { commitSeenSession(); }; }, []);

  if (!user) return null;

  const sortedTasks = [...tasks].sort((a, b) => {
    const getLatestTs = (t: QuantitySurveyorTaskItem): number => {
      let max = Math.max(
        new Date(t.created_at).getTime(),
        t.updated_at ? new Date(t.updated_at).getTime() : 0
      );
      for (const w of getSubmissionWrappers(t)) {
        const s = w.submission;
        if (s.created_at) max = Math.max(max, new Date(s.created_at).getTime());
        if (s.updated_at) max = Math.max(max, new Date(s.updated_at).getTime());
        for (const r of (s.reviews || [])) {
          if (r.created_at) max = Math.max(max, new Date(r.created_at).getTime());
          if (r.updated_at) max = Math.max(max, new Date(r.updated_at).getTime());
        }
      }
      return max;
    };
    return getLatestTs(b) - getLatestTs(a);
  });

  const displayItems = sortedTasks.slice(displayOffset, displayOffset + ROWS_PER_DISPLAY);
  const canGoPrev = displayOffset > 0 || apiPage > 1;
  const canGoNext = displayOffset + ROWS_PER_DISPLAY < sortedTasks.length || (meta ? apiPage < meta.totalPages : false);

  const goNext = () => {
    if (displayOffset + ROWS_PER_DISPLAY < sortedTasks.length) {
      setDisplayOffset(displayOffset + ROWS_PER_DISPLAY);
    } else {
      quantitySurveyorTaskCache.invalidate({ page: apiPage, limit: ROWS_PER_DISPLAY });
      setApiPage((p) => p + 1);
    }
  };

  const goPrev = () => {
    if (displayOffset - ROWS_PER_DISPLAY >= 0) {
      setDisplayOffset(displayOffset - ROWS_PER_DISPLAY);
    } else {
      quantitySurveyorTaskCache.invalidate({ page: apiPage, limit: ROWS_PER_DISPLAY });
      setApiPage((p) => Math.max(1, p - 1));
    }
  };

  const getLatestActivity = (task: QuantitySurveyorTaskItem): {
    description: string;
    kind: 'review' | 'submission';
    outcome: string;
  } | null => {
    const wrappers = getSubmissionWrappers(task);
    let latestTs = 0;
    let latest: { description: string; kind: 'review' | 'submission'; outcome: string } | null = null;
    for (const w of wrappers) {
      const s = w.submission;
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
    return latest;
  };

  const openDetail = (task: QuantitySurveyorTaskItem) => {
    setSelectedTask(task);
    setDraftNote((prev) => ({ ...prev, [task.id]: '' }));
    setDraftScreenshots((prev) => ({ ...prev, [task.id]: null }));
    setDraftStatus((prev) => ({ ...prev, [task.id]: '' }));
    draftFilesRef.current = { ...draftFilesRef.current, [task.id]: [] };
    setExpandedSubmissionId(null);
    setShowDetail(true);
    setSubmissionError((prev) => ({ ...prev, [task.id]: '' }));
    setReviewError((prev) => ({ ...prev, [task.id]: '' }));

    const notifIds: string[] = [];
    const swr = task.submissionsWithReviews;
    const topNotif = (task as any).taskNotification;
    if (topNotif?.hasNotification && topNotif.notificationId && !markedTaskNotificationIds.has(topNotif.notificationId)) {
      notifIds.push(topNotif.notificationId);
    }
    if (swr?.taskNotification?.hasNotification && swr.taskNotification.notificationId && !markedTaskNotificationIds.has(swr.taskNotification.notificationId)) {
      notifIds.push(swr.taskNotification.notificationId);
    }
    (swr?.submissions || []).forEach((w) => {
      if (w.hasNotification && w.notificationId) notifIds.push(w.notificationId);
      (w.submission?.reviews || []).forEach((r) => {
        if (r.hasNotification && r.notificationId) notifIds.push(r.notificationId);
      });
    });

    if (notifIds.length > 0) {
      notificationApi.bulkMarkRead(notifIds).catch(() => {});
      decrement('quantitySurveyorTasks');

      const clearedSwr = swr
        ? {
            ...swr,
            taskNotification: { hasNotification: false, notificationId: null },
            submissions: swr.submissions.map((w) => ({
              ...w,
              hasNotification: false,
              notificationId: null,
              submission: {
                ...w.submission,
                reviews: (w.submission.reviews || []).map((r) => ({
                  ...r,
                  hasNotification: false,
                  notificationId: null,
                })),
              },
            })),
          }
        : swr;

      const clearedTask = { ...task, taskNotification: null, hasNestedNotification: false, submissionsWithReviews: clearedSwr } as QuantitySurveyorTaskItem;
      setSelectedTask(clearedTask);

      const updatedTasks = tasksRef.current.map((t) =>
        t.id === task.id ? clearedTask : t
      );
      setTasks(updatedTasks);
      tasksRef.current = updatedTasks;
      quantitySurveyorTaskCache.invalidate();

      viewedQuantitySurveyorCards.add(task.id);
    }
  };

  const closeDetail = () => {
    const taskId = selectedTask?.id;
    if (taskId && draftScreenshots[taskId]) {
      const url = draftScreenshots[taskId];
      if (url) URL.revokeObjectURL(url);
    }
    setSelectedTask(null);
    setShowDetail(false);
    setExpandedSubmissionId(null);
  };

  const handleFilesChange = (taskId: string, fileList: FileList | null) => {
    const oldUrl = draftScreenshots[taskId] ?? null;
    if (oldUrl) URL.revokeObjectURL(oldUrl);

    if (!fileList || fileList.length === 0) {
      setDraftScreenshots((prev) => ({ ...prev, [taskId]: null }));
      draftFilesRef.current = { ...draftFilesRef.current, [taskId]: [] };
      return;
    }

    const files = Array.from(fileList);
    draftFilesRef.current = { ...draftFilesRef.current, [taskId]: files };
    const objectUrl = URL.createObjectURL(files[0]);
    setDraftScreenshots((prev) => ({ ...prev, [taskId]: objectUrl }));
  };

  const handleReviewSubmission = async (taskId: string, subId: string, outcome: string) => {
    const note = reviewDraft[taskId] ?? '';
    setReviewError((prev) => ({ ...prev, [taskId]: '' }));

    let errorMsg: string | null = null;

    const addLocalReview = () => {
      const all = loadLocalTasks().length > 0 ? loadLocalTasks() : seedTasks;
      const now = new Date().toISOString();
      const reviewId = `qs-rev-${Date.now()}`;
      const newReview: QuantitySurveyorSubmissionReview = {
        id: reviewId,
        quantity_surveyor_submission_id: subId,
        reviewer_user_id: user?.id || '',
        reviewer_user: { id: user?.id || '', full_name: user?.full_name || 'Unknown', role: user?.role || '' },
        review_outcome: outcome,
        description: note.trim() || `Review: ${outcome}`,
        created_at: now,
        updated_at: null,
        hasNotification: true,
        notificationId: `notif-qs-${Date.now()}`,
      };
      const updated = all.map((t) =>
        t.id === taskId
          ? {
              ...t,
              updated_at: now,
              hasNestedNotification: true,
              taskNotification: { hasNotification: true, notificationId: t.taskNotification?.notificationId || `notif-qs-t${Date.now()}` },
              submissionsWithReviews: {
                ...t.submissionsWithReviews,
                submissions: (t.submissionsWithReviews?.submissions || []).map((w) =>
                  w.submission?.id === subId
                    ? {
                        ...w,
                        hasNotification: true,
                        notificationId: `notif-qs-${Date.now()}`,
                        submission: {
                          ...w.submission,
                          reviews: [...(w.submission?.reviews || []), newReview],
                        },
                      }
                    : w
                ),
                latestActivityTs: Date.now(),
              },
            }
          : t
      );
      persistLocalTasks(updated);
      quantitySurveyorTaskCache.invalidate();
      setTasks(updated);
      const updatedSelected = updated.find((t) => t.id === taskId);
      if (updatedSelected) setSelectedTask(updatedSelected);
    };

    try {
      const payload = {
        description: note.trim() || `Review: ${outcome}`,
        review_outcome: outcome,
        task_state: selectedTask?.task_state || 'active',
      };
      if (editingReviewId) {
        await quantitySurveyorApi.updateReview(editingReviewId, payload);
      } else {
        await quantitySurveyorApi.createReview(subId, payload);
      }
    } catch (err: unknown) {
      if (editingReviewId) {
        errorMsg =
          (err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : undefined) ||
          'Unable to update review. Please try again.';
      } else {
        addLocalReview();
        errorMsg = null;
      }
    }

    if (errorMsg) {
      setReviewError((prev) => ({ ...prev, [taskId]: errorMsg! }));
    } else {
      setEditingReviewId(null);
      setReviewDraft((prev) => ({ ...prev, [taskId]: '' }));
      const refreshedList = await fetchTasks(apiPage, true);
      if (refreshedList) {
        const refreshed = refreshedList.find((t) => t.id === taskId);
        if (refreshed) setSelectedTask(refreshed);
      }

      if (user) {
        const existing = loadQuantityReviewNotifications();
        const taskTitle = selectedTask?.title || `Task ${taskId}`;
        saveQuantityReviewNotifications([
          createGeneralNotification({
            type: 'qs_review',
            taskId,
            actorRole: user.role,
            message: `Quantity surveyor task reviewed: ${outcome}`,
            description: `Review submitted for quantity surveyor task: ${taskTitle} (${outcome})`,
          }),
          ...existing,
        ]);
      }
    }
  };

  const handleEditSubmission = (taskId: string, subId: string) => {
    if (!selectedTask) return;
    const wrapper = getSubmissionWrappers(selectedTask).find((w) => w.submission.id === subId);
    if (!wrapper) return;
    const sub = wrapper.submission;
    setEditingSubmissionId(subId);
    setDraftNote((prev) => ({ ...prev, [taskId]: sub.description || '' }));
    setDraftScreenshots((prev) => ({ ...prev, [taskId]: sub.attachment_urls?.[0] || null }));
    setDraftStatus((prev) => ({ ...prev, [taskId]: sub.review_status || '' }));
    draftFilesRef.current = { ...draftFilesRef.current, [taskId]: [] };
    setExpandedSubmissionId(subId);
    setSubmissionError((prev) => ({ ...prev, [taskId]: '' }));
  };

  const handleSubmitSubmission = async (taskId: string) => {
    const note = draftNote[taskId] ?? '';
    const files = draftFilesRef.current[taskId] ?? [];

    setSubmissionDraftLoading((prev) => ({ ...prev, [taskId]: true }));
    setSubmissionError((prev) => ({ ...prev, [taskId]: '' }));

    const isEditing = editingSubmissionId !== null;

    const addLocalSubmission = () => {
      const all = loadLocalTasks().length > 0 ? loadLocalTasks() : seedTasks;
      const now = new Date().toISOString();
      const subId = `qs-sub-${Date.now()}`;
      const statusVal = draftStatus[taskId] || undefined;
      const newWrapper: QuantitySurveyorSubmissionWrapper = {
        submissionId: subId,
        hasNotification: true,
        notificationId: `notif-qs-${Date.now()}`,
        submission: {
          id: subId,
          quantity_surveyor_task_id: taskId,
          description: note.trim() || 'Quantity surveyor submission',
          attachment_urls: files.length > 0 ? files.map((f) => URL.createObjectURL(f)) : null,
          created_at: now,
          updated_at: null,
          review_status: statusVal,
          reviews: [],
        },
      };
      const updated = all.map((t) =>
        t.id === taskId
          ? {
              ...t,
              updated_at: now,
              hasNestedNotification: true,
              taskNotification: { hasNotification: true, notificationId: t.taskNotification?.notificationId || `notif-qs-t${Date.now()}` },
              submissionsWithReviews: {
                ...t.submissionsWithReviews,
                submissions: [...(t.submissionsWithReviews?.submissions || []), newWrapper],
                latestActivityTs: Date.now(),
              },
            }
          : t
      );
      persistLocalTasks(updated);

      const existingIds = new Set(quantitySurveyorNotificationIds);
      existingIds.add(taskId);
      quantitySurveyorNotificationIds = existingIds;

      const updatedCache = all.map((t) =>
        t.id === taskId
          ? {
              ...t,
              updated_at: now,
              hasNestedNotification: true,
              taskNotification: { hasNotification: true, notificationId: t.taskNotification?.notificationId || `notif-qs-t${Date.now()}` },
              submissionsWithReviews: {
                ...t.submissionsWithReviews,
                submissions: [...(t.submissionsWithReviews?.submissions || []), newWrapper],
                latestActivityTs: Date.now(),
              },
            }
          : t
      );
      quantitySurveyorTaskCache.invalidate();
      setTasks(updatedCache);
      const updatedSelected = updatedCache.find((t) => t.id === taskId);
      if (updatedSelected) setSelectedTask(updatedSelected);
    };

    let errorMsg: string | null = null;

    try {
      const formData = new FormData();
      formData.append('description', note.trim() || 'Quantity surveyor submission');
      for (const file of files) {
        formData.append('attachmentFiles', file);
      }
      const statusVal = draftStatus[taskId];
      if (statusVal) {
        formData.append('status', statusVal);
      }

      const response = isEditing
        ? await quantitySurveyorApi.updateSubmission(editingSubmissionId!, formData)
        : await quantitySurveyorApi.createSubmission(taskId, formData);

      if (response.success) {
        const refreshedList = await fetchTasks(apiPage, true);
        if (refreshedList) {
          const refreshed = refreshedList.find((t) => t.id === taskId);
          if (refreshed) setSelectedTask(refreshed);
        }
      } else {
        errorMsg = response.message || 'Submission failed. Please refresh the page.';
        if (!isEditing) addLocalSubmission();
      }
    } catch (err: unknown) {
      if (!isEditing) {
        addLocalSubmission();
        errorMsg = null;
      } else {
        errorMsg =
          (err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : undefined) ||
          'Unable to connect to server. Please try again.';
      }
    } finally {
      setSubmissionDraftLoading((prev) => ({ ...prev, [taskId]: false }));
    }

    if (errorMsg) {
      setSubmissionError((prev) => ({ ...prev, [taskId]: errorMsg! }));
      if (!isEditing) {
        setEditingSubmissionId(null);
        const oldUrl = draftScreenshots[taskId] ?? null;
        if (oldUrl && oldUrl.startsWith('blob:')) URL.revokeObjectURL(oldUrl);
        setDraftScreenshots((prev) => ({ ...prev, [taskId]: null }));
        setDraftNote((prev) => ({ ...prev, [taskId]: '' }));
        setDraftStatus((prev) => ({ ...prev, [taskId]: '' }));
        draftFilesRef.current = { ...draftFilesRef.current, [taskId]: [] };
      }
    } else {
      setEditingSubmissionId(null);
      const oldUrl = draftScreenshots[taskId] ?? null;
      if (oldUrl && oldUrl.startsWith('blob:')) URL.revokeObjectURL(oldUrl);
      setDraftScreenshots((prev) => ({ ...prev, [taskId]: null }));
      setDraftNote((prev) => ({ ...prev, [taskId]: '' }));
      setDraftStatus((prev) => ({ ...prev, [taskId]: '' }));
      draftFilesRef.current = { ...draftFilesRef.current, [taskId]: [] };

      if (user) {
        const existing = loadQuantityReviewNotifications();
        const taskTitle = selectedTask?.title || note.trim() || 'Quantity surveyor submission';
        saveQuantityReviewNotifications([
          createGeneralNotification({
            type: 'qs_submission',
            taskId,
            actorRole: user.role,
            message: 'New quantity surveyor submission',
            description: `Quantity surveyor submitted work for task: ${taskTitle}`,
          }),
          ...existing,
        ]);
      }
    }
  };

  const openCreateModal = () => {
    setNewTaskForm({ title: '', description: '', instruction: '', deadline: '', assigned_to_user_id: '' });
    setScreenshotPreview(null);
    screenshotFileRef.current = null;
    setError(null);
    setTaskSuccessMsg('');
    setFieldErrors({});
    setShowCreateModal(true);
    userApi.getQuantitySurveyors().then((res) => {
      if (res.success) setQuantitySurveyors(res.data);
    }).catch(() => {});
  };

  const openEditTask = (task: QuantitySurveyorTaskItem) => {
    setEditingTaskId(task.id);
    setEditForm({
      title: task.title,
      description: task.description,
      instruction: '',
      deadline: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
      assigned_to_user_id: task.assigned_to_user_id || '',
    });
    setEditImagePreview(null);
    editImageFileRef.current = null;
    setEditFormErrors({});
    setEditError('');
    setShowEditTask(true);
    userApi.getQuantitySurveyors().then((res) => {
      if (res.success) setQuantitySurveyors(res.data);
    }).catch(() => {});
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTaskId) return;

    const title = editForm.title.trim();
    const description = editForm.description.trim();
    const instruction = editForm.instruction.trim();
    const deadline = editForm.deadline.trim();
    const assignedTo = editForm.assigned_to_user_id.trim();

    setEditError('');

    const errors: Record<string, string> = {};
    if (!title) errors.title = 'Title is required.';
    else if (title.length > 500) errors.title = 'Title must be 500 characters or fewer.';
    if (!description) errors.description = 'Description is required.';
    else if (description.length > 5000) errors.description = 'Description must be 5000 characters or fewer.';

    setEditFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const fullDescription = instruction
      ? `${description}\n\nInstructions:\n${instruction}`
      : description;

    setIsUpdating(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', fullDescription);
      if (deadline) {
        formData.append('due_date', new Date(deadline).toISOString());
      }
      formData.append('assigned_to_user_id', assignedTo || 'null');
      if (editImageFileRef.current) {
        formData.append('attachmentFiles', editImageFileRef.current);
      }

      const response = await quantitySurveyorApi.updateTask(editingTaskId, formData);

      if (response.success) {
        setTaskSuccessMsg(response.message || 'Quantity surveyor task updated successfully');
        setShowEditTask(false);
        setEditingTaskId(null);
        setEditFormErrors({});
        quantitySurveyorTaskCache.invalidate();
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
      const response = await quantitySurveyorApi.deleteTask(deletingTaskId);
      if (response.success) {
        const local = loadLocalTasks();
        persistLocalTasks(local.filter((t) => t.id !== deletingTaskId));
        setTaskSuccessMsg(response.message || 'Quantity surveyor task deleted successfully');
        setShowDeleteConfirm(false);
        setDeletingTaskId(null);
        quantitySurveyorTaskCache.invalidate();
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    screenshotFileRef.current = file;
    const reader = new FileReader();
    reader.onload = () => setScreenshotPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    const title = newTaskForm.title.trim();
    const description = newTaskForm.description.trim();
    const instruction = newTaskForm.instruction.trim();
    const deadline = newTaskForm.deadline.trim();
    const assignedTo = newTaskForm.assigned_to_user_id.trim();

    setError(null);
    setTaskSuccessMsg('');

    const errors: Record<string, string> = {};
    if (!title) errors.title = 'Title is required.';
    else if (title.length > 500) errors.title = 'Title must be 500 characters or fewer.';
    if (!description) errors.description = 'Description is required.';
    else if (description.length > 5000) errors.description = 'Description must be 5000 characters or fewer.';

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const fullDescription = instruction
      ? `${description}\n\nInstructions:\n${instruction}`
      : description;

    setIsCreating(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', fullDescription);
      if (deadline) {
        formData.append('due_date', new Date(deadline).toISOString());
      }
      if (assignedTo) {
        formData.append('assigned_to_user_id', assignedTo);
      }
      if (screenshotFileRef.current) {
        formData.append('attachmentFiles', screenshotFileRef.current);
      }

      const response = await quantitySurveyorApi.createTask(formData);

      if (response.success) {
        setTaskSuccessMsg(response.message || 'Quantity surveyor task created successfully');
        setNewTaskForm({ title: '', description: '', instruction: '', deadline: '', assigned_to_user_id: '' });
        setScreenshotPreview(null);
        screenshotFileRef.current = null;
        setFieldErrors({});
        setShowCreateModal(false);
        quantitySurveyorTaskCache.invalidate();
        await fetchTasks(apiPage, true);
      } else {
        setError(response.message || 'Failed to create task');
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg || 'Unable to connect to server. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const summary = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    completed: tasks.filter((t) => t.status === 'completed' || t.status === 'approved').length,
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
      <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Quantity Surveyor Assignment Desk</h2>
          <p className="mt-1 text-sm text-slate-600">
            Create and manage quantity surveying tasks with cost analysis and review submissions.
          </p>
          {highlightedIds.size > 0 && (
            <p className="mt-2 text-sm text-blue-600 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-semibold">
                {highlightedIds.size}
              </span>
              new {highlightedIds.size === 1 ? 'record' : 'records'} since your last visit
            </p>
          )}
        </div>
        {canManage && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 shrink-0"
          >
            <Plus className="h-4 w-4" />
            Create QS Task
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      )}

      {taskSuccessMsg && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 text-sm">{taskSuccessMsg}</div>
      )}

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

      {sortedTasks.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No quantity surveying tasks yet.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {displayItems.map((task) => {
              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'approved' && task.status !== 'completed';
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
                    <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${statusColor(task.status)}`}>
                      {statusDisplay(task.status)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                      Created by {getCreatorDisplayName(task)}
                    </span>
                    {task.assigned_to_user_id && (
                      <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                        Assigned to {getAssigneeDisplayName(task)}
                      </span>
                    )}
                    {getSubmissionWrappers(task).length > 0 && (
                      <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
                        {getSubmissionWrappers(task).length} submission{getSubmissionWrappers(task).length !== 1 ? 's' : ''}
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
                    {canManage && getSubmissionWrappers(task).length === 0 && (
                      <button
                        type="button"
                        onClick={() => openEditTask(task)}
                        className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit Task
                      </button>
                    )}
                    {canManage && canDeleteQuantitySurveyorTask(task) && (
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
                </div>
              );
            })}
          </div>
          {(meta && (meta.totalPages > 1 || sortedTasks.length > ROWS_PER_DISPLAY)) && (
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
                {sortedTasks.length > ROWS_PER_DISPLAY
                  ? `Showing ${displayOffset + 1}-${Math.min(displayOffset + ROWS_PER_DISPLAY, sortedTasks.length)} of ${meta.total}`
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
      {showDetail && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 py-6 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">Submission Detail</h3>
                <p className="mt-1 text-sm text-gray-500">View submissions and review feedback</p>
                {submissionsLoading[selectedTask.id] && (
                  <p className="text-xs text-blue-600 mt-1">Loading submission data...</p>
                )}
              </div>
              <button onClick={closeDetail} className="rounded-lg p-2 hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 px-6 py-5 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-5">
                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900">{selectedTask.title}</h4>
                      <p className="mt-1 text-sm text-gray-500">ID: {selectedTask.id}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${statusColor(selectedTask.status)}`}>
                      {statusDisplay(selectedTask.status)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                      Created by {getCreatorDisplayName(selectedTask)}
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                      Assigned to {getAssigneeDisplayName(selectedTask)}
                    </span>
                  </div>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Description</h5>
                  <p className="mt-2 text-sm text-gray-700">{selectedTask.description}</p>
                </section>

                {selectedTask.attachment_urls && selectedTask.attachment_urls.length > 0 && (
                  <section className="rounded-xl border border-gray-200 bg-white p-4">
                    <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-3 flex items-center gap-2">
                      <Paperclip className="w-4 h-4" />
                      Task Attachments
                    </h5>
                    <AttachmentViewer attachments={selectedTask.attachment_urls} />
                  </section>
                )}

                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-4">
                    Submissions &amp; Review Feedback
                  </h5>
                  {getSubmissionWrappers(selectedTask).length === 0 ? (
                    <p className="text-sm text-gray-500">No submissions yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {(() => {
                        const wrappers = getSubmissionWrappers(selectedTask);
                        const latestSubmissionId = wrappers.length > 0 ? wrappers[wrappers.length - 1].submission.id : null;
                        const editableWrappers = wrappers.filter((w) => w.submission.reviews.length === 0);
                        const latestEditable = editableWrappers.length > 0 ? editableWrappers[editableWrappers.length - 1] : null;
                        const taskActive = selectedTask.task_state === 'active';
                        const taskRejected = selectedTask.status === 'rejected';
                        const canEditSubmission = latestEditable && taskActive && !taskRejected && user?.role === 'quantity_surveyor';
                        const latestEditableId = canEditSubmission ? latestEditable!.submission.id : null;
                        const isEditingThis = editingSubmissionId !== null;
                        const taskApproved = selectedTask.status === 'approved';
                        const updatedAt = selectedTask.updated_at ? new Date(selectedTask.updated_at).getTime() : 0;
                        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                        const canReview = !taskApproved || updatedAt > oneWeekAgo;

                        return wrappers.map((wrapper, idx) => {
                        const sub = wrapper.submission;
                        const subHasNotification = wrapper.hasNotification ||
                          (sub.reviews || []).some((r) => r.hasNotification);
                        const isSubExpanded = expandedSubmissionId === sub.id;
                        const isThisLatestEditable = sub.id === latestEditableId;
                        const isLatestSubmission = sub.id === latestSubmissionId;

                        return (
                          <div key={sub.id} className={`border rounded-lg overflow-hidden ${subHasNotification ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}`}>
                            <button
                              type="button"
                              onClick={() => setExpandedSubmissionId(isSubExpanded ? null : sub.id)}
                              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                            >
                              <div className="flex items-center gap-3">
                                {subHasNotification && (
                                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                )}
                                <div>
                                  <span className="font-medium text-gray-800">Submission {idx + 1}</span>
                                  <span className="ml-2 text-xs text-gray-500">
                                    {new Date(sub.created_at).toLocaleString()}
                                  </span>
                                </div>
                                {(sub.reviews || []).length > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                                    {sub.reviews.length} review{sub.reviews.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                              {isSubExpanded ? (
                                <ChevronUp className="w-4 h-4 text-gray-500" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                              )}
                            </button>

                            {isSubExpanded && (
                              <div className="p-4 bg-white space-y-4">
                                {sub.description && (
                                  <div>
                                    <h6 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Submission Note</h6>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{sub.description}</p>
                                  </div>
                                )}

                                {sub.review_status && sub.review_status !== 'PENDING_REVIEW' && (
                                  <div>
                                    <h6 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</h6>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                      sub.review_status === 'APPROVED'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                      {sub.review_status === 'APPROVED' ? 'Approved' : 'Revision Required'}
                                    </span>
                                  </div>
                                )}

                                {sub.attachment_urls && sub.attachment_urls.length > 0 && (
                                  <div>
                                    <h6 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Attachments</h6>
                                    <AttachmentViewer attachments={sub.attachment_urls} />
                                  </div>
                                )}

                                {isThisLatestEditable && (
                                  <div className="pt-2">
                                    {isEditingThis && editingSubmissionId === sub.id ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingSubmissionId(null);
                                          setDraftNote((prev) => ({ ...prev, [selectedTask.id]: '' }));
                                          setDraftScreenshots((prev) => ({ ...prev, [selectedTask.id]: null }));
                                          setDraftStatus((prev) => ({ ...prev, [selectedTask.id]: '' }));
                                          draftFilesRef.current = { ...draftFilesRef.current, [selectedTask.id]: [] };
                                        }}
                                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-medium"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                        Cancel Edit
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleEditSubmission(selectedTask.id, sub.id)}
                                        className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                                      >
                                        Edit Submission
                                      </button>
                                    )}
                                  </div>
                                )}

                                {(sub.reviews || []).length > 0 && (
                                  <div className="border-t border-gray-100 pt-4">
                                    <h6 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Reviews</h6>
                                    <div className="space-y-2">
                                      {sub.reviews.map((review) => {
                                        const isReviewApproved = review.review_outcome === 'approved';
                                        const isReviewRejected = review.review_outcome === 'rejected';
                                        const isReviewFeedback = review.review_outcome === 'feedback';
                                        const ReviewIcon = isReviewApproved ? ThumbsUp : isReviewRejected ? ThumbsDown : MessageSquare;
                                        const reviewEntryColor = isReviewApproved
                                          ? 'bg-green-100 text-green-700'
                                          : isReviewRejected
                                          ? 'bg-red-100 text-red-700'
                                          : 'bg-yellow-100 text-yellow-700';
                                        const reviewStatusLabel = isReviewApproved
                                          ? 'Approved'
                                          : isReviewRejected
                                          ? 'Rejected'
                                          : 'Feedback Given';
                                        const reviewTs = new Date(review.created_at).getTime();
                                        const hasNewerReview = wrappers.some((w) =>
                                          (w.submission.reviews || []).some((r) => new Date(r.created_at).getTime() > reviewTs)
                                        );
                                        const hasNewerSubmission = wrappers.some((w) =>
                                          new Date(w.submission.created_at).getTime() > reviewTs
                                        );
                                        const canEditReview = review.reviewer_user_id === user?.id
                                          && selectedTask.task_state === 'active'
                                          && !hasNewerReview
                                          && !hasNewerSubmission;

                                        return (
                                          <div key={review.id} className={`border rounded-lg overflow-hidden ${review.hasNotification ? 'border-blue-400 ring-1 ring-blue-100' : 'border-gray-200'}`}>
                                            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50">
                                              {review.hasNotification && (
                                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                              )}
                                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${reviewEntryColor}`}>
                                                <ReviewIcon className="w-3 h-3" />
                                                {reviewStatusLabel}
                                              </span>
                                              <span className="text-xs text-gray-500">
                                                {new Date(review.created_at).toLocaleString()}
                                              </span>
                                              <span className="text-xs text-gray-400">
                                                by {review.reviewer_user?.full_name || `User ${review.reviewer_user_id.slice(0, 8)}`}
                                              </span>
                                              {canEditReview && editingReviewId !== review.id && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setEditingReviewId(review.id);
                                                    setReviewDraft((prev) => ({ ...prev, [selectedTask.id]: review.description || '' }));
                                                  }}
                                                  className="ml-auto flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                                >
                                                  <Edit className="w-3 h-3" /> Edit
                                                </button>
                                              )}
                                              {editingReviewId === review.id && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setEditingReviewId(null);
                                                    setReviewDraft((prev) => ({ ...prev, [selectedTask.id]: '' }));
                                                    setReviewError((prev) => ({ ...prev, [selectedTask.id]: '' }));
                                                  }}
                                                  className="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium"
                                                >
                                                  <X className="w-3 h-3" /> Cancel Edit
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
                                  </div>
                                )}

                                {canManage && isLatestSubmission && selectedTask.task_state === 'active' && (
                                  <div className="border-t border-gray-100 pt-3">
                                    <h6 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                      {editingReviewId ? 'Update Review' : 'Review &amp; Decision'}
                                    </h6>
                                    <textarea
                                      rows={2}
                                      value={reviewDraft[selectedTask.id] ?? ''}
                                      onChange={(e) => setReviewDraft((prev) => ({ ...prev, [selectedTask.id]: e.target.value }))}
                                      placeholder="Your feedback or reason..."
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm mb-2"
                                    />
                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleReviewSubmission(selectedTask.id, sub.id, 'approved')}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-300 hover:bg-green-100 transition-colors"
                                      >
                                        <ThumbsUp className="w-3.5 h-3.5" /> Approve
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleReviewSubmission(selectedTask.id, sub.id, 'rejected')}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-300 hover:bg-red-100 transition-colors"
                                      >
                                        <ThumbsDown className="w-3.5 h-3.5" /> Reject
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleReviewSubmission(selectedTask.id, sub.id, 'feedback')}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100 transition-colors"
                                      >
                                        <Send className="w-3.5 h-3.5" /> {editingReviewId ? 'Update Feedback' : 'Feedback'}
                                      </button>
                                    </div>
                                    {reviewError[selectedTask.id] && (
                                      <p className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{reviewError[selectedTask.id]}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                    </div>
                  )}
                </section>

                {canSubmit && taskAllowsSubmit && (
                  <section className="rounded-xl border border-dashed border-gray-300 bg-blue-50/50 p-4">
                    <h6 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      {editingSubmissionId ? 'Update' : 'Submit'} to this Task
                    </h6>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                        <textarea
                          rows={3}
                          value={draftNote[selectedTask.id] ?? ''}
                          onChange={(e) =>
                            setDraftNote((prev) => ({
                              ...prev,
                              [selectedTask.id]: e.target.value,
                            }))
                          }
                          placeholder="Describe your submission..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Status <span className="text-gray-400 text-xs ml-1">(optional)</span>
                        </label>
                        <select
                          value={draftStatus[selectedTask.id] ?? ''}
                          onChange={(e) =>
                            setDraftStatus((prev) => ({
                              ...prev,
                              [selectedTask.id]: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">No status</option>
                          <option value="REVISION_REQUIRED">Revision Required</option>
                          <option value="APPROVED">Approved</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          File Attachments <span className="text-gray-400 text-xs ml-1">(optional)</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-700">
                            <Upload className="w-4 h-4" />
                            {draftFilesRef.current[selectedTask.id]?.length
                              ? `${draftFilesRef.current[selectedTask.id].length} file(s) selected`
                              : draftScreenshots[selectedTask.id]
                              ? 'Change Files'
                              : 'Choose Files'}
                            <input
                              type="file"
                              multiple
                              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.rar"
                              onChange={(e) => handleFilesChange(selectedTask.id, e.target.files)}
                              className="hidden"
                            />
                          </label>
                          {(draftScreenshots[selectedTask.id] || (draftFilesRef.current[selectedTask.id]?.length ?? 0) > 0) && (
                            <button
                              type="button"
                              onClick={() => {
                                const oldUrl = draftScreenshots[selectedTask.id] ?? null;
                                if (oldUrl) URL.revokeObjectURL(oldUrl);
                                setDraftScreenshots((prev) => ({ ...prev, [selectedTask.id]: null }));
                                draftFilesRef.current = { ...draftFilesRef.current, [selectedTask.id]: [] };
                              }}
                              className="text-sm text-red-600 hover:underline"
                            >
                              Remove All
                            </button>
                          )}
                        </div>
                        {draftScreenshots[selectedTask.id] && (
                          <img
                            src={draftScreenshots[selectedTask.id]!}
                            alt="preview"
                            className="mt-2 w-full max-h-40 rounded-lg border object-contain"
                          />
                        )}
                      </div>
                      <button
                        onClick={() => handleSubmitSubmission(selectedTask.id)}
                        disabled={submissionDraftLoading[selectedTask.id]}
                        className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-sm transition-colors"
                      >
                        {submissionDraftLoading[selectedTask.id]
                          ? (editingSubmissionId ? 'Updating...' : 'Submitting...')
                          : (editingSubmissionId ? 'Update' : 'Submit')}
                      </button>
                      {submissionError[selectedTask.id] && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{submissionError[selectedTask.id]}</p>
                      )}
                    </div>
                  </section>
                )}
              </div>
              <aside className="space-y-4">
                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Timeline</h5>
                  <div className="mt-2 space-y-2 text-sm text-gray-700">
                    <p>Deadline: {selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString() : 'No deadline'}</p>
                    <p>Created: {new Date(selectedTask.created_at).toLocaleDateString()}</p>
                    <p>Assigned by: {getCreatorDisplayName(selectedTask)}</p>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </div>
      )}
      {showCreateModal && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Create Quantity Surveying Task</h3>
                <p className="text-sm text-gray-500 mt-0.5">Fill in the task details and attach evidence. Fields marked with <span className="text-red-500">*</span> are required.</p>
              </div>
              <button onClick={() => { if (!isCreating) { setShowCreateModal(false); setError(null); setFieldErrors({}); } }} className="p-2 rounded-lg hover:bg-gray-100" disabled={isCreating}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="px-6 py-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  value={newTaskForm.title}
                  onChange={(e) => { setNewTaskForm((f) => ({ ...f, title: e.target.value })); if (fieldErrors.title) setFieldErrors((prev) => { const n = { ...prev }; delete n.title; return n; }); }}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm ${fieldErrors.title ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                  disabled={isCreating}
                />
                {fieldErrors.title && <p className="text-xs text-red-600 mt-1">{fieldErrors.title}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={newTaskForm.description}
                  onChange={(e) => { setNewTaskForm((f) => ({ ...f, description: e.target.value })); if (fieldErrors.description) setFieldErrors((prev) => { const n = { ...prev }; delete n.description; return n; }); }}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm ${fieldErrors.description ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                  disabled={isCreating}
                />
                {fieldErrors.description && <p className="text-xs text-red-600 mt-1">{fieldErrors.description}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Assign To (optional)</label>
                <select
                  value={newTaskForm.assigned_to_user_id}
                  onChange={(e) => setNewTaskForm((f) => ({ ...f, assigned_to_user_id: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                  disabled={isCreating}
                >
                  <option value="">Unassigned</option>
                  {quantitySurveyors.map((d) => (
                    <option key={d.id} value={d.id}>{d.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Instruction (optional)</label>
                <textarea
                  rows={3}
                  value={newTaskForm.instruction}
                  onChange={(e) => setNewTaskForm((f) => ({ ...f, instruction: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                  disabled={isCreating}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Deadline (optional)</label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={newTaskForm.deadline}
                  onChange={(e) => setNewTaskForm((f) => ({ ...f, deadline: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                  disabled={isCreating}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Evidence Screenshot (optional)</label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm">
                    <Image className="w-4 h-4" />
                    Choose Image
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isCreating} />
                  </label>
                  {screenshotPreview && (
                    <button
                      type="button"
                      onClick={() => { setScreenshotPreview(null); screenshotFileRef.current = null; }}
                      className="text-sm text-red-600 hover:underline"
                      disabled={isCreating}
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
                  onClick={() => { setShowCreateModal(false); setError(null); setFieldErrors({}); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
                  disabled={isCreating}
                >
                  {isCreating ? 'Creating...' : (
                    <><Send className="h-4 w-4" />Create Task</>
                  )}
                </button>
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditTask && editingTaskId && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Edit Quantity Surveying Task</h3>
                <p className="text-sm text-gray-500 mt-0.5">Update the task details. Fields marked with <span className="text-red-500">*</span> are required.</p>
              </div>
              <button onClick={() => { if (!isUpdating) { if (editImagePreview) URL.revokeObjectURL(editImagePreview); setShowEditTask(false); setEditingTaskId(null); setEditFormErrors({}); setEditError(''); } }} className="p-2 rounded-lg hover:bg-gray-100" disabled={isUpdating}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleEditTask} className="px-6 py-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  value={editForm.title}
                  onChange={(e) => { setEditForm({ ...editForm, title: e.target.value }); if (editFormErrors.title) setEditFormErrors((prev) => { const n = { ...prev }; delete n.title; return n; }); }}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm ${editFormErrors.title ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                  disabled={isUpdating}
                />
                {editFormErrors.title && <p className="text-xs text-red-600 mt-1">{editFormErrors.title}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => { setEditForm({ ...editForm, description: e.target.value }); if (editFormErrors.description) setEditFormErrors((prev) => { const n = { ...prev }; delete n.description; return n; }); }}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm ${editFormErrors.description ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                  disabled={isUpdating}
                />
                {editFormErrors.description && <p className="text-xs text-red-600 mt-1">{editFormErrors.description}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Assign To (optional)</label>
                <select
                  value={editForm.assigned_to_user_id}
                  onChange={(e) => setEditForm({ ...editForm, assigned_to_user_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                  disabled={isUpdating}
                >
                  <option value="">Unassigned</option>
                  {quantitySurveyors.map((d) => (
                    <option key={d.id} value={d.id}>{d.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Instruction (optional)</label>
                <textarea
                  rows={3}
                  value={editForm.instruction}
                  onChange={(e) => setEditForm({ ...editForm, instruction: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                  disabled={isUpdating}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Deadline (optional)</label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={editForm.deadline}
                  onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                  disabled={isUpdating}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Evidence Screenshot (optional)</label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm">
                    <Image className="w-4 h-4" />
                    Choose Image
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
                    <button
                      type="button"
                      onClick={() => { if (editImagePreview) URL.revokeObjectURL(editImagePreview); setEditImagePreview(null); editImageFileRef.current = null; }}
                      className="text-sm text-red-600 hover:underline"
                      disabled={isUpdating}
                    >
                      Remove
                    </button>
                  )}
                </div>
                {editImagePreview && (
                  <img
                    src={editImagePreview}
                    alt="preview"
                    className="mt-3 max-h-48 rounded-lg border object-contain"
                  />
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { if (editImagePreview) URL.revokeObjectURL(editImagePreview); setShowEditTask(false); setEditingTaskId(null); setEditFormErrors({}); setEditError(''); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-300"
                  disabled={isUpdating}
                >
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

export default QuantitySurveyorTasks;
