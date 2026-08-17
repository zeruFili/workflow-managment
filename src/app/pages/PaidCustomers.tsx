import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotificationCounts } from '../contexts/NotificationCountsContext';
import marketingApi, {
  MarketingTaskItem,
  MarketingSubmissionWrapper,
  MarketingSubmissionRaw,
  MarketingReviewRaw,
} from '../../api/marketingApi';
import { fetchMarketingTasks, getCachedMarketingTasks, isMarketingTasksLoading, invalidateMarketingTaskCache } from '../data/marketingTaskCache';
import notificationApi from '../../api/notificationApi';
import {
  ArrowLeft,
  Calendar,
  Mail,
  MapPin,
  Phone,
  User,
  Users,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  Edit,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Send,
  Upload,
  Paperclip,
  CheckCircle2,
  Search,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import AttachmentViewer from '../components/AttachmentViewer';
import ImageRemoveButton from '../components/ImageRemoveButton';
import { resolveAttachmentUrl } from '../../api/baseApi';

import { useNavigate, useSearchParams } from 'react-router-dom';

export const MARKETING_NOTIFICATIONS_KEY = 'marketing-tasks-notifications-updated';

const viewedMarketingCards = new Set<string>();
let marketingNotificationIds = new Set<string>();

function publishBadgeCount(count: number) {
  window.dispatchEvent(
    new CustomEvent('paid-customers-notifications-updated', { detail: count })
  );
}

function statusColor(status: string | null): string {
  switch (status) {
    case 'approved': return 'bg-green-100 text-green-700';
    case 'rejected': return 'bg-red-100 text-red-700';
    case 'feedback': return 'bg-yellow-100 text-yellow-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function getLatestActivity(task: MarketingTaskItem): {
  description: string;
  kind: 'review' | 'submission';
  outcome: string;
} | null {
  const wrappers = getSubmissionWrappers(task);
  let latestTs = 0;
  let latest: { description: string; kind: 'review' | 'submission'; outcome: string } | null = null;
  for (const w of wrappers) {
    const s = w.submission;
    if (!s) continue;
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
}

function getSubmissionWrappers(task: MarketingTaskItem): MarketingSubmissionWrapper[] {
  return (task.submissionsWithReviews?.submissions || []).filter((w: any) => w.submission != null);
}

// ── localStorage persistence (shared with MarketingTasks) ──
const STORAGE_KEY = 'marketing-tasks-v1';

function loadLocalTasks(): MarketingTaskItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as MarketingTaskItem[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

function persistLocalTasks(tasksToSave: MarketingTaskItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasksToSave));
  } catch { /* ignore */ }
}

function initLocalWithSeed(): MarketingTaskItem[] {
  const existing = loadLocalTasks();
  if (existing.length > 0) return existing;
  persistLocalTasks(seedTasks);
  return seedTasks;
}

// ── Seed data (subset with submissions, matching MarketingTasks shape) ──
const seedTasks: MarketingTaskItem[] = [
  {
    id: 'mkt-task-1',
    marketing_user_id: '3',
    title: 'Luxury Villa Marketing Kit',
    description: 'Prepare marketing materials for the new luxury villa project including brochure, social media assets, and client presentation.',
    status: 'pending',
    task_state: 'active',
    due_date: '2026-07-15T23:59:59Z',
    attachment_urls: ['https://placehold.co/800x480/0f172a/f8fafc?text=Villa+Brochure'],
    updated_by: null,
    created_at: '2026-06-01T08:00:00Z',
    updated_at: null,
    marketing_user: { id: '3', full_name: 'Emily Chen', role: 'marketing' },
    updated_by_user: null,
    customer_name: 'Khalid Al Fahim',
    customer_phone: '+971 50 123 4567',
    customer_email: 'khalid@example.com',
    customer_address: 'Palm Jumeirah, Dubai',
    category: 'home_design',
    service_description: 'Full interior and exterior design for a 6-bedroom luxury villa with pool and garden landscaping.',
    preferred_start_date: '2026-07-01',
    budget: 500000,
    notes: 'Client prefers modern Arabic aesthetic with smart home integration.',
    taskNotification: { hasNotification: true, notificationId: 'notif-mkt-t1' },
    submissionsWithReviews: {
      submissions: [{
        submissionId: 'mkt-sub-1',
        hasNotification: true,
        notificationId: 'notif-mkt-1',
        submission: {
          id: 'mkt-sub-1',
          marketing_task_id: 'mkt-task-1',
          description: 'Initial brochure draft completed. Social media mockups attached.',
          attachment_urls: ['https://placehold.co/800x480/1e293b/e2e8f0?text=Mockup+Preview'],
          created_at: '2026-06-05T14:00:00Z',
          updated_at: null,
          reviews: [{
            id: 'mkt-rev-1',
            marketing_submission_id: 'mkt-sub-1',
            reviewer_user_id: '1',
            reviewer_user: { id: '1', full_name: 'Alice Johnson', role: 'ceo' },
            review_outcome: 'feedback',
            description: 'Good start. Please include more lifestyle imagery and adjust the color scheme.',
            created_at: '2026-06-06T10:00:00Z',
            updated_at: null,
            hasNotification: true,
            notificationId: 'notif-mkt-r1',
          }],
        },
      }],
      latestActivityTs: 1749204000000,
    },
    hasNestedNotification: true,
  },
  {
    id: 'mkt-task-2',
    marketing_user_id: '3',
    title: 'Hair Salon Campaign Assets',
    description: 'Create social media campaign visuals and promotional video for the new hair salon design project.',
    status: 'approved',
    task_state: 'active',
    due_date: '2026-06-30T23:59:59Z',
    attachment_urls: null,
    updated_by: null,
    created_at: '2026-05-25T10:00:00Z',
    updated_at: '2026-06-02T16:00:00Z',
    marketing_user: { id: '3', full_name: 'Emily Chen', role: 'marketing' },
    updated_by_user: null,
    customer_name: 'Mona Al Rashid',
    customer_phone: '+971 55 888 1122',
    customer_email: 'mona@example.com',
    customer_address: 'Abu Dhabi Corniche, Abu Dhabi',
    category: 'hair_salon_design',
    service_description: "Women's hair salon interior design with reception, styling stations, and waiting area.",
    preferred_start_date: '2026-06-15',
    budget: 95000,
    notes: 'Privacy zoning and premium finishes required.',
    taskNotification: { hasNotification: false, notificationId: null },
    submissionsWithReviews: {
      submissions: [{
        submissionId: 'mkt-sub-2',
        hasNotification: false,
        notificationId: null,
        submission: {
          id: 'mkt-sub-2',
          marketing_task_id: 'mkt-task-2',
          description: 'Campaign assets delivered: 5 Instagram posts, 2 reels, and 1 promotional video.',
          attachment_urls: ['https://placehold.co/800x480/334155/f8fafc?text=Campaign+Preview'],
          created_at: '2026-06-01T12:00:00Z',
          updated_at: null,
          reviews: [{
            id: 'mkt-rev-2',
            marketing_submission_id: 'mkt-sub-2',
            reviewer_user_id: '2',
            reviewer_user: { id: '2', full_name: 'Bob Smith', role: 'finance' },
            review_outcome: 'approved',
            description: 'Excellent work. All assets are on-brand and ready for distribution.',
            created_at: '2026-06-02T16:00:00Z',
            updated_at: null,
            hasNotification: true,
            notificationId: 'notif-mkt-r2',
          }],
        },
      }],
      latestActivityTs: 1748870400000,
    },
    hasNestedNotification: true,
  },
  {
    id: 'mkt-task-4',
    marketing_user_id: '3',
    title: 'Modern Home Concept Pitch Deck',
    description: 'Create a pitch deck for the modern home concept client presentation.',
    status: 'rejected',
    task_state: 'active',
    due_date: '2026-06-25T23:59:59Z',
    attachment_urls: ['https://placehold.co/800x480/0f172a/f8fafc?text=Pitch+Deck'],
    updated_by: null,
    created_at: '2026-05-20T11:00:00Z',
    updated_at: '2026-05-28T14:00:00Z',
    marketing_user: { id: '3', full_name: 'Emily Chen', role: 'marketing' },
    updated_by_user: null,
    customer_name: 'Nadia Hassan',
    customer_phone: '+971 50 123 4567',
    customer_email: 'nadia@example.com',
    customer_address: 'Dubai Marina, Dubai',
    category: 'home_design',
    service_description: 'Modern home concept with living room, kitchen, and bedroom layout planning.',
    preferred_start_date: '2026-06-10',
    budget: 180000,
    notes: 'Warm minimal style with natural materials.',
    taskNotification: { hasNotification: false, notificationId: null },
    submissionsWithReviews: {
      submissions: [{
        submissionId: 'mkt-sub-4',
        hasNotification: false,
        notificationId: null,
        submission: {
          id: 'mkt-sub-4',
          marketing_task_id: 'mkt-task-4',
          description: 'Pitch deck v1 complete with floor plans and mood boards.',
          attachment_urls: ['https://placehold.co/800x480/475569/e2e8f0?text=Pitch+Deck+V1'],
          created_at: '2026-05-25T09:00:00Z',
          updated_at: null,
          reviews: [{
            id: 'mkt-rev-4',
            marketing_submission_id: 'mkt-sub-4',
            reviewer_user_id: '1',
            reviewer_user: { id: '1', full_name: 'Alice Johnson', role: 'ceo' },
            review_outcome: 'rejected',
            description: 'The design language does not match the client brief. Please revise with more natural tones.',
            created_at: '2026-05-28T14:00:00Z',
            updated_at: null,
            hasNotification: true,
            notificationId: 'notif-mkt-r4',
          }],
        },
      }],
      latestActivityTs: 1748440800000,
    },
    hasNestedNotification: true,
  },
];

export function getUnseenPaidCustomerCount() {
  return marketingNotificationIds.size - viewedMarketingCards.size;
}

export function PaidCustomers() {
  const { user } = useAuth();
  const { decrement } = useNotificationCounts();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [statusFilter, setStatusFilter] = useState('');

  const [marketingTasks, setMarketingTasks] = useState<MarketingTaskItem[]>(() => getCachedMarketingTasks() ?? []);
  const [marketingTasksLoading, setMarketingTasksLoading] = useState(() => !getCachedMarketingTasks());

  const [selectedTask, setSelectedTask] = useState<MarketingTaskItem | null>(null);
  const [taskDetailLoading, setTaskDetailLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
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
  const [submissionFieldError, setSubmissionFieldError] = useState<Record<string, string>>({});
  const [submissionSuccess, setSubmissionSuccess] = useState<Record<string, string | null>>({});
  const [reviewError, setReviewError] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user || (user.role !== 'marketing_lead' && user.role !== 'ceo' && user.role !== 'general_manager' && user.role !== 'finance_officer')) return;
    const cached = getCachedMarketingTasks(searchTerm, statusFilter);
    if (cached) {
      applyTasks(cached);
      setMarketingTasksLoading(false);
      return;
    }
    setMarketingTasksLoading(true);
    fetchMarketingTasks(searchTerm, statusFilter).then((tasks) => {
      applyTasks(tasks);
      if (tasks.length > 0) persistLocalTasks(tasks);
      setMarketingTasksLoading(false);
    });
  }, [user, searchTerm, statusFilter]);

  // ── Auto-open detail from query parameter ──
  const [searchParams, setSearchParams] = useSearchParams();
  const autoOpenTaskId = searchParams.get('openDetail');
  const autoOpenedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!autoOpenTaskId || autoOpenedRef.current === autoOpenTaskId || marketingTasksLoading) return;
    const task = marketingTasks.find((t) => t.id === autoOpenTaskId);
    if (task) {
      autoOpenedRef.current = autoOpenTaskId;
      openDetail(task);
      searchParams.delete('openDetail');
      setSearchParams(searchParams, { replace: true });
    }
  }, [autoOpenTaskId, marketingTasksLoading, marketingTasks]);

  function applyTasks(tasks: MarketingTaskItem[]) {
    setMarketingTasks(tasks);
    marketingNotificationIds = new Set(
      tasks.filter((t) => {
        const swr = t.submissionsWithReviews;
        return !!(
          (t as any).taskNotification?.hasNotification ||
          swr?.taskNotification?.hasNotification ||
          t.hasNestedNotification ||
          (swr?.submissions || []).some(
            (w: any) => w.hasNotification || (w.submission?.reviews || []).some((r: any) => r.hasNotification)
          )
        );
      }).map((t) => t.id)
    );
    const unseen = [...marketingNotificationIds].filter((id) => !viewedMarketingCards.has(id));
    publishBadgeCount(unseen.length);
  }

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      const trimmed = value.trim();
      if (trimmed !== searchTerm) {
        invalidateMarketingTaskCache();
        setSearchTerm(trimmed);
      }
    }, 300);
  };

  const handleClearSearch = () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    setSearchInput('');
    if (searchTerm) {
      invalidateMarketingTaskCache();
      setSearchTerm('');
    }
  };

  const handleStatusFilterChange = (value: string) => {
    invalidateMarketingTaskCache();
    setStatusFilter(value);
  };

  const marketingTasksWithSubmissions = marketingTasks.filter(
    (t) => {
      if ((t.submissionsWithReviews?.submissions || []).length === 0) return false;
      if (user?.role === 'general_manager' && t.status !== 'approved') return false;
      return true;
    }
  );

  const openDetail = async (task: MarketingTaskItem) => {
    setSelectedTask(task);
    setDraftNote((prev) => ({ ...prev, [task.id]: '' }));
    setDraftScreenshots((prev) => ({ ...prev, [task.id]: null }));
    draftFilesRef.current = { ...draftFilesRef.current, [task.id]: [] };
    setExpandedSubmissionId(null);
    setEditingSubmissionId(null);
    setEditingReviewId(null);
    setShowDetail(true);
    setSubmissionError((prev) => ({ ...prev, [task.id]: '' }));
    setSubmissionSuccess((prev) => ({ ...prev, [task.id]: null }));
    setReviewError((prev) => ({ ...prev, [task.id]: '' }));

    const notifIds: string[] = [];
    const swr = task.submissionsWithReviews;
    const topNotif = (task as any).taskNotification;
    if (topNotif?.hasNotification && topNotif.notificationId) notifIds.push(topNotif.notificationId);
    if (swr?.taskNotification?.hasNotification && swr.taskNotification.notificationId) notifIds.push(swr.taskNotification.notificationId);
    (swr?.submissions || []).forEach((w: any) => {
      if (w.hasNotification && w.notificationId) notifIds.push(w.notificationId);
      (w.submission?.reviews || []).forEach((r: any) => {
        if (r.hasNotification && r.notificationId) notifIds.push(r.notificationId);
      });
    });

    if (notifIds.length > 0) {
      notificationApi.bulkMarkRead(notifIds).catch(() => {});
      decrement('marketingTasks');

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

      const clearedTask = { ...task, taskNotification: null, hasNestedNotification: false, submissionsWithReviews: clearedSwr } as MarketingTaskItem;

      const updatedTasks = marketingTasks.map((t) =>
        t.id === task.id ? clearedTask : t
      );
      applyTasks(updatedTasks);

      viewedMarketingCards.add(task.id);
    }

    setTaskDetailLoading(true);
    try {
      const res = await marketingApi.getMarketingTaskById(task.id);
      if (res.success) {
        let fullTask = res.data;

        if ((fullTask.submissionsWithReviews?.submissions || []).length === 0) {
          try {
            const subsRes = await marketingApi.getSubmissions(task.id);
            if (subsRes.success && subsRes.data.length > 0) {
              const subsWithReviews = await Promise.all(
                subsRes.data.map(async (sub) => {
                  let reviews: any[] = [];
                  try {
                    const revRes = await marketingApi.getReviews(sub.id);
                    if (revRes.success) reviews = revRes.data;
                  } catch { /* keep empty reviews */ }
                  return {
                    submissionId: sub.id,
                    hasNotification: false,
                    notificationId: null,
                    submission: { ...sub, reviews },
                  };
                })
              );
              subsWithReviews.sort((a, b) => new Date(a.submission.created_at).getTime() - new Date(b.submission.created_at).getTime());
              fullTask = {
                ...fullTask,
                submissionsWithReviews: {
                  submissions: subsWithReviews,
                  latestActivityTs: Date.now(),
                },
              };
            }
          } catch { /* keep task data as-is */ }
        }

        setSelectedTask(fullTask);
        const wrappers = getSubmissionWrappers(fullTask);
        const latestSub = wrappers.length > 0 ? wrappers[wrappers.length - 1].submission : null;
        setExpandedSubmissionId(latestSub?.id || null);
      }
    } catch { /* silently keep the initial task data */ }
    finally { setTaskDetailLoading(false); }
  };

  const closeDetail = () => {
    const taskId = selectedTask?.id;
    if (taskId && draftScreenshots[taskId]) {
      const url = draftScreenshots[taskId];
      if (url) URL.revokeObjectURL(url);
    }
    setSelectedTask(null);
    setShowDetail(false);
    setTaskDetailLoading(false);
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

  const handleSubmitSubmission = async (taskId: string) => {
    const note = (draftNote[taskId] ?? '').trim();
    if (!note) {
      setSubmissionFieldError((prev) => ({ ...prev, [taskId]: 'Submission description is required.' }));
      return;
    }
    setSubmissionFieldError((prev) => ({ ...prev, [taskId]: '' }));

    const files = draftFilesRef.current[taskId] ?? [];
    setSubmissionDraftLoading((prev) => ({ ...prev, [taskId]: true }));
    setSubmissionError((prev) => ({ ...prev, [taskId]: '' }));
    setSubmissionSuccess((prev) => ({ ...prev, [taskId]: null }));

    const isEditing = editingSubmissionId !== null;

    let errorMsg: string | null = null;

    try {
      const formData = new FormData();
      formData.append('description', note);
      for (const file of files) formData.append('attachmentFiles', file);

      const response = isEditing
        ? await (() => {
            const keptUrls = keptAttachmentUrls[taskId] || [];
            if (keptUrls.length > 0) {
              for (const url of keptUrls) formData.append('attachment_urls', url);
            } else {
              formData.append('attachment_urls', '');
            }
            return marketingApi.updateSubmission(editingSubmissionId!, formData);
          })()
        : await marketingApi.createSubmission(taskId, formData);

      if (response.success && response.data) {
        setSubmissionSuccess((prev) => ({ ...prev, [taskId]: 'Submission has been sent successfully.' }));
        const now = new Date().toISOString();
        if (isEditing) {
          const updatedSub = {
            ...response.data,
            reviews: (response.data as any).reviews || [],
          } as MarketingSubmissionRaw;
          const updated = marketingTasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  updated_at: now,
                  submissionsWithReviews: {
                    ...t.submissionsWithReviews,
                    submissions: (t.submissionsWithReviews?.submissions || []).map((w) =>
                      w.submission?.id === editingSubmissionId
                        ? { ...w, submission: updatedSub }
                        : w
                    ),
                    latestActivityTs: Date.now(),
                  },
                }
              : t
          );
          applyTasks(updated);
          persistLocalTasks(updated);
          const updatedSelected = updated.find((t) => t.id === taskId);
          if (updatedSelected) setSelectedTask(updatedSelected);
        } else {
          const newSub = {
            ...response.data,
            reviews: (response.data as any).reviews || [],
          } as MarketingSubmissionRaw;
          const newWrapper: MarketingSubmissionWrapper = {
            submissionId: newSub.id,
            hasNotification: false,
            notificationId: null,
            submission: newSub,
          };
          const updated = marketingTasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  updated_at: now,
                  submissionsWithReviews: {
                    ...t.submissionsWithReviews,
                    submissions: [...(t.submissionsWithReviews?.submissions || []), newWrapper],
                    latestActivityTs: Date.now(),
                  },
                }
              : t
          );
          applyTasks(updated);
          persistLocalTasks(updated);
          const updatedSelected = updated.find((t) => t.id === taskId);
          if (updatedSelected) setSelectedTask(updatedSelected);
        }
      } else {
        errorMsg = response.message || 'Submission failed.';
      }
    } catch (err: unknown) {
      errorMsg = (err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined) || 'Unable to connect to server.';
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
    }
  };

  const handleEditSubmission = (taskId: string, subId: string) => {
    if (!selectedTask) return;
    const wrapper = getSubmissionWrappers(selectedTask).find((w) => w.submission.id === subId);
    if (!wrapper) return;
    const existingUrls = wrapper.submission.attachment_urls || [];
    setEditingSubmissionId(subId);
    setDraftNote((prev) => ({ ...prev, [taskId]: wrapper.submission.description || '' }));
    setDraftScreenshots((prev) => ({ ...prev, [taskId]: null }));
    setKeptAttachmentUrls((prev) => ({ ...prev, [taskId]: [...existingUrls] }));
    draftFilesRef.current = { ...draftFilesRef.current, [taskId]: [] };
    setExpandedSubmissionId(subId);
    setSubmissionError((prev) => ({ ...prev, [taskId]: '' }));
  };

  const handleReviewSubmission = async (taskId: string, subId: string, outcome: string) => {
    const note = reviewDraft[taskId] ?? '';
    setReviewError((prev) => ({ ...prev, [taskId]: '' }));
    let errorMsg: string | null = null;
    let responseData: MarketingReviewRaw | undefined;

    const isEditing = editingReviewId !== null;
    const effectiveReviewId = editingReviewId;

    try {
      const payload = {
        description: note.trim() || `Review: ${outcome}`,
        review_outcome: outcome,
      };
      if (isEditing && effectiveReviewId) {
        const res = await marketingApi.updateReview(effectiveReviewId, payload);
        if (res.success) responseData = res.data;
        else errorMsg = res.message || 'Unable to update review. Please try again.';
      } else {
        const res = await marketingApi.createReview(subId, payload);
        if (res.success) responseData = res.data;
        else errorMsg = res.message || 'Unable to submit review. Please try again.';
      }
    } catch (err: unknown) {
      errorMsg = (err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined) || 'Unable to submit review. Please try again.';
    }

    if (errorMsg) {
      setReviewError((prev) => ({ ...prev, [taskId]: errorMsg! }));
    } else if (responseData) {
      setEditingReviewId(null);
      setReviewDraft((prev) => ({ ...prev, [taskId]: '' }));

      const now = new Date().toISOString();
      if (isEditing && effectiveReviewId) {
        const updated = marketingTasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                updated_at: now,
                submissionsWithReviews: {
                  ...t.submissionsWithReviews,
                  submissions: (t.submissionsWithReviews?.submissions || []).map((w) => {
                    const reviews = (w.submission?.reviews || []).map((r) =>
                      r.id === effectiveReviewId ? responseData! : r
                    );
                    return { ...w, submission: { ...w.submission, reviews } };
                  }),
                  latestActivityTs: Date.now(),
                },
              }
            : t
        );
        applyTasks(updated);
        persistLocalTasks(updated);
        const updatedSelected = updated.find((t) => t.id === taskId);
        if (updatedSelected) setSelectedTask(updatedSelected);
      } else {
        const updated = marketingTasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                updated_at: now,
                submissionsWithReviews: {
                  ...t.submissionsWithReviews,
                  submissions: (t.submissionsWithReviews?.submissions || []).map((w) =>
                    w.submission?.id === subId
                      ? {
                          ...w,
                          submission: {
                            ...w.submission,
                            reviews: [...(w.submission?.reviews || []), responseData!],
                          },
                        }
                      : w
                  ),
                  latestActivityTs: Date.now(),
                },
              }
            : t
        );
        applyTasks(updated);
        persistLocalTasks(updated);
        const updatedSelected = updated.find((t) => t.id === taskId);
        if (updatedSelected) setSelectedTask(updatedSelected);
      }
    }
  };

  if (!user) return null;

  const canAccess =
    user.role === 'marketing_lead' || user.role === 'ceo' ||
    user.role === 'general_manager' || user.role === 'finance_officer' ||
    user.role === 'system_administrator';

  if (!canAccess) {
    return (
      <div className="card-safe overflow-hidden min-w-0 bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">Access denied.</p>
      </div>
    );
  }

  const canReview = user?.role === 'ceo' || user?.role === 'finance_officer';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-col lg:flex-row">
        <div>
          <button onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-2">
            <ArrowLeft className="h-4 w-4" />Back to Dashboard
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Paid Customers</h2>
          <p className="text-gray-600 mt-1">
            Marketing tasks with one or more submissions. Click to open full detail.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="card-safe overflow-hidden min-w-0 flex-1 bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm min-w-0 sm:min-w-[220px]">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Viewing as</p>
                <p className="font-medium text-gray-900">{user.full_name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-start gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title, description, customer name, or phone..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          {searchInput && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {searchTerm && !marketingTasksLoading && (
            <p className="mt-1 text-xs text-gray-500">
              Found {marketingTasksWithSubmissions.length} {marketingTasksWithSubmissions.length === 1 ? 'result' : 'results'} for "{searchTerm}"
            </p>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilterChange(e.target.value)}
          className="py-2.5 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white cursor-pointer shrink-0"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="feedback">Feedback</option>
        </select>
      </div>

      {marketingTasksLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : marketingTasksWithSubmissions.length === 0 ? (
        <div className="card-safe overflow-hidden min-w-0 bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">
            {searchTerm
              ? `No paid customer records matching "${searchTerm}"`
              : 'No paid customer records yet.'}
          </p>
          {!searchTerm && <p className="text-sm text-gray-400 mt-1">Marketing tasks appear here once they receive their first submission.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {marketingTasksWithSubmissions.map((task) => {
            const submissions = getSubmissionWrappers(task);
            const hasNotification =
              (task as any).taskNotification?.hasNotification ||
              task.submissionsWithReviews?.taskNotification?.hasNotification ||
              task.hasNestedNotification ||
              (task.submissionsWithReviews?.submissions || []).some(
                (w: any) => w.hasNotification || (w.submission?.reviews || []).some((r: any) => r.hasNotification)
              );

            return (
              <div key={task.id}
                className={`card-safe overflow-hidden min-w-0 border rounded-xl p-5 bg-white shadow-sm transition-all hover:shadow-md ${
                  hasNotification ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'
                }`}
              >
                {hasNotification && (
                  <div className="mb-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />New
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between mb-3 gap-3">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{task.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Customer: {task.customer_name} · {task.category}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${statusColor(task.status)}`}>
                    {task.status || 'pending'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                    By {task.marketing_user?.full_name || 'Unknown'}
                  </span>
                  <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
                    {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
                  </span>
                  {task.budget != null && (
                    <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                      AED {task.budget.toLocaleString()}
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-3">{task.description}</p>

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
                    ? 'text-green-700' : isRejected
                    ? 'text-red-700' : isFeedback
                    ? 'text-yellow-700' : 'text-blue-700';
                  const iconColor = isApproved
                    ? 'text-green-600' : isRejected
                    ? 'text-red-600' : isFeedback
                    ? 'text-yellow-600' : 'text-blue-600';
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

                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{task.customer_phone}</span>
                  {task.customer_email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{task.customer_email}</span>}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-3">
                    <button onClick={() => openDetail(task)} className="text-sm text-blue-600 hover:underline font-medium">
                      Open Submission Detail
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {task.due_date && (
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Due: {new Date(task.due_date).toLocaleDateString()}</span>
                    )}
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{new Date(task.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showDetail && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 py-6 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">Submission Detail</h3>
                <p className="mt-1 text-sm text-gray-500">View submissions and review feedback</p>
              </div>
              <button onClick={closeDetail} className="rounded-lg p-2 hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 px-6 py-5 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-5">
                <section className="card-safe overflow-hidden min-w-0 rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900">{selectedTask.title}</h4>
                      <p className="mt-1 text-sm text-gray-500">ID: {selectedTask.id}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${statusColor(selectedTask.status)}`}>
                      {selectedTask.status || 'pending'}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                      By {selectedTask.marketing_user?.full_name || 'Unknown'}
                    </span>
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                      {selectedTask.category}
                    </span>
                    {selectedTask.budget != null && (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                        AED {selectedTask.budget.toLocaleString()}
                      </span>
                    )}
                  </div>
                </section>

                <section className="card-safe overflow-hidden min-w-0 rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-3">Customer Details</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-700"><User className="w-4 h-4 text-gray-400" /><span className="font-medium">{selectedTask.customer_name}</span></div>
                    <div className="flex items-center gap-2 text-gray-700"><Phone className="w-4 h-4 text-gray-400" /><span>{selectedTask.customer_phone}</span></div>
                    {selectedTask.customer_email && <div className="flex items-center gap-2 text-gray-700"><Mail className="w-4 h-4 text-gray-400" /><span>{selectedTask.customer_email}</span></div>}
                    <div className="flex items-center gap-2 text-gray-700 sm:col-span-2"><MapPin className="w-4 h-4 text-gray-400" /><span>{selectedTask.customer_address}</span></div>
                  </div>
                </section>

                <section className="card-safe overflow-hidden min-w-0 rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Description</h5>
                  <p className="mt-2 text-sm text-gray-700">{selectedTask.description}</p>
                </section>

                <section className="card-safe overflow-hidden min-w-0 rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Service Description</h5>
                  <p className="mt-2 text-sm text-gray-700">{selectedTask.service_description}</p>
                </section>

                {selectedTask.notes && (
                  <section className="card-safe overflow-hidden min-w-0 rounded-xl border border-gray-200 bg-white p-4">
                    <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Notes</h5>
                    <p className="mt-2 text-sm text-gray-700">{selectedTask.notes}</p>
                  </section>
                )}

                {selectedTask.attachment_urls && selectedTask.attachment_urls.length > 0 && (
                  <section className="card-safe overflow-hidden min-w-0 rounded-xl border border-gray-200 bg-white p-4">
                    <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-3 flex items-center gap-2">
                      <Paperclip className="w-4 h-4" />Task Attachments
                    </h5>
                    <AttachmentViewer attachments={selectedTask.attachment_urls} />
                  </section>
                )}

                <section className="card-safe overflow-hidden min-w-0 rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-4">
                    Submissions &amp; Review Feedback
                  </h5>
                  {taskDetailLoading ? (
                    <div className="flex justify-center py-6">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                    </div>
                  ) : getSubmissionWrappers(selectedTask).length === 0 ? (
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
                        const isMarketingOwner = (user?.role === 'marketing_lead' || user?.role === 'ceo') && selectedTask.marketing_user_id === user.id;
                        const canEditSubmission = latestEditable && taskActive && !taskRejected && isMarketingOwner;
                        const latestEditableId = canEditSubmission ? latestEditable!.submission?.id : null;
                        const isEditingThis = editingSubmissionId !== null;

                        return wrappers.map((wrapper, idx) => {
                          const sub = wrapper.submission;
                          const subHasNotification = wrapper.hasNotification || (sub.reviews || []).some((r) => r.hasNotification);
                          const isSubExpanded = expandedSubmissionId === sub.id;
                          const isThisLatestEditable = sub.id === latestEditableId;
                          const isLatestSubmission = sub.id === latestSubmissionId;
                          const editingBelongsToThisSub = editingReviewId !== null && (sub.reviews || []).some((r) => r.id === editingReviewId);

                          return (
                            <div key={sub.id} className={`border rounded-lg overflow-hidden ${subHasNotification ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}`}>
                              <button type="button" onClick={() => setExpandedSubmissionId(isSubExpanded ? null : sub.id)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
                                <div className="flex items-center gap-3">
                                  {subHasNotification && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                                  <div>
                                    <span className="font-medium text-gray-800">Submission {idx + 1}</span>
                                    <span className="ml-2 text-xs text-gray-500">{new Date(sub.created_at).toLocaleString()}</span>
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
                                {isSubExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                              </button>

                              {isSubExpanded && (
                                <div className="p-4 bg-white space-y-4">
                                  {sub.description && (
                                    <div>
                                      <h6 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Submission Description</h6>
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
                                        <button type="button" onClick={() => {
                                          setEditingSubmissionId(null);
                                          setKeptAttachmentUrls((prev) => ({ ...prev, [selectedTask.id]: [] }));
                                          setDraftNote((prev) => ({ ...prev, [selectedTask.id]: '' }));
                                          setDraftScreenshots((prev) => ({ ...prev, [selectedTask.id]: null }));
                                          draftFilesRef.current = { ...draftFilesRef.current, [selectedTask.id]: [] };
                                        }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-medium">
                                          <X className="w-3.5 h-3.5" />Cancel Edit
                                        </button>
                                      ) : (
                                        <button type="button" onClick={() => handleEditSubmission(selectedTask.id, sub.id)}
                                          className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
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
                                          const isApproved = review.review_outcome === 'approved';
                                          const isRejected = review.review_outcome === 'rejected';
                                          const isFeedback = review.review_outcome === 'feedback';
                                          const ReviewIcon = isApproved ? ThumbsUp : isRejected ? ThumbsDown : MessageSquare;
                                          const entryColor = isApproved ? 'bg-green-100 text-green-700' : isRejected ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700';
                                          const statusLabel = isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Feedback Given';
                                          const reviewTs = new Date(review.created_at).getTime();
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
                                                {review.hasNotification && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${entryColor}`}>
                                                  <ReviewIcon className="w-3 h-3" />{statusLabel}
                                                </span>
                                                <span className="text-xs text-gray-500">{new Date(review.created_at).toLocaleString()}</span>
                                                {review.updated_at && review.updated_at !== review.created_at && (
                                                  <span className="text-[10px] italic text-amber-600">(edited)</span>
                                                )}
                                                <span className="text-xs text-gray-400">by {review.reviewer_user?.full_name || `User ${review.reviewer_user_id.slice(0, 8)}`}</span>
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
                                                <div className="px-3 py-2"><p className="text-sm text-gray-800 whitespace-pre-wrap">{review.description}</p></div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {canReview && isLatestSubmission && selectedTask.task_state === 'active' && (
                                    <div className="border-t border-gray-100 pt-3">
                                      <h6 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                        {editingBelongsToThisSub ? 'Update Review' : 'Review &amp; Decision'}
                                      </h6>
                                      <textarea rows={2} value={reviewDraft[selectedTask.id] ?? ''}
                                        onChange={(e) => setReviewDraft((prev) => ({ ...prev, [selectedTask.id]: e.target.value }))}
                                        placeholder="Your feedback or reason..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm mb-2" />
                                      {editingBelongsToThisSub && (
                                        <div className="mb-2">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingReviewId(null);
                                              setReviewDraft((prev) => ({ ...prev, [selectedTask.id]: '' }));
                                            }}
                                            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-medium"
                                          >
                                            <X className="w-3.5 h-3.5" /> Cancel Edit
                                          </button>
                                        </div>
                                      )}
                                      <div className="flex flex-wrap gap-2">
                                        <button type="button" onClick={() => handleReviewSubmission(selectedTask.id, sub.id, 'approved')}
                                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-300 hover:bg-green-100">
                                          <ThumbsUp className="w-3.5 h-3.5" />Approve
                                        </button>
                                        <button type="button" onClick={() => handleReviewSubmission(selectedTask.id, sub.id, 'rejected')}
                                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-300 hover:bg-red-100">
                                          <ThumbsDown className="w-3.5 h-3.5" />Reject
                                        </button>
                                        <button type="button" onClick={() => handleReviewSubmission(selectedTask.id, sub.id, 'feedback')}
                                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100">
                                          <Send className="w-3.5 h-3.5" />{editingBelongsToThisSub ? 'Update Feedback' : 'Feedback'}
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

                {(user?.role === 'marketing_lead' || user?.role === 'ceo') && selectedTask.marketing_user_id === user.id && selectedTask.status !== 'rejected' && selectedTask.task_state === 'active' && (
                  <section className="rounded-xl border border-dashed border-gray-300 bg-blue-50/50 p-4">
                    <h6 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      {editingSubmissionId ? 'Update' : 'Submit'} to this Task
                    </h6>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Description <span className="text-red-500">*</span></label>
                        <textarea rows={3} value={draftNote[selectedTask.id] ?? ''}
                          onChange={(e) => { setDraftNote((prev) => ({ ...prev, [selectedTask.id]: e.target.value })); if (submissionFieldError[selectedTask.id]) setSubmissionFieldError((prev) => ({ ...prev, [selectedTask.id]: '' })); }}
                          placeholder="Describe your submission..."
                          disabled={submissionDraftLoading[selectedTask.id]}
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${submissionFieldError[selectedTask.id] ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} />
                        {submissionFieldError[selectedTask.id] && <p className="text-xs text-red-600 mt-1">{submissionFieldError[selectedTask.id]}</p>}
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
                              ? 'Add More Files' : 'Choose Files'}
                            <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.rar"
                              onChange={(e) => handleFilesChange(selectedTask.id, e.target.files)} className="hidden" disabled={submissionDraftLoading[selectedTask.id]} />
                          </label>
                          {((draftFilesRef.current[selectedTask.id]?.length ?? 0) > 0 || (keptAttachmentUrls[selectedTask.id]?.length ?? 0) > 0) && (
                            <button type="button" onClick={() => {
                              setKeptAttachmentUrls((prev) => ({ ...prev, [selectedTask.id]: [] }));
                              draftFilesRef.current = { ...draftFilesRef.current, [selectedTask.id]: [] };
                              setDraftFilesVersion((v) => v + 1);
                            }} className="text-sm text-red-600 hover:underline" disabled={submissionDraftLoading[selectedTask.id]}>Remove All</button>
                          )}
                        </div>
                        {(keptAttachmentUrls[selectedTask.id]?.length > 0 || (draftFilesRef.current[selectedTask.id]?.length ?? 0) > 0) && (
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {keptAttachmentUrls[selectedTask.id]?.map((url, idx) => (
                              <div key={`kept-${idx}`} className="relative group border rounded-lg overflow-hidden bg-gray-50">
                                <img src={resolveAttachmentUrl(url)} alt={`Existing attachment ${idx + 1}`} className="w-full h-24 object-contain" />
                                <ImageRemoveButton onRemove={() => setKeptAttachmentUrls((prev) => { const c = prev[selectedTask.id] || []; return { ...prev, [selectedTask.id]: c.filter((_, i) => i !== idx) }; })} />
                              </div>
                            ))}
                            {draftFilesRef.current[selectedTask.id]?.map((file, idx) => (
                              <div key={`new-${idx}`} className="relative group border rounded-lg overflow-hidden bg-gray-50">
                                {file.type?.startsWith('image/') ? (
                                  <img src={URL.createObjectURL(file)} alt={`New file ${idx + 1}`} className="w-full h-24 object-contain"
                                    onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)} />
                                ) : (
                                  <div className="w-full h-24 flex items-center justify-center text-xs text-gray-500 p-2">{file.name}</div>
                                )}
                                <ImageRemoveButton onRemove={() => { const current = draftFilesRef.current[selectedTask.id] || []; const updated = current.filter((_, i) => i !== idx); draftFilesRef.current = { ...draftFilesRef.current, [selectedTask.id]: updated }; setDraftFilesVersion((v) => v + 1); }} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={() => handleSubmitSubmission(selectedTask.id)} disabled={submissionDraftLoading[selectedTask.id]}
                        className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-sm transition-colors">
                        {submissionDraftLoading[selectedTask.id]
                          ? (editingSubmissionId ? 'Updating...' : 'Submitting...')
                          : (editingSubmissionId ? 'Update' : 'Submit')}
                      </button>
                      {submissionError[selectedTask.id] && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{submissionError[selectedTask.id]}</p>
                      )}
                      {submissionSuccess[selectedTask.id] && (
                        <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{submissionSuccess[selectedTask.id]}</p>
                      )}
                    </div>
                  </section>
                )}
              </div>

              <aside className="space-y-4">
                <section className="card-safe overflow-hidden min-w-0 rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Timeline</h5>
                  <div className="mt-2 space-y-2 text-sm text-gray-700">
                    <p>Deadline: {selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString() : 'No deadline'}</p>
                    <p>Created: {new Date(selectedTask.created_at).toLocaleDateString()}</p>
                    <p>Marketing User: {selectedTask.marketing_user?.full_name || 'Unknown'}</p>
                    {selectedTask.preferred_start_date && (
                      <p>Preferred Start: {new Date(selectedTask.preferred_start_date).toLocaleDateString()}</p>
                    )}
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

export default PaidCustomers;
