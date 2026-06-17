import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import dataCollectorApi, {
  DataCollectorTaskItem,
  DataCollectorTaskListMeta,
  DataCollectorSubmissionRaw,
  DataCollectorSubmissionWrapper,
  DataCollectorSubmissionReview,
} from '../../api/dataCollectorApi';
import notificationApi from '../../api/notificationApi';
import userApi, { UserItem } from '../../api/userApi';
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
} from 'lucide-react';

// ------------ NOTIFICATIONS / HIGHLIGHT ------------
export const DATA_COLLECTOR_NOTIFICATIONS_KEY = 'data-collector-notifications-updated';

const viewedDataCollectorCards = new Set<string>();
let dataCollectorNotificationIds = new Set<string>();
const markedTaskNotificationIds = new Set<string>();

function publishBadgeCount(count: number) {
  window.dispatchEvent(
    new CustomEvent(DATA_COLLECTOR_NOTIFICATIONS_KEY, { detail: count })
  );
}

export function getUnseenDataCollectorHighlightedIds() {
  return new Set(
    [...dataCollectorNotificationIds].filter((id) => !viewedDataCollectorCards.has(id))
  );
}

export function getUnseenDataCollectorCount() {
  return getUnseenDataCollectorHighlightedIds().size;
}

// ------------ HELPERS ------------

function getAssigneeDisplayName(task: DataCollectorTaskItem): string {
  if (task.assigned_to_user?.full_name) return task.assigned_to_user.full_name;
  if (task.assigned_to_user_id) return `User ${task.assigned_to_user_id.slice(0, 8)}`;
  return 'Unassigned';
}

