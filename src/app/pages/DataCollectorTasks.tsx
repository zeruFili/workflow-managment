import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotificationCounts } from '../contexts/NotificationCountsContext';
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
import ImageRemoveButton from '../components/ImageRemoveButton';
import { PaginationWithNumbers } from '../components/ui/PaginationWithNumbers';

const API_BASE_URL = 'http://localhost:3001';
function resolveAttachmentUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

import { dataCollectorTaskCache } from '../data/dataCollectorTaskCache';

// ------------ NOTIFICATIONS / HIGHLIGHT ------------
export const DATA_COLLECTOR_NOTIFICATIONS_KEY = 'data-collector-notifications-updated';

const viewedDataCollectorCards = new Set<string>();
let dataCollectorNotificationIds = new Set<string>();
const markedTaskNotificationIds = new Set<string>();
let hasResetForSessionOnce = false;

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
  return (task.submissionsWithReviews?.submissions || []).filter((w) => w.submission != null);
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

function canDeleteDataCollectorTask(task: DataCollectorTaskItem): boolean {
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
const PAGE_SIZE = 10;

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

export function resetDataCollectorHighlightState() {
  viewedDataCollectorCards.clear();
  dataCollectorNotificationIds = new Set<string>();
  markedTaskNotificationIds.clear();
  dataCollectorTaskCache.invalidate();
}

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
  const { decrement } = useNotificationCounts();
  const [tasks, setTasks] = useState<DataCollectorTaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [apiPage, setApiPage] = useState(1);
  const [meta, setMeta] = useState<DataCollectorTaskListMeta | null>(null);

  const [selectedTask, setSelectedTask] = useState<DataCollectorTaskItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [submissionsLoading, setSubmissionsLoading] = useState<Record<string, boolean>>({});
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  const [editingSubmissionId, setEditingSubmissionId] = useState<string | null>(null);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewDraft, setReviewDraft] = useState<Record<string, string>>({});

  const [draftNote, setDraftNote] = useState<Record<string, string>>({});
  const [draftScreenshots, setDraftScreenshots] = useState<Record<string, string | null>>({});
  const [keptAttachmentUrls, setKeptAttachmentUrls] = useState<Record<string, string[]>>({});
  const draftFilesRef = useRef<Record<string, File[]>>({});
  const [, setDraftFilesVersion] = useState(0);
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
  const createFilesRef = useRef<File[]>([]);
  const [, setCreateFilesVersion] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [taskSuccessMsg, setTaskSuccessMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [dataCollectors, setDataCollectors] = useState<UserItem[]>([]);

  // ── Edit Task state ──
  const [showEditTask, setShowEditTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', instruction: '', deadline: '', assigned_to_user_id: '' });
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const editFilesRef = useRef<File[]>([]);
  const [, setEditFilesVersion] = useState(0);
  const [keptTaskUrls, setKeptTaskUrls] = useState<string[]>([]);
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
  const tasksRef = useRef<DataCollectorTaskItem[]>([]);
  const pendingTaskNotifIds = useRef<Map<string, string>>(new Map());
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  useEffect(() => {
    if (user && !hasResetForSessionOnce) {
      resetDataCollectorHighlightState();
      hasResetForSessionOnce = true;
    }
    if (!user) {
      hasResetForSessionOnce = false;
    }
  }, [user]);

  const highlightedIds = (() => {
    if (tasks.length === 0) return new Set<string>();
    dataCollectorNotificationIds = new Set(
      tasks.filter((t) => anyNotification(t)).map((t) => t.id)
    );
    return new Set(
      [...dataCollectorNotificationIds].filter((id) => !viewedDataCollectorCards.has(id))
    );
  })();

  useEffect(() => {
    publishBadgeCount(highlightedIds.size);
  }, [highlightedIds]);

  const canManage = user?.role === 'ceo' || user?.role === 'general_manager';
  const canSubmit = user?.role === 'data_collector';
  const taskAllowsSubmit = selectedTask
    ? selectedTask.status !== 'rejected' && selectedTask.task_state === 'active'
    : false;

  const fetchTasks = useCallback(async (page: number, force = false): Promise<DataCollectorTaskItem[] | undefined> => {
    if (!user) return;
    const cacheParams = { page, limit: PAGE_SIZE };
    if (!force) {
      const cached = dataCollectorTaskCache.get(cacheParams);
      if (cached) {
        setTasks(cached.data);
        setMeta({ total: cached.total, page, limit: PAGE_SIZE, totalPages: Math.ceil(cached.total / PAGE_SIZE) });
        dataCollectorNotificationIds = new Set(
          cached.data.filter((t) => anyNotification(t)).map((t) => t.id)
        );
        setIsLoading(false);
        return cached.data;
      }
    } else {
      dataCollectorTaskCache.invalidate(cacheParams);
    }
    setIsLoading(true);
    setError(null);

    const applyTasks = (data: DataCollectorTaskItem[], total: number): DataCollectorTaskItem[] => {
      setTasks(data);
      setMeta({ total, page, limit: PAGE_SIZE, totalPages: Math.ceil(total / PAGE_SIZE) });

      dataCollectorNotificationIds = new Set(
        data.filter((t) => anyNotification(t)).map((t) => t.id)
      );
      return data;
    };

    try {
      const result = await dataCollectorTaskCache.fetch(cacheParams);
      return applyTasks(result.data, result.total);
    } catch {
      const local = initLocalWithSeed();
      const start = (page - 1) * PAGE_SIZE;
      const paged = local.slice(start, start + PAGE_SIZE);
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
          decrement('dataCollectorTasks');
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
          dataCollectorTaskCache.invalidate();
        })
        .catch(() => {
          markedTaskNotificationIds.delete(notifId);
        });
    }
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

  const totalDisplayPages = meta ? Math.ceil(meta.total / PAGE_SIZE) : 1;
  const handlePageChange = (page: number) => {
    dataCollectorTaskCache.invalidate({ page: apiPage, limit: PAGE_SIZE });
    setApiPage(page);
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
    setEditingSubmissionId(null);
    setEditingReviewId(null);
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
      decrement('dataCollectorTasks');

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
                reviews: (w.submission?.reviews || []).map((r) => ({
                  ...r,
                  hasNotification: false,
                  notificationId: null,
                })),
              },
            })),
          }
        : swr;

      const clearedTask = { ...task, taskNotification: null, hasNestedNotification: false, submissionsWithReviews: clearedSwr } as DataCollectorTaskItem;
      setSelectedTask(clearedTask);

      const updatedTasks = tasksRef.current.map((t) =>
        t.id === task.id ? clearedTask : t
      );
      setTasks(updatedTasks);
      tasksRef.current = updatedTasks;
      dataCollectorTaskCache.invalidate();

      viewedDataCollectorCards.add(task.id);
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
    setEditingSubmissionId(null);
    setEditingReviewId(null);
  };

  const handleFilesChange = (taskId: string, fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      draftFilesRef.current = { ...draftFilesRef.current, [taskId]: [] };
      setDraftFilesVersion((v) => v + 1);
      return;
    }

    const files = [...(draftFilesRef.current[taskId] || []), ...Array.from(fileList)];
    draftFilesRef.current = { ...draftFilesRef.current, [taskId]: files };
    setDraftFilesVersion((v) => v + 1);
  };

  const handleReviewSubmission = async (taskId: string, subId: string, outcome: string) => {
    const note = reviewDraft[taskId] ?? '';
    setReviewError((prev) => ({ ...prev, [taskId]: '' }));

    let errorMsg: string | null = null;

    let effectiveReviewId = editingReviewId;
    if (effectiveReviewId && selectedTask) {
      const wrappers = getSubmissionWrappers(selectedTask);
      const targetWrapper = wrappers.find((w) => w.submission?.id === subId);
      const belongsToCurrentSubmission = (targetWrapper?.submission?.reviews || []).some((r) => r.id === effectiveReviewId);
      if (!belongsToCurrentSubmission) {
        effectiveReviewId = null;
        setEditingReviewId(null);
      }
    }

    const addLocalReview = () => {
      const all = loadLocalTasks().length > 0 ? loadLocalTasks() : seedTasks;
      const now = new Date().toISOString();
      const reviewId = `dc-rev-${Date.now()}`;
      const newReview: DataCollectorSubmissionReview = {
        id: reviewId,
        data_collector_submission_id: subId,
        reviewer_user_id: user?.id || '',
        reviewer_user: { id: user?.id || '', full_name: user?.full_name || 'Unknown', role: user?.role || '' },
        review_outcome: outcome,
        description: note.trim() || `Review: ${outcome}`,
        created_at: now,
        updated_at: null,
        hasNotification: true,
        notificationId: `notif-dc-${Date.now()}`,
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
                submissions: (t.submissionsWithReviews?.submissions || []).map((w) =>
                  w.submission?.id === subId
                    ? {
                        ...w,
                        hasNotification: true,
                        notificationId: `notif-dc-${Date.now()}`,
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
      dataCollectorTaskCache.invalidate();
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
      if (effectiveReviewId) {
        await dataCollectorApi.updateReview(effectiveReviewId, payload);
      } else {
        await dataCollectorApi.createReview(subId, payload);
      }
    } catch (err: unknown) {
      if (effectiveReviewId) {
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
            type: 'dc_review',
            taskId,
            actorRole: user.role,
            message: `Data collector task reviewed: ${outcome}`,
            description: `Review submitted for data collector task: ${taskTitle} (${outcome})`,
          }),
          ...existing,
        ]);
      }
    }
  };

  const handleEditSubmission = (taskId: string, subId: string) => {
    const wrappers = getSubmissionWrappers(selectedTask || { submissionsWithReviews: { submissions: [], latestActivityTs: 0 }, taskNotification: { hasNotification: false, notificationId: null }, hasNestedNotification: false } as DataCollectorTaskItem);
    const wrapper = getSubmissionWrappers(selectedTask!).find((w) => w.submission.id === subId);
    if (!wrapper) return;
    const sub = wrapper.submission;
    const existingUrls = sub.attachment_urls || [];
    setEditingSubmissionId(subId);
    setDraftNote((prev) => ({ ...prev, [taskId]: sub.description || '' }));
    setDraftScreenshots((prev) => ({ ...prev, [taskId]: null }));
    setKeptAttachmentUrls((prev) => ({ ...prev, [taskId]: [...existingUrls] }));
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

      const updatedCache = all.map((t) =>
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
      dataCollectorTaskCache.invalidate();
      setTasks(updatedCache);
      const updatedSelected = updatedCache.find((t) => t.id === taskId);
      if (updatedSelected) setSelectedTask(updatedSelected);
    };

    let errorMsg: string | null = null;

    try {
      const formData = new FormData();
      formData.append('description', note.trim() || 'Data collector submission');
      for (const file of files) {
        formData.append('attachmentFiles', file);
      }

      const response = isEditing
        ? await (() => {
            const keptUrls = keptAttachmentUrls[taskId] || [];
            if (keptUrls.length > 0) {
              for (const url of keptUrls) formData.append('attachment_urls', url);
            } else {
              formData.append('attachment_urls', '');
            }
            return dataCollectorApi.updateSubmission(editingSubmissionId!, formData);
          })()
        : await dataCollectorApi.createSubmission(taskId, formData);

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
        setKeptAttachmentUrls((prev) => ({ ...prev, [taskId]: [] }));
        draftFilesRef.current = { ...draftFilesRef.current, [taskId]: [] };
      }
    } else {
      setEditingSubmissionId(null);
      const oldUrl = draftScreenshots[taskId] ?? null;
      if (oldUrl && oldUrl.startsWith('blob:')) URL.revokeObjectURL(oldUrl);
      setDraftScreenshots((prev) => ({ ...prev, [taskId]: null }));
      setDraftNote((prev) => ({ ...prev, [taskId]: '' }));
      setKeptAttachmentUrls((prev) => ({ ...prev, [taskId]: [] }));
      draftFilesRef.current = { ...draftFilesRef.current, [taskId]: [] };

      if (user) {
        const existing = loadQuantityReviewNotifications();
        const taskTitle = selectedTask?.title || note.trim() || 'Data collector submission';
        saveQuantityReviewNotifications([
          createGeneralNotification({
            type: 'dc_submission',
            taskId,
            actorRole: user.role,
            message: 'New data collector submission',
            description: `Data collector submitted work for task: ${taskTitle}`,
          }),
          ...existing,
        ]);
      }
    }
  };

  const openCreateModal = () => {
    setNewTaskForm({ title: '', description: '', instruction: '', deadline: '', assigned_to_user_id: '' });
    setScreenshotPreview(null);
    createFilesRef.current = [];
    setCreateFilesVersion((v) => v + 1);
    setError(null);
    setTaskSuccessMsg('');
    setFieldErrors({});
    setShowCreateModal(true);
    // Fetch data collectors list for assignment dropdown
    userApi.getDataCollectors().then((res) => {
      if (res.success) setDataCollectors(res.data);
    }).catch(() => {});
  };

  const openEditTask = (task: DataCollectorTaskItem) => {
    setEditingTaskId(task.id);
    setEditForm({
      title: task.title,
      description: task.description,
      instruction: '',
      deadline: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
      assigned_to_user_id: task.assigned_to_user_id || '',
    });
    setEditImagePreview(null);
    editFilesRef.current = [];
    setEditFilesVersion((v) => v + 1);
    setKeptTaskUrls(task.attachment_urls || []);
    setEditFormErrors({});
    setEditError('');
    setShowEditTask(true);
    userApi.getDataCollectors().then((res) => {
      if (res.success) setDataCollectors(res.data);
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

      for (const file of editFilesRef.current) {
        formData.append('attachmentFiles', file);
      }
      if (keptTaskUrls.length > 0) {
        for (const url of keptTaskUrls) formData.append('attachment_urls', url);
      } else {
        formData.append('attachment_urls', '');
      }

      const response = await dataCollectorApi.updateDataCollectorTask(editingTaskId, formData);

      if (response.success) {
        setTaskSuccessMsg(response.message || 'Data collector task updated successfully');
        setShowEditTask(false);
        setEditingTaskId(null);
        setEditFormErrors({});
        dataCollectorTaskCache.invalidate();
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
      const response = await dataCollectorApi.deleteDataCollectorTask(deletingTaskId);
      if (response.success) {
        const local = loadLocalTasks();
        persistLocalTasks(local.filter((t) => t.id !== deletingTaskId));
        setTaskSuccessMsg(response.message || 'Data collector task deleted successfully');
        setShowDeleteConfirm(false);
        setDeletingTaskId(null);
        dataCollectorTaskCache.invalidate();
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
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length === 0) return;
    createFilesRef.current = [...createFilesRef.current, ...newFiles];
    setCreateFilesVersion((v) => v + 1);
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
      for (const file of createFilesRef.current) {
        formData.append('attachmentFiles', file);
      }

      const response = await dataCollectorApi.createDataCollectorTask(formData);

      if (response.success) {
        setTaskSuccessMsg(response.message || 'Data collector task created successfully');
        setNewTaskForm({ title: '', description: '', instruction: '', deadline: '', assigned_to_user_id: '' });
        setScreenshotPreview(null);
        createFilesRef.current = [];
        setCreateFilesVersion((v) => v + 1);
        setFieldErrors({});
        setShowCreateModal(false);
        dataCollectorTaskCache.invalidate();
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
                    {canManage && canDeleteDataCollectorTask(task) && (
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
          </div>          <PaginationWithNumbers
            currentPage={apiPage}
            totalPages={totalDisplayPages}
            totalItems={meta?.total}
            onPageChange={handlePageChange}
          />
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
                        const latestSubmissionId = wrappers.length > 0 ? wrappers[wrappers.length - 1].submission?.id : null;
                        const editableWrappers = wrappers.filter((w) => (w.submission?.reviews || []).length === 0);
                        const latestEditable = editableWrappers.length > 0 ? editableWrappers[editableWrappers.length - 1] : null;
                        const taskActive = selectedTask.task_state === 'active';
                        const taskRejected = selectedTask.status === 'rejected';
                        const canEditSubmission = latestEditable && taskActive && !taskRejected && user?.role === 'data_collector';
                        const latestEditableId = canEditSubmission ? latestEditable!.submission?.id : null;
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
                        const editingBelongsToThisSub = editingReviewId !== null && (sub.reviews || []).some((r) => r.id === editingReviewId);

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
                                  {sub.updated_at && sub.updated_at !== sub.created_at && (
                                    <span className="ml-1 text-[10px] italic text-amber-600">(edited)</span>
                                  )}
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
                                          setKeptAttachmentUrls((prev) => ({ ...prev, [selectedTask.id]: [] }));
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
                                          (w.submission?.reviews || []).some((r) => new Date(r.created_at).getTime() > reviewTs)
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
                                              {review.updated_at && review.updated_at !== review.created_at && (
                                                <span className="text-[10px] italic text-amber-600">(edited)</span>
                                              )}
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

                                {canManage && isLatestSubmission && selectedTask.task_state === 'active' && (
                                  <div className="border-t border-gray-100 pt-3">
                                    <h6 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                      {editingBelongsToThisSub ? 'Update Review' : 'Review &amp; Decision'}
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
                                        <Send className="w-3.5 h-3.5" /> {editingBelongsToThisSub ? 'Update Feedback' : 'Feedback'}
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
                          File Attachments <span className="text-gray-400 text-xs ml-1">(optional)</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-700">
                            <Upload className="w-4 h-4" />
                            {draftFilesRef.current[selectedTask.id]?.length
                              ? `${draftFilesRef.current[selectedTask.id].length} new file(s)`
                              : (keptAttachmentUrls[selectedTask.id]?.length > 0)
                              ? 'Add More Files'
                              : 'Choose Files'}
                            <input
                              type="file"
                              multiple
                              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.rar"
                              onChange={(e) => handleFilesChange(selectedTask.id, e.target.files)}
                              className="hidden"
                            />
                          </label>
                          {((draftFilesRef.current[selectedTask.id]?.length ?? 0) > 0 || (keptAttachmentUrls[selectedTask.id]?.length ?? 0) > 0) && (
                            <button
                              type="button"
                              onClick={() => {
                                setKeptAttachmentUrls((prev) => ({ ...prev, [selectedTask.id]: [] }));
                                draftFilesRef.current = { ...draftFilesRef.current, [selectedTask.id]: [] };
                                setDraftFilesVersion((v) => v + 1);
                              }}
                              className="text-sm text-red-600 hover:underline"
                            >
                              Remove All
                            </button>
                          )}
                        </div>
                        {(keptAttachmentUrls[selectedTask.id]?.length > 0 || (draftFilesRef.current[selectedTask.id]?.length ?? 0) > 0) && (
                          <div className="mt-2 grid grid-cols-3 gap-2">
                            {keptAttachmentUrls[selectedTask.id]?.map((url, idx) => (
                              <div key={`kept-${idx}`} className="relative group border rounded-lg overflow-hidden bg-gray-50">
                                <img
                                  src={resolveAttachmentUrl(url)}
                                  alt={`Existing attachment ${idx + 1}`}
                                  className="w-full h-24 object-contain"
                                />
                                <ImageRemoveButton
                                  onRemove={() => {
                                    setKeptAttachmentUrls((prev) => {
                                      const current = prev[selectedTask.id] || [];
                                      const filtered = current.filter((_, i) => i !== idx);
                                      return { ...prev, [selectedTask.id]: filtered };
                                    });
                                  }}
                                />
                              </div>
                            ))}
                            {draftFilesRef.current[selectedTask.id]?.map((file, idx) => (
                              <div key={`new-${idx}`} className="relative group border rounded-lg overflow-hidden bg-gray-50">
                                {file.type?.startsWith('image/') ? (
                                  <img
                                    src={URL.createObjectURL(file)}
                                    alt={`New file ${idx + 1}`}
                                    className="w-full h-24 object-contain"
                                    onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                                  />
                                ) : (
                                  <div className="w-full h-24 flex items-center justify-center text-xs text-gray-500 p-2">
                                    {file.name}
                                  </div>
                                )}
                                <ImageRemoveButton
                                  onRemove={() => {
                                    const current = draftFilesRef.current[selectedTask.id] || [];
                                    const updated = current.filter((_, i) => i !== idx);
                                    draftFilesRef.current = { ...draftFilesRef.current, [selectedTask.id]: updated };
                                    setDraftFilesVersion((v) => v + 1);
                                  }}
                                />
                              </div>
                            ))}
                          </div>
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
                  min={new Date().toISOString().split('T')[0]}
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
                    {createFilesRef.current.length ? `${createFilesRef.current.length} file(s)` : 'Choose Files'}
                    <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" disabled={isCreating} />
                  </label>
                  {createFilesRef.current.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { createFilesRef.current = []; setCreateFilesVersion((v) => v + 1); }}
                      className="text-sm text-red-600 hover:underline"
                      disabled={isCreating}
                    >
                      Remove All
                    </button>
                  )}
                </div>
                {createFilesRef.current.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {createFilesRef.current.map((file, idx) => (
                      <div key={idx} className="relative group border rounded-lg overflow-hidden bg-gray-50">
                        {file.type?.startsWith('image/') ? (
                          <img src={URL.createObjectURL(file)} alt={`New file ${idx + 1}`} className="w-full h-24 object-contain" onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)} />
                        ) : (
                          <div className="w-full h-24 flex items-center justify-center text-xs text-gray-500 p-2">{file.name}</div>
                        )}
                        <ImageRemoveButton onRemove={() => { createFilesRef.current = createFilesRef.current.filter((_, i) => i !== idx); setCreateFilesVersion((v) => v + 1); }} />
                      </div>
                    ))}
                  </div>
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
                <h3 className="text-lg font-semibold text-gray-900">Edit Data Collection Task</h3>
                <p className="text-sm text-gray-500 mt-0.5">Update the task details. Fields marked with <span className="text-red-500">*</span> are required.</p>
              </div>
              <button onClick={() => { if (!isUpdating) { setShowEditTask(false); setEditingTaskId(null); setEditFormErrors({}); setEditError(''); } }} className="p-2 rounded-lg hover:bg-gray-100" disabled={isUpdating}>
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
                  {dataCollectors.map((d) => (
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
                    {editFilesRef.current.length ? `${editFilesRef.current.length} new file(s)` : (keptTaskUrls.length > 0 ? 'Add More Files' : 'Choose Files')}
                    <input
                      type="file" accept="image/*" multiple
                      onChange={(event) => {
                        const newFiles = Array.from(event.target.files || []);
                        if (newFiles.length === 0) return;
                        editFilesRef.current = [...editFilesRef.current, ...newFiles];
                        setEditFilesVersion((v) => v + 1);
                      }}
                      className="hidden" disabled={isUpdating}
                    />
                  </label>
                  {((editFilesRef.current.length > 0) || (keptTaskUrls.length > 0)) && (
                    <button
                      type="button"
                      onClick={() => { editFilesRef.current = []; setKeptTaskUrls([]); setEditFilesVersion((v) => v + 1); }}
                      className="text-sm text-red-600 hover:underline"
                      disabled={isUpdating}
                    >
                      Remove All
                    </button>
                  )}
                </div>
                {(keptTaskUrls.length > 0 || editFilesRef.current.length > 0) && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {keptTaskUrls.map((url, idx) => (
                      <div key={`kept-${idx}`} className="relative group border rounded-lg overflow-hidden bg-gray-50">
                        <img src={resolveAttachmentUrl(url)} alt={`Existing ${idx + 1}`} className="w-full h-24 object-contain" />
                        <ImageRemoveButton onRemove={() => { setKeptTaskUrls((prev) => prev.filter((_, i) => i !== idx)); }} />
                      </div>
                    ))}
                    {editFilesRef.current.map((file, idx) => (
                      <div key={`new-${idx}`} className="relative group border rounded-lg overflow-hidden bg-gray-50">
                        {file.type?.startsWith('image/') ? (
                          <img src={URL.createObjectURL(file)} alt={`New ${idx + 1}`} className="w-full h-24 object-contain" onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)} />
                        ) : (
                          <div className="w-full h-24 flex items-center justify-center text-xs text-gray-500 p-2">{file.name}</div>
                        )}
                        <ImageRemoveButton onRemove={() => { editFilesRef.current = editFilesRef.current.filter((_, i) => i !== idx); setEditFilesVersion((v) => v + 1); }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowEditTask(false); setEditingTaskId(null); setEditFormErrors({}); setEditError(''); }}
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

export default DataCollectorTasks;