function getCreatorDisplayName(task: DataCollectorTaskItem): string {
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

function getSubmissions(task: DataCollectorTaskItem): DataCollectorSubmissionRaw[] {
  return (task.submissionsWithReviews?.submissions || []).map((w) => w.submission);
}

function getSubmissionWrappers(task: DataCollectorTaskItem): DataCollectorSubmissionWrapper[] {
  return task.submissionsWithReviews?.submissions || [];
}

function anyNotification(task: DataCollectorTaskItem): boolean {
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

function hasNestedNotifications(task: DataCollectorTaskItem): boolean {
  const swr = task.submissionsWithReviews;
  return (
    task.hasNestedNotification ||
    (swr?.submissions || []).some(
      (w) => w.hasNotification || (w.submission?.reviews || []).some((r) => r.hasNotification)
    )
  );
}

const ROWS_PER_DISPLAY = 10;

const STORAGE_KEY = 'data-collector-tasks-v3';

// ── Seed data (matches backend response shape exactly) ──
const seedTasks: DataCollectorTaskItem[] = [
  {
    id: 'dc-task-1',
    assigned_to_user_id: '4',
    assigned_by_user_id: '2',
    title: 'Collect site measurements',
    description: 'Measure the assigned site and record room dimensions.',
    status: 'in_progress',
    task_state: 'active',
    due_date: '2026-06-25T23:59:59Z',
    attachment_urls: ['https://placehold.co/800x480/0f172a/f8fafc?text=Site+Measurements'],
    updated_by: null,
    created_at: '2026-05-18T08:00:00Z',
    updated_at: '2026-05-19T12:10:00Z',
    assigned_by_user: { id: '2', full_name: 'Bob Smith', role: 'general_manager' },
    assigned_to_user: { id: '4', full_name: 'Michael Brown', role: 'data_collector' },
    updated_by_user: null,
    taskNotification: { hasNotification: true, notificationId: 'notif-dc-t1' },
    submissionsWithReviews: {
      submissions: [
        {
          submissionId: 'dc-sub-1',
          hasNotification: true,
          notificationId: 'notif-dc-1',
          submission: {
            id: 'dc-sub-1',
            data_collector_task_id: 'dc-task-1',
            description: 'Captured all room dimensions and access points. Photos attached.',
            attachment_urls: ['https://placehold.co/800x480/0f172a/f8fafc?text=Telegram+Preview'],
            created_at: '2026-05-19T12:10:00Z',
            updated_at: null,
            reviews: [
              {
                id: 'dc-rev-1',
                data_collector_submission_id: 'dc-sub-1',
                reviewer_user_id: '1',
                reviewer_user: { id: '1', full_name: 'Alice Johnson', role: 'ceo' },
                review_outcome: 'feedback',
                description: 'Good work, but please also measure the utility access points.',
                created_at: '2026-05-20T10:00:00Z',
                updated_at: null,
                hasNotification: true,
                notificationId: 'notif-dc-r1',
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
    id: 'dc-task-2',
    assigned_to_user_id: '7',
    assigned_by_user_id: '1',
    title: 'Update customer survey sheet',
    description: 'Verify field entries and correct any missing contact details.',
    status: 'in_progress',
    task_state: 'active',
    due_date: '2026-06-22T23:59:59Z',
    attachment_urls: null,
    updated_by: null,
    created_at: '2026-05-17T10:00:00Z',
    updated_at: '2026-05-18T15:42:00Z',
    assigned_by_user: { id: '1', full_name: 'Alice Johnson', role: 'ceo' },
    assigned_to_user: { id: '7', full_name: 'Robert Taylor', role: 'data_collector' },
    updated_by_user: null,
    taskNotification: { hasNotification: true, notificationId: 'notif-dc-t2' },
    submissionsWithReviews: {
      submissions: [
        {
          submissionId: 'dc-sub-2',
          hasNotification: true,
          notificationId: 'notif-dc-2',
          submission: {
            id: 'dc-sub-2',
            data_collector_task_id: 'dc-task-2',
            description: 'Fixed missing phone numbers and attached verification screenshot.',
            attachment_urls: ['https://placehold.co/800x480/1e293b/e2e8f0?text=Survey+Update'],
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
    id: 'dc-task-3',
    assigned_to_user_id: '7',
    assigned_by_user_id: '2',
    title: 'Photograph property exterior',
    description: 'Take clear, well-lit photos of the front, back, and side elevations.',
    status: 'completed',
    task_state: 'active',
    due_date: '2026-06-20T23:59:59Z',
    attachment_urls: ['https://placehold.co/800x480/334155/f8fafc?text=Exterior+Photo'],
    updated_by: null,
    created_at: '2026-05-15T08:00:00Z',
    updated_at: '2026-05-20T10:00:00Z',
    assigned_by_user: { id: '2', full_name: 'Bob Smith', role: 'general_manager' },
    assigned_to_user: { id: '7', full_name: 'Robert Taylor', role: 'data_collector' },
    updated_by_user: null,
    taskNotification: { hasNotification: false, notificationId: null },
    submissionsWithReviews: {
      submissions: [
        {
          submissionId: 'dc-sub-3',
          hasNotification: false,
          notificationId: null,
          submission: {
            id: 'dc-sub-3',
            data_collector_task_id: 'dc-task-3',
            description: 'Photos uploaded, all angles covered.',
            attachment_urls: ['https://placehold.co/800x480/334155/f8fafc?text=Exterior+Front'],
            created_at: '2026-05-17T09:30:00Z',
            updated_at: null,
            reviews: [
              {
                id: 'dc-rev-2',
                data_collector_submission_id: 'dc-sub-3',
                reviewer_user_id: '1',
                reviewer_user: { id: '1', full_name: 'Alice Johnson', role: 'ceo' },
                review_outcome: 'approved',
                description: 'Excellent coverage, please also capture the rear garden next time.',
                created_at: '2026-05-20T10:00:00Z',
                updated_at: null,
                hasNotification: true,
                notificationId: 'notif-dc-r2',
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
    id: 'dc-task-4',
    assigned_to_user_id: null,
    assigned_by_user_id: '1',
    title: 'Record utility meter readings',
    description: 'Photograph and log gas, electricity, and water meter readings for the property.',
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
    id: 'dc-task-5',
    assigned_to_user_id: '8',
    assigned_by_user_id: '2',
    title: 'Verify client contact information',
    description: 'Call or visit the client to confirm phone numbers, email, and postal address.',
    status: 'in_progress',
    task_state: 'active',
    due_date: '2026-06-23T23:59:59Z',
    attachment_urls: null,
    updated_by: null,
    created_at: '2026-05-16T10:00:00Z',
    updated_at: '2026-05-19T09:00:00Z',
    assigned_by_user: { id: '2', full_name: 'Bob Smith', role: 'general_manager' },
    assigned_to_user: { id: '8', full_name: 'Emily Davis', role: 'data_collector' },
    updated_by_user: null,
    taskNotification: { hasNotification: false, notificationId: null },
    submissionsWithReviews: {
      submissions: [
        {
          submissionId: 'dc-sub-5',
          hasNotification: false,
          notificationId: null,
          submission: {
            id: 'dc-sub-5',
            data_collector_task_id: 'dc-task-5',
            description: 'Spoke with the client; updated phone number and verified email.',
            attachment_urls: ['https://placehold.co/800x480/475569/e2e8f0?text=Verification'],
            created_at: '2026-05-18T16:00:00Z',
            updated_at: null,
            reviews: [
              {
                id: 'dc-rev-3',
                data_collector_submission_id: 'dc-sub-5',
                reviewer_user_id: '1',
                reviewer_user: { id: '1', full_name: 'Alice Johnson', role: 'ceo' },
                review_outcome: 'feedback',
                description: 'Looks good, but please double-check the postal code.',
                created_at: '2026-05-19T09:00:00Z',
                updated_at: null,
                hasNotification: true,
                notificationId: 'notif-dc-r3',
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

// Module-level cache
let cachedTasks: DataCollectorTaskItem[] | null = null;
let cachedMeta: DataCollectorTaskListMeta | null = null;

function loadLocalTasks(): DataCollectorTaskItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as DataCollectorTaskItem[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

function persistLocalTasks(tasksToSave: DataCollectorTaskItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasksToSave));
  } catch { /* ignore */ }
}

function initLocalWithSeed(): DataCollectorTaskItem[] {
  const existing = loadLocalTasks();
  if (existing.length > 0) return existing;
  persistLocalTasks(seedTasks);
  return seedTasks;
}

export function DataCollectorTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<DataCollectorTaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [apiPage, setApiPage] = useState(1);
  const [meta, setMeta] = useState<DataCollectorTaskListMeta | null>(null);
  const [displayOffset, setDisplayOffset] = useState(0);

  const [selectedTask, setSelectedTask] = useState<DataCollectorTaskItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [submissionsLoading, setSubmissionsLoading] = useState<Record<string, boolean>>({});
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  const [editingSubmissionId, setEditingSubmissionId] = useState<string | null>(null);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewDraft, setReviewDraft] = useState<Record<string, string>>({});

  const [draftNote, setDraftNote] = useState<Record<string, string>>({});
  const [draftScreenshots, setDraftScreenshots] = useState<Record<string, string | null>>({});
  const draftFilesRef = useRef<Record<string, File[]>>({});
  const [submissionDraftLoading, setSubmissionDraftLoading] = useState<Record<string, boolean>>({});

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
  const [dataCollectors, setDataCollectors] = useState<UserItem[]>([]);

  const [imageViewerSrc, setImageViewerSrc] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageZoom, setImageZoom] = useState(1);

  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const seenThisSession = useRef<Set<string>>(new Set());
  const observedElements = useRef<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const tasksRef = useRef<DataCollectorTaskItem[]>([]);
  const pendingTaskNotifIds = useRef<Map<string, string>>(new Map());
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  useEffect(() => {
    if (tasks.length === 0) return;
    dataCollectorNotificationIds = new Set(
      tasks.filter((t) => anyNotification(t)).map((t) => t.id)
    );
    const remaining = new Set(
      [...dataCollectorNotificationIds].filter((id) => !viewedDataCollectorCards.has(id))
    );
    setHighlightedIds(remaining);
    publishBadgeCount(remaining.size);
  }, [tasks]);

  const canManage = user?.role === 'ceo' || user?.role === 'general_manager';
  const canSubmit = user?.role === 'data_collector';
  const taskAllowsSubmit = selectedTask
    ? selectedTask.status !== 'rejected' && selectedTask.task_state === 'active'
    : false;

  const fetchTasks = useCallback(async (page: number, force = false) => {
    if (!user) return;
    if (!force && cachedTasks && cachedMeta) {
      setTasks(cachedTasks);
      setMeta(cachedMeta);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    const applyTasks = (data: DataCollectorTaskItem[], total: number) => {
      setTasks(data);
      setMeta({ total, page, limit: ROWS_PER_DISPLAY, totalPages: Math.ceil(total / ROWS_PER_DISPLAY) });
      cachedTasks = data;
      cachedMeta = { total, page, limit: ROWS_PER_DISPLAY, totalPages: Math.ceil(total / ROWS_PER_DISPLAY) };
      setDisplayOffset(0);

      dataCollectorNotificationIds = new Set(
        data.filter((t) => anyNotification(t)).map((t) => t.id)
      );
      const unseen = new Set([...dataCollectorNotificationIds].filter((id) => !viewedDataCollectorCards.has(id)));
      setHighlightedIds(unseen);
      publishBadgeCount(unseen.size);
    };

    try {
      const response = await dataCollectorApi.getDataCollectorTasks({ page, limit: ROWS_PER_DISPLAY });
      if (response.success) {
        applyTasks(response.data, response.meta.total);
        // Sync API data back to localStorage as cache
        persistLocalTasks(response.data);
      } else {
        // API returned error — fallback to localStorage
        const local = initLocalWithSeed();
        const start = (page - 1) * ROWS_PER_DISPLAY;
        const paged = local.slice(start, start + ROWS_PER_DISPLAY);
        applyTasks(paged, local.length);
        setError(null); // clear error — we have fallback data
      }
    } catch {
      // API unreachable — fallback to localStorage
      const local = initLocalWithSeed();
      const start = (page - 1) * ROWS_PER_DISPLAY;
      const paged = local.slice(start, start + ROWS_PER_DISPLAY);
      applyTasks(paged, local.length);
      setError(null);
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
        viewedDataCollectorCards.add(id);
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
          setTasks(updatedTasks as DataCollectorTaskItem[]);
          tasksRef.current = updatedTasks as DataCollectorTaskItem[];
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
            ) as DataCollectorTaskItem[];
          }
          dataCollectorNotificationIds = new Set(
            updatedTasks.filter((t) => anyNotification(t)).map((t) => t.id)
          );
          const remaining = new Set(
            [...dataCollectorNotificationIds].filter((id) => !viewedDataCollectorCards.has(id))
          );
          setHighlightedIds(remaining);
          publishBadgeCount(remaining.size);
        })
        .catch(() => {
          markedTaskNotificationIds.delete(notifId);
        });
    }
    
    dataCollectorNotificationIds = new Set(
      currentTasks.filter((t) => anyNotification(t)).map((t) => t.id)
    );
    const remainingUnseen = new Set(
      [...dataCollectorNotificationIds].filter((id) => !viewedDataCollectorCards.has(id))
    );
    setHighlightedIds(remainingUnseen);
    publishBadgeCount(remainingUnseen.size);
  };

  useEffect(() => { return () => { commitSeenSession(); }; }, []);

  if (!user) return null;

  const sortedTasks = [...tasks].sort((a, b) => {
    const getLatestTs = (t: DataCollectorTaskItem): number => {
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
      cachedTasks = null;
      cachedMeta = null;
      setApiPage((p) => p + 1);
    }
  };

  const goPrev = () => {
    if (displayOffset - ROWS_PER_DISPLAY >= 0) {
      setDisplayOffset(displayOffset - ROWS_PER_DISPLAY);
    } else {
      cachedTasks = null;
      cachedMeta = null;
      setApiPage((p) => Math.max(1, p - 1));
    }
  };

  const getLatestActivity = (task: DataCollectorTaskItem): {
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

  const openDetail = (task: DataCollectorTaskItem) => {
    setSelectedTask(task);
    setDraftNote((prev) => ({ ...prev, [task.id]: '' }));
    setDraftScreenshots((prev) => ({ ...prev, [task.id]: null }));
    draftFilesRef.current = { ...draftFilesRef.current, [task.id]: [] };
    setExpandedSubmissionId(null);
    setShowDetail(true);

    const notifIds: string[] = [];
    const swr = task.submissionsWithReviews;
    (swr?.submissions || []).forEach((w) => {
      if (w.hasNotification && w.notificationId) notifIds.push(w.notificationId);
      (w.submission?.reviews || []).forEach((r) => {
        if (r.hasNotification && r.notificationId) notifIds.push(r.notificationId);
      });
    });

    if (notifIds.length > 0) {
      notificationApi.bulkMarkRead(notifIds).catch(() => {});

      const clearedSwr = swr
        ? {
            ...swr,
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

      const clearedTask = { ...task, hasNestedNotification: false, submissionsWithReviews: clearedSwr } as DataCollectorTaskItem;
      setSelectedTask(clearedTask);

      const updatedTasks = tasksRef.current.map((t) =>
        t.id === task.id ? clearedTask : t
      );
      setTasks(updatedTasks);
      tasksRef.current = updatedTasks;
      if (cachedTasks) {
        cachedTasks = cachedTasks.map((t) => (t.id === task.id ? clearedTask : t));
      }

      if (!anyNotification(clearedTask)) {
        viewedDataCollectorCards.add(task.id);
      }
      dataCollectorNotificationIds = new Set(
        updatedTasks.filter((t) => anyNotification(t)).map((t) => t.id)
      );
      const remaining = new Set(
        [...dataCollectorNotificationIds].filter((id) => !viewedDataCollectorCards.has(id))
      );
      setHighlightedIds(remaining);
      publishBadgeCount(remaining.size);
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
    try {
      const payload = {
        description: note.trim() || `Review: ${outcome}`,
        review_outcome: outcome,
        task_state: selectedTask?.task_state || 'active',
      };
      if (editingReviewId) {
        await dataCollectorApi.updateReview(editingReviewId, payload);
        setEditingReviewId(null);
      } else {
        await dataCollectorApi.createReview(subId, payload);
      }

      await fetchTasks(apiPage, true);
      if (cachedTasks) {
        const refreshed = cachedTasks.find((t) => t.id === taskId);
        if (refreshed) setSelectedTask(refreshed);
      }
      setReviewDraft((prev) => ({ ...prev, [taskId]: '' }));
    } catch {
      setError('Unable to submit review');
    }
  };

  const handleEditSubmission = (taskId: string, subId: string) => {
    const wrappers = getSubmissionWrappers(selectedTask || { submissionsWithReviews: { submissions: [], latestActivityTs: 0 }, taskNotification: { hasNotification: false, notificationId: null }, hasNestedNotification: false } as DataCollectorTaskItem);
    const wrapper = getSubmissionWrappers(selectedTask!).find((w) => w.submission.id === subId);
    if (!wrapper) return;
    const sub = wrapper.submission;
    setEditingSubmissionId(subId);
    setDraftNote((prev) => ({ ...prev, [taskId]: sub.description || '' }));
    setDraftScreenshots((prev) => ({ ...prev, [taskId]: sub.attachment_urls?.[0] || null }));
    draftFilesRef.current = { ...draftFilesRef.current, [taskId]: [] };
    setExpandedSubmissionId(subId);
  };

  const handleSubmitSubmission = async (taskId: string) => {
    const note = draftNote[taskId] ?? '';
    const files = draftFilesRef.current[taskId] ?? [];

    setSubmissionDraftLoading((prev) => ({ ...prev, [taskId]: true }));

    const addLocalSubmission = () => {
      const all = loadLocalTasks().length > 0 ? loadLocalTasks() : seedTasks;
      const now = new Date().toISOString();
      const subId = `dc-sub-${Date.now()}`;
      const newWrapper: DataCollectorSubmissionWrapper = {
        submissionId: subId,
        hasNotification: true,
        notificationId: `notif-dc-${Date.now()}`,
        submission: {
          id: subId,
          data_collector_task_id: taskId,
          description: note.trim() || 'Data collector submission',
          attachment_urls: files.length > 0 ? files.map((f) => URL.createObjectURL(f)) : null,
          created_at: now,
          updated_at: null,
          reviews: [],
        },
      };
      const updated = all.map((t) =>
        t.id === taskId
          ? {
              ...t,
              updated_at: now,
              hasNestedNotification: true,
              taskNotification: { hasNotification: true, notificationId: t.taskNotification?.notificationId || `notif-dc-t${Date.now()}` },
              submissionsWithReviews: {
                ...t.submissionsWithReviews,
                submissions: [...(t.submissionsWithReviews?.submissions || []), newWrapper],
                latestActivityTs: Date.now(),
              },
            }
          : t
      );
      persistLocalTasks(updated);

      const existingIds = new Set(dataCollectorNotificationIds);
      existingIds.add(taskId);
      dataCollectorNotificationIds = existingIds;

      const updatedCache = (cachedTasks || all).map((t) =>
        t.id === taskId
          ? {
              ...t,
              updated_at: now,
              hasNestedNotification: true,
              taskNotification: { hasNotification: true, notificationId: t.taskNotification?.notificationId || `notif-dc-t${Date.now()}` },
              submissionsWithReviews: {
                ...t.submissionsWithReviews,
                submissions: [...(t.submissionsWithReviews?.submissions || []), newWrapper],
                latestActivityTs: Date.now(),
              },
            }
          : t
      );
      cachedTasks = updatedCache;
      setTasks(updatedCache);
      const updatedSelected = updatedCache.find((t) => t.id === taskId);
      if (updatedSelected) setSelectedTask(updatedSelected);
    };

    try {
      const formData = new FormData();
      formData.append('description', note.trim() || 'Data collector submission');
      for (const file of files) {
        formData.append('attachmentFiles', file);
      }

      const isEditing = editingSubmissionId !== null;
      const response = isEditing
        ? await dataCollectorApi.updateSubmission(editingSubmissionId!, formData)
        : await dataCollectorApi.createSubmission(taskId, formData);

      if (response.success) {
        await fetchTasks(apiPage, true);
        if (cachedTasks) {
          const refreshed = cachedTasks.find((t) => t.id === taskId);
          if (refreshed) setSelectedTask(refreshed);
        }
      } else {
        if (!isEditing) addLocalSubmission();
        const task = (cachedTasks || loadLocalTasks().length > 0 ? loadLocalTasks() : seedTasks).find((t) => t.id === taskId);
        if (task) setSelectedTask(task);
      }
    } catch {
      if (!editingSubmissionId) addLocalSubmission();
      const task = (cachedTasks || loadLocalTasks().length > 0 ? loadLocalTasks() : seedTasks).find((t) => t.id === taskId);
      if (task) setSelectedTask(task);
    } finally {
      setSubmissionDraftLoading((prev) => ({ ...prev, [taskId]: false }));
      setEditingSubmissionId(null);
      const oldUrl = draftScreenshots[taskId] ?? null;
      if (oldUrl && oldUrl.startsWith('blob:')) URL.revokeObjectURL(oldUrl);
      setDraftScreenshots((prev) => ({ ...prev, [taskId]: null }));
      setDraftNote((prev) => ({ ...prev, [taskId]: '' }));
      draftFilesRef.current = { ...draftFilesRef.current, [taskId]: [] };
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
    // Fetch data collectors list for assignment dropdown
    userApi.getDataCollectors().then((res) => {
      if (res.success) setDataCollectors(res.data);
    }).catch(() => {});
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

    // Per-field validation
    const errors: Record<string, string> = {};
    if (!title) errors.title = 'Title is required.';
    else if (title.length > 500) errors.title = 'Title must be 500 characters or fewer.';
    if (!description) errors.description = 'Description is required.';
    else if (description.length > 5000) errors.description = 'Description must be 5000 characters or fewer.';

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    // Build description: prepend instruction if provided (backend has no separate instruction field)
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

      const response = await dataCollectorApi.createDataCollectorTask(formData);

      if (response.success) {
        setTaskSuccessMsg(response.message || 'Data collector task created successfully');
        setNewTaskForm({ title: '', description: '', instruction: '', deadline: '', assigned_to_user_id: '' });
        setScreenshotPreview(null);
        screenshotFileRef.current = null;
        setFieldErrors({});
        setShowCreateModal(false);
        cachedTasks = null;
        cachedMeta = null;
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
    completed: tasks.filter((t) => t.status === 'completed').length,
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
          <h2 className="text-2xl font-semibold text-slate-900">Data Collector Assignment Desk</h2>
          <p className="mt-1 text-sm text-slate-600">
            Create and manage field data collection tasks with screenshot evidence and review submissions.
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
            Create Data Task
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
          <p className="text-gray-500">No data collection tasks yet.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {displayItems.map((task) => {
              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'approved' && task.status !== 'completed';
              const isHighlighted = highlightedIds.has(task.id);              return (
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

                  <button
                    onClick={() => openDetail(task)}
                    className="mb-4 text-sm text-blue-600 hover:underline"
                  >
                    Open Submission Detail
                  </button>

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
          </div>          {(meta && (meta.totalPages > 1 || sortedTasks.length > ROWS_PER_DISPLAY)) && (
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
      )}      {showDetail && selectedTask && (
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
                        const canEditSubmission = latestEditable && taskActive && !taskRejected && user?.role === 'data_collector';
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

                                {sub.attachment_urls && sub.attachment_urls.length > 0 && (
                                  <div>
                                    <h6 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Attachments</h6>
                                    <div className="flex gap-2 flex-wrap">
                                      {sub.attachment_urls.map((url, idx) => (
                                        <img
                                          key={idx}
                                          src={url}
                                          alt={`attachment-${idx}`}
                                          className="h-24 w-auto rounded border object-cover cursor-pointer hover:ring-2 hover:ring-blue-400 transition-shadow"
                                          onClick={() => setImageViewerSrc(url)}
                                        />
                                      ))}
                                    </div>
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
                                        const hoursSinceCreation = (Date.now() - reviewTs) / (1000 * 60 * 60);
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
                                              {canEditReview && (
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

                                {canManage && isLatestSubmission && canReview && (
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
                    </div>
                  </section>
                )}
              </div>              <aside className="space-y-4">
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
      )}      {showCreateModal && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Create Data Collection Task</h3>
                <p className="text-sm text-gray-500 mt-0.5">Fill in the task details and attach evidence. Fields marked with <span className="text-red-500">*</span> are required.</p>
              </div>
              <button onClick={() => { if (!isCreating) { setShowCreateModal(false); setError(null); setFieldErrors({}); } }} className="p-2 rounded-lg hover:bg-gray-100" disabled={isCreating}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="px-6 py-5 space-y-4">
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}

              {/* Title */}
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

              {/* Description */}
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

              {/* Assign To */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Assign To (optional)</label>
                <select
                  value={newTaskForm.assigned_to_user_id}
                  onChange={(e) => setNewTaskForm((f) => ({ ...f, assigned_to_user_id: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                  disabled={isCreating}
                >
                  <option value="">Unassigned</option>
                  {dataCollectors.map((d) => (
                    <option key={d.id} value={d.id}>{d.full_name}</option>
                  ))}
                </select>
              </div>

              {/* Instruction */}
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

              {/* Deadline */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Deadline (optional)</label>
                <input
                  type="date"
                  value={newTaskForm.deadline}
                  onChange={(e) => setNewTaskForm((f) => ({ ...f, deadline: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                  disabled={isCreating}
                />
              </div>

              {/* Evidence Screenshot */}
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
            </form>
          </div>
        </div>
      )}      {imageViewerSrc && (
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
                className="px-3 py-2 bg-white/80 rounded text-sm"
              >
                Fullscreen
              </button>
              <button onClick={() => setImageViewerSrc(null)} className="px-3 py-2 bg-white/80 rounded text-sm">
                Close
              </button>
            </div>
            <div className="absolute left-2 bottom-2 flex items-center gap-2 bg-white/90 rounded p-2">
              <button
                onClick={() => setImageZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                className="px-2 py-1 border rounded text-sm"
              >
                -
              </button>
              <div className="text-sm px-2">{Math.round(imageZoom * 100)}%</div>
              <button
                onClick={() => setImageZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
                className="px-2 py-1 border rounded text-sm"
              >
                +
              </button>
              <button onClick={() => setImageZoom(1)} className="px-2 py-1 border rounded text-sm">
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