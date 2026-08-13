import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import marketingApi, {
  MarketingTaskItem,
  MarketingTaskListMeta,
  MarketingSubmissionRaw,
  MarketingSubmissionWrapper,
  MarketingReviewRaw,
} from '../../api/marketingApi';
import notificationApi from '../../api/notificationApi';
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
  Search,
  Send,
  X,
  Paperclip,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  User,
  Tag,
  FileText,
} from 'lucide-react';
import AttachmentViewer from '../components/AttachmentViewer';
import ImageRemoveButton from '../components/ImageRemoveButton';
import { PaginationWithNumbers } from '../components/ui/PaginationWithNumbers';
import { resolveAttachmentUrl } from '../../api/baseApi';

// ------------ NOTIFICATIONS / HIGHLIGHT ------------
export const MARKETING_NOTIFICATIONS_KEY = 'marketing-tasks-notifications-updated';

const viewedMarketingCards = new Set<string>();
let marketingNotificationIds = new Set<string>();

function publishBadgeCount(count: number) {
  window.dispatchEvent(
    new CustomEvent(MARKETING_NOTIFICATIONS_KEY, { detail: count })
  );
}

// ------------ HELPERS ------------

function statusDisplay(status: string | null): string {
  if (!status) return 'pending';
  return status.replace('_', ' ');
}

function statusColor(status: string | null): string {
  switch (status) {
    case 'approved': return 'bg-green-100 text-green-700';
    case 'rejected': return 'bg-red-100 text-red-700';
    case 'feedback': return 'bg-yellow-100 text-yellow-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function getSubmissions(task: MarketingTaskItem): MarketingSubmissionRaw[] {
  return (task.submissionsWithReviews?.submissions || []).map((w) => w.submission);
}

function getSubmissionWrappers(task: MarketingTaskItem): MarketingSubmissionWrapper[] {
  return (task.submissionsWithReviews?.submissions || []).filter((w: any) => w.submission != null);
}

function hasNestedNotifications(task: MarketingTaskItem): boolean {
  const swr = task.submissionsWithReviews;
  return (
    task.hasNestedNotification ||
    (swr?.submissions || []).some(
      (w: any) => w.hasNotification || (w.submission?.reviews || []).some((r: any) => r.hasNotification)
    )
  );
}

const ROWS_PER_DISPLAY = 10;
const PAGE_SIZE = 10;

const STORAGE_KEY = 'marketing-tasks-v1';

// ── Seed data (matches backend response shape) ──
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
      submissions: [
        {
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
            reviews: [
              {
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
              },
            ],
          },
        },
      ],
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
      submissions: [
        {
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
            reviews: [
              {
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
              },
            ],
          },
        },
      ],
      latestActivityTs: 1748870400000,
    },
    hasNestedNotification: true,
  },
  {
    id: 'mkt-task-3',
    marketing_user_id: '3',
    title: 'Finishing Work Portfolio',
    description: 'Compile before/after photos and create a portfolio presentation for the finishing work service line.',
    status: 'pending',
    task_state: 'active',
    due_date: '2026-07-10T23:59:59Z',
    attachment_urls: null,
    updated_by: null,
    created_at: '2026-06-03T09:00:00Z',
    updated_at: null,
    marketing_user: { id: '3', full_name: 'Emily Chen', role: 'marketing' },
    updated_by_user: null,
    customer_name: 'Omar El-Sayed',
    customer_phone: '+971 52 345 6789',
    customer_email: 'omar.elsayed@example.com',
    customer_address: 'Jumeirah Beach Residence, Dubai',
    category: 'finishing_work',
    service_description: 'Complete finishing for a 3-bedroom apartment including flooring, painting, and custom cabinetry.',
    preferred_start_date: '2026-07-01',
    budget: 250000,
    notes: 'Marble flooring in living areas, wooden flooring in bedrooms.',
    taskNotification: { hasNotification: false, notificationId: null },
    submissionsWithReviews: {
      submissions: [],
      latestActivityTs: 0,
    },
    hasNestedNotification: false,
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
      submissions: [
        {
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
            reviews: [
              {
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
              },
            ],
          },
        },
      ],
      latestActivityTs: 1748440800000,
    },
    hasNestedNotification: true,
  },
  {
    id: 'mkt-task-5',
    marketing_user_id: '3',
    title: 'Custom Furniture Catalog',
    description: 'Develop a product catalog for custom furniture and joinery offerings.',
    status: 'pending',
    task_state: 'active',
    due_date: '2026-07-20T23:59:59Z',
    attachment_urls: null,
    updated_by: null,
    created_at: '2026-06-05T08:00:00Z',
    updated_at: null,
    marketing_user: { id: '3', full_name: 'Emily Chen', role: 'marketing' },
    updated_by_user: null,
    customer_name: 'Rashid Al Fahim',
    customer_phone: '+971 54 321 6549',
    customer_email: '',
    customer_address: 'Al Ain, Abu Dhabi',
    category: 'other',
    service_description: 'Custom built-in library and reading nook for a private residence.',
    preferred_start_date: '2026-07-10',
    budget: 45000,
    notes: 'Woodwork must match existing mahogany furniture.',
    taskNotification: { hasNotification: false, notificationId: null },
    submissionsWithReviews: {
      submissions: [],
      latestActivityTs: 0,
    },
    hasNestedNotification: false,
  },
];

const categoryLabels: Record<string, string> = {
  home_design: 'Home Design',
  finishing_work: 'Finishing Work',
  hair_salon_design: "Women's Hair Salon Design",
  other: 'Other',
};

// Module-level cache
let cachedTasks: MarketingTaskItem[] | null = null;
let cachedMeta: MarketingTaskListMeta | null = null;

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

export function MarketingTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<MarketingTaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [apiPage, setApiPage] = useState(1);
  const [meta, setMeta] = useState<MarketingTaskListMeta | null>(null);

  const [selectedTask, setSelectedTask] = useState<MarketingTaskItem | null>(null);
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
  const [reviewError, setReviewError] = useState<Record<string, string>>({});

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    customer_address: '',
    category: 'home_design',
    service_description: '',
    preferred_start_date: '',
    budget: '',
    notes: '',
    deadline: '',
  });
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const createFilesRef = useRef<File[]>([]);
  const [, setCreateFilesVersion] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [taskSuccessMsg, setTaskSuccessMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [showEditTask, setShowEditTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: '', description: '', customer_name: '', customer_phone: '',
    customer_email: '', customer_address: '', category: 'home_design',
    service_description: '', preferred_start_date: '', budget: '', notes: '', deadline: '',
  });
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const editFilesRef = useRef<File[]>([]);
  const [, setEditFilesVersion] = useState(0);
  const [keptTaskUrls, setKeptTaskUrls] = useState<string[]>([]);
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});
  const [editError, setEditError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const seenThisSession = useRef<Set<string>>(new Set());
  const observedElements = useRef<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const tasksRef = useRef<MarketingTaskItem[]>([]);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  const highlightedIds = (() => {
    if (tasks.length === 0) return new Set<string>();
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
    return new Set(
      [...marketingNotificationIds].filter((id) => !viewedMarketingCards.has(id))
    );
  })();

  useEffect(() => {
    publishBadgeCount(highlightedIds.size);
  }, [highlightedIds]);

  const canManage = user?.role === 'marketing_lead' || user?.role === 'ceo';
  const canReview = user?.role === 'ceo' || user?.role === 'general_manager';

  const fetchTasks = useCallback(async (page: number, search: string, status: string, force = false) => {
    if (!user) return;
    if (!force && cachedTasks && cachedMeta) {
      setTasks(cachedTasks);
      setMeta(cachedMeta);
      marketingNotificationIds = new Set(
        cachedTasks.filter((t) => {
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
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    const applyTasks = (data: MarketingTaskItem[], total: number) => {
      setTasks(data);
      setMeta({ total, page, limit: PAGE_SIZE, totalPages: Math.ceil(total / PAGE_SIZE) });
      cachedTasks = data;
      cachedMeta = { total, page, limit: PAGE_SIZE, totalPages: Math.ceil(total / PAGE_SIZE) };

      marketingNotificationIds = new Set(
        data.filter((t) => {
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
    };

    try {
      const response = await marketingApi.getMarketingTasks({ page, limit: PAGE_SIZE, ...(search ? { search } : {}), ...(status ? { status } : {}) });
      if (response.success) {
        applyTasks(response.data, response.meta.total);
        if (response.data.length > 0) persistLocalTasks(response.data);
      } else if (search || status) {
        applyTasks([], 0);
        setError(null);
      } else {
        const local = initLocalWithSeed();
        const start = (page - 1) * PAGE_SIZE;
        const paged = local.slice(start, start + PAGE_SIZE);
        applyTasks(paged, local.length);
        setError(null);
      }
    } catch {
      if (search || status) {
        applyTasks([], 0);
        setError(null);
      } else {
        const local = initLocalWithSeed();
        const start = (page - 1) * PAGE_SIZE;
        const paged = local.slice(start, start + PAGE_SIZE);
        applyTasks(paged, local.length);
        setError(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchTasks(apiPage, searchTerm, statusFilter);
  }, [user, apiPage, searchTerm, statusFilter, fetchTasks]);

  // IntersectionObserver for auto-mark-read
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
    return () => {
      observer.disconnect();
      observedElements.current.clear();
    };
  }, [highlightedIds]);

  const commitSeenSession = () => {
    if (seenThisSession.current.size === 0) return;
    const currentTasks = tasksRef.current;
    seenThisSession.current.forEach((id) => {
      const task = currentTasks.find((t) => t.id === id);
      if (!task || !hasNestedNotifications(task)) {
        viewedMarketingCards.add(id);
      }
    });
    seenThisSession.current.clear();
    observedElements.current.clear();
  };

  useEffect(() => { return () => { commitSeenSession(); }; }, []);

  if (!user) return null;

  const sortedTasks = tasks;

  const totalDisplayPages = meta ? Math.ceil(meta.total / PAGE_SIZE) : 1;
  const handlePageChange = (page: number) => {
    cachedTasks = null;
    cachedMeta = null;
    setApiPage(page);
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      const trimmed = value.trim();
      if (trimmed !== searchTerm) {
        cachedTasks = null;
        cachedMeta = null;
        setApiPage(1);
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
      cachedTasks = null;
      cachedMeta = null;
      setApiPage(1);
      setSearchTerm('');
    }
  };

  const handleStatusFilterChange = (value: string) => {
    cachedTasks = null;
    cachedMeta = null;
    setApiPage(1);
    setStatusFilter(value);
  };

  const openDetail = (task: MarketingTaskItem) => {
    setSelectedTask(task);
    setDraftNote((prev) => ({ ...prev, [task.id]: '' }));
    setDraftScreenshots((prev) => ({ ...prev, [task.id]: null }));
    draftFilesRef.current = { ...draftFilesRef.current, [task.id]: [] };
    setExpandedSubmissionId(null);
    setEditingReviewId(null);
    setShowDetail(true);
    setSubmissionError((prev) => ({ ...prev, [task.id]: '' }));
    setReviewError((prev) => ({ ...prev, [task.id]: '' }));

    const notifIds: string[] = [];
    const swr = task.submissionsWithReviews;
    const topNotif = (task as any).taskNotification;
    if (topNotif?.hasNotification && topNotif.notificationId) {
      notifIds.push(topNotif.notificationId);
    }
    if (swr?.taskNotification?.hasNotification && swr.taskNotification.notificationId) {
      notifIds.push(swr.taskNotification.notificationId);
    }
    (swr?.submissions || []).forEach((w: any) => {
      if (w.hasNotification && w.notificationId) notifIds.push(w.notificationId);
      (w.submission?.reviews || []).forEach((r: any) => {
        if (r.hasNotification && r.notificationId) notifIds.push(r.notificationId);
      });
    });

    if (notifIds.length > 0) {
      notificationApi.bulkMarkRead(notifIds).catch(() => {});

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
      setSelectedTask(clearedTask);

      const updatedTasks = tasksRef.current.map((t) =>
        t.id === task.id ? clearedTask : t
      );
      setTasks(updatedTasks);
      tasksRef.current = updatedTasks;
      if (cachedTasks) {
        cachedTasks = cachedTasks.map((t) => (t.id === task.id ? clearedTask : t));
      }

      viewedMarketingCards.add(task.id);
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

  const handleSubmitSubmission = async (taskId: string) => {
    const note = (draftNote[taskId] ?? '').trim();
    if (!note) {
      setSubmissionError((prev) => ({ ...prev, [taskId]: 'Submission description is required.' }));
      return;
    }
    const files = draftFilesRef.current[taskId] ?? [];

    setSubmissionDraftLoading((prev) => ({ ...prev, [taskId]: true }));
    setSubmissionError((prev) => ({ ...prev, [taskId]: '' }));

    const isEditing = editingSubmissionId !== null;

    let errorMsg: string | null = null;

    try {
      const formData = new FormData();
      formData.append('description', note);
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
            return marketingApi.updateSubmission(editingSubmissionId!, formData);
          })()
        : await marketingApi.createSubmission(taskId, formData);

      if (response.success && response.data) {
        const all = cachedTasks ?? [];
        const now = new Date().toISOString();
        if (isEditing) {
          const updatedSub = {
            ...response.data,
            reviews: response.data.reviews ?? [],
          } as MarketingSubmissionRaw;
          const updated = all.map((t) =>
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
          cachedTasks = updated;
          setTasks(updated);
          const updatedSelected = updated.find((t) => t.id === taskId);
          if (updatedSelected) setSelectedTask(updatedSelected);
        } else {
          const newSub = {
            ...response.data,
            reviews: response.data.reviews ?? [],
          } as MarketingSubmissionRaw;
          const newWrapper: MarketingSubmissionWrapper = {
            submissionId: newSub.id,
            hasNotification: false,
            notificationId: null,
            submission: newSub,
          };
          const updated = all.map((t) =>
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
          cachedTasks = updated;
          setTasks(updated);
          const updatedSelected = updated.find((t) => t.id === taskId);
          if (updatedSelected) setSelectedTask(updatedSelected);
        }
      } else {
        errorMsg = response.message || 'Submission failed. Please try again.';
      }
    } catch (err: unknown) {
      errorMsg =
        (err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined) ||
        'Unable to connect to server. Please try again.';
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

  const handleReviewSubmission = async (taskId: string, subId: string, outcome: string) => {
    const note = reviewDraft[taskId] ?? '';
    setReviewError((prev) => ({ ...prev, [taskId]: '' }));

    let errorMsg: string | null = null;
    let responseData: MarketingReviewRaw | undefined;

    try {
      const payload = {
        description: note.trim() || `Review: ${outcome}`,
        review_outcome: outcome,
      };
      if (editingReviewId) {
        const res = await marketingApi.updateReview(editingReviewId, payload);
        if (res.success) responseData = res.data;
        else errorMsg = res.message || 'Unable to update review. Please try again.';
      } else {
        const res = await marketingApi.createReview(subId, payload);
        if (res.success) responseData = res.data;
        else errorMsg = res.message || 'Unable to submit review. Please try again.';
      }
    } catch (err: unknown) {
      errorMsg =
        (err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined) ||
        'Unable to submit review. Please try again.';
    }

    if (errorMsg) {
      setReviewError((prev) => ({ ...prev, [taskId]: errorMsg! }));
    } else if (responseData) {
      setEditingReviewId(null);
      setReviewDraft((prev) => ({ ...prev, [taskId]: '' }));

      const all = cachedTasks ?? [];
      const now = new Date().toISOString();
      if (editingReviewId) {
        const updated = all.map((t) =>
          t.id === taskId
            ? {
                ...t,
                updated_at: now,
                submissionsWithReviews: {
                  ...t.submissionsWithReviews,
                  submissions: (t.submissionsWithReviews?.submissions || []).map((w) => {
                    const reviews = (w.submission?.reviews || []).map((r) =>
                      r.id === editingReviewId ? responseData! : r
                    );
                    return { ...w, submission: { ...w.submission, reviews } };
                  }),
                  latestActivityTs: Date.now(),
                },
              }
            : t
        );
        cachedTasks = updated;
        setTasks(updated);
        const updatedSelected = updated.find((t) => t.id === taskId);
        if (updatedSelected) setSelectedTask(updatedSelected);
      } else {
        const updated = all.map((t) =>
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
        cachedTasks = updated;
        setTasks(updated);
        const updatedSelected = updated.find((t) => t.id === taskId);
        if (updatedSelected) setSelectedTask(updatedSelected);
      }
    }
  };

  const openCreateModal = () => {
    setNewTaskForm({
      title: '', description: '', customer_name: '', customer_phone: '',
      customer_email: '', customer_address: '', category: 'home_design',
      service_description: '', preferred_start_date: '', budget: '', notes: '', deadline: '',
    });
    setScreenshotPreview(null);
    createFilesRef.current = [];
    setCreateFilesVersion((v) => v + 1);
    setError(null);
    setTaskSuccessMsg('');
    setFieldErrors({});
    setShowCreateModal(true);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    const title = newTaskForm.title.trim();
    const description = newTaskForm.description.trim();
    const customer_name = newTaskForm.customer_name.trim();
    const customer_phone = newTaskForm.customer_phone.trim();
    const customer_email = newTaskForm.customer_email.trim();
    const customer_address = newTaskForm.customer_address.trim();
    const category = newTaskForm.category;
    const service_description = newTaskForm.service_description.trim();
    const preferred_start_date = newTaskForm.preferred_start_date.trim();
    const budget = newTaskForm.budget.trim();
    const notes = newTaskForm.notes.trim();
    const deadline = newTaskForm.deadline.trim();

    setError(null);
    setTaskSuccessMsg('');

    const errors: Record<string, string> = {};
    if (!title) errors.title = 'Title is required.';
    else if (title.length > 500) errors.title = 'Title must be 500 characters or fewer.';
    if (!customer_name) errors.customer_name = 'Customer name is required.';
    if (!customer_phone) errors.customer_phone = 'Customer phone is required.';
    if (!customer_address) errors.customer_address = 'Customer address is required.';
    if (!description && !service_description) {
      errors.description = 'At least one of Description or Service Description is required.';
      errors.service_description = 'At least one of Description or Service Description is required.';
    }
    if (description && description.length > 5000) errors.description = 'Description must be 5000 characters or fewer.';
    if (service_description && service_description.length > 5000) errors.service_description = 'Service Description must be 5000 characters or fewer.';

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsCreating(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('customer_name', customer_name);
      formData.append('customer_phone', customer_phone);
      if (customer_email) formData.append('customer_email', customer_email);
      formData.append('customer_address', customer_address);
      formData.append('category', category);
      formData.append('service_description', service_description);
      if (preferred_start_date) formData.append('preferred_start_date', preferred_start_date);
      if (budget) formData.append('budget', String(Number(budget)));
      if (notes) formData.append('notes', notes);
      if (deadline) formData.append('due_date', new Date(deadline).toISOString());
      for (const file of createFilesRef.current) {
        formData.append('attachmentFiles', file);
      }

      const response = await marketingApi.createMarketingTask(formData);

      if (response.success) {
        setTaskSuccessMsg(response.message || 'Marketing task created successfully');
        setNewTaskForm({
          title: '', description: '', customer_name: '', customer_phone: '',
          customer_email: '', customer_address: '', category: 'home_design',
          service_description: '', preferred_start_date: '', budget: '', notes: '', deadline: '',
        });
        setScreenshotPreview(null);
        createFilesRef.current = [];
        setCreateFilesVersion((v) => v + 1);
        setFieldErrors({});
        setShowCreateModal(false);
        cachedTasks = null;
        cachedMeta = null;
        await fetchTasks(apiPage, searchTerm, statusFilter, true);
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

  const openEditTask = (task: MarketingTaskItem) => {
    setEditingTaskId(task.id);
    setEditForm({
      title: task.title,
      description: task.description,
      customer_name: task.customer_name,
      customer_phone: task.customer_phone,
      customer_email: task.customer_email || '',
      customer_address: task.customer_address,
      category: task.category,
      service_description: task.service_description,
      preferred_start_date: task.preferred_start_date || '',
      budget: task.budget != null ? String(task.budget) : '',
      notes: task.notes || '',
      deadline: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
    });
    setEditImagePreview(null);
    editFilesRef.current = [];
    setEditFilesVersion((v) => v + 1);
    setKeptTaskUrls(task.attachment_urls || []);
    setEditFormErrors({});
    setEditError('');
    setShowEditTask(true);
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTaskId) return;

    const title = editForm.title.trim();
    const description = editForm.description.trim();
    const customer_name = editForm.customer_name.trim();
    const customer_phone = editForm.customer_phone.trim();
    const customer_email = editForm.customer_email.trim();
    const customer_address = editForm.customer_address.trim();
    const category = editForm.category;
    const service_description = editForm.service_description.trim();
    const preferred_start_date = editForm.preferred_start_date.trim();
    const budget = editForm.budget.trim();
    const notes = editForm.notes.trim();
    const deadline = editForm.deadline.trim();

    setEditError('');

    const errors: Record<string, string> = {};
    if (!title) errors.title = 'Title is required.';
    else if (title.length > 500) errors.title = 'Title must be 500 characters or fewer.';
    if (!customer_name) errors.customer_name = 'Customer name is required.';
    if (!customer_phone) errors.customer_phone = 'Customer phone is required.';
    if (!customer_address) errors.customer_address = 'Customer address is required.';
    if (!description && !service_description) {
      errors.description = 'At least one of Description or Service Description is required.';
      errors.service_description = 'At least one of Description or Service Description is required.';
    }
    if (description && description.length > 5000) errors.description = 'Description must be 5000 characters or fewer.';
    if (service_description && service_description.length > 5000) errors.service_description = 'Service Description must be 5000 characters or fewer.';

    setEditFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsUpdating(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('customer_name', customer_name);
      formData.append('customer_phone', customer_phone);
      if (customer_email) formData.append('customer_email', customer_email);
      formData.append('customer_address', customer_address);
      formData.append('category', category);
      formData.append('service_description', service_description);
      if (preferred_start_date) formData.append('preferred_start_date', preferred_start_date);
      if (budget) formData.append('budget', String(Number(budget)));
      if (notes) formData.append('notes', notes);
      if (deadline) formData.append('due_date', new Date(deadline).toISOString());

      for (const file of editFilesRef.current) {
        formData.append('attachmentFiles', file);
      }
      if (keptTaskUrls.length > 0) {
        for (const url of keptTaskUrls) formData.append('attachment_urls', url);
      } else {
        formData.append('attachment_urls', '');
      }

      const response = await marketingApi.updateMarketingTask(editingTaskId, formData);

      if (response.success) {
        setTaskSuccessMsg(response.message || 'Marketing task updated successfully');
        setShowEditTask(false);
        setEditingTaskId(null);
        setEditFormErrors({});
        cachedTasks = null;
        cachedMeta = null;
        await fetchTasks(apiPage, searchTerm, statusFilter, true);
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length === 0) return;
    createFilesRef.current = [...createFilesRef.current, ...newFiles];
    setCreateFilesVersion((v) => v + 1);
  };

  const summary = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    approved: tasks.filter((t) => t.status === 'approved').length,
    feedback: tasks.filter((t) => t.status === 'feedback').length,
    rejected: tasks.filter((t) => t.status === 'rejected').length,
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
          <h2 className="text-2xl font-semibold text-slate-900">Marketing Tasks</h2>
          <p className="mt-1 text-sm text-slate-600">
            Create and manage marketing tasks, submit deliverables, and receive feedback.
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
            Create Marketing Task
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      )}

      {taskSuccessMsg && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 text-sm">{taskSuccessMsg}</div>
      )}

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
          {meta && searchTerm && (
            <p className="mt-1 text-xs text-gray-500">
              Found {meta.total} {meta.total === 1 ? 'result' : 'results'} for "{searchTerm}"
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

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: summary.total },
          { label: 'Pending', value: summary.pending },
          { label: 'Approved', value: summary.approved },
          { label: 'Feedback', value: summary.feedback },
          { label: 'Rejected', value: summary.rejected },
        ].map((stat) => (
          <div key={stat.label} className="card-safe overflow-hidden min-w-0 bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {sortedTasks.length === 0 ? (
        <div className="card-safe overflow-hidden min-w-0 bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {searchTerm
              ? `No tasks matching "${searchTerm}"`
              : 'No marketing tasks yet.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sortedTasks.map((task) => {
              const isHighlighted = highlightedIds.has(task.id);
              const hasSubmissions = getSubmissionWrappers(task).length > 0;
              return (
                <div
                  key={task.id}
                  data-highlighted-id={isHighlighted ? task.id : undefined}
                  className={`card-safe overflow-hidden min-w-0 bg-white rounded-xl p-6 shadow-sm border transition-all duration-300 hover:shadow-md ${
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
                        Customer: {task.customer_name} · Category: {categoryLabels[task.category] || task.category}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${statusColor(task.status)}`}>
                      {statusDisplay(task.status)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                      By {task.marketing_user?.full_name || 'Unknown'}
                    </span>
                    {hasSubmissions && (
                      <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
                        {getSubmissionWrappers(task).length} submission{getSubmissionWrappers(task).length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {task.budget != null && (
                      <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                        AED {task.budget.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.service_description}</p>

                  <div className="flex flex-wrap gap-2 mb-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {task.customer_phone}</span>
                    {task.customer_email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {task.customer_email}</span>}
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <button
                      onClick={() => openDetail(task)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Open Submission Detail
                    </button>
                    {canManage && user?.role === 'marketing_lead' && task.marketing_user_id === user.id && (
                      <button
                        type="button"
                        onClick={() => openEditTask(task)}
                        className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit Task
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    {task.due_date && (
                      <div className="flex items-center gap-2 text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
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
          <PaginationWithNumbers
            currentPage={apiPage}
            totalPages={totalDisplayPages}
            totalItems={meta?.total}
            onPageChange={handlePageChange}
          />
        </>
      )}

      {/* ── Submission Detail Modal ── */}
      {showDetail && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 py-6 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">Marketing Submission Detail</h3>
                <p className="mt-1 text-sm text-gray-500">View submissions and review feedback</p>
              </div>
              <button onClick={closeDetail} className="rounded-lg p-2 hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 px-6 py-5 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-5">
                {/* Task Info */}
                <section className="card-safe overflow-hidden min-w-0 rounded-xl border border-gray-200 bg-white p-4">
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
                      By {selectedTask.marketing_user?.full_name || 'Unknown'}
                    </span>
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                      {categoryLabels[selectedTask.category] || selectedTask.category}
                    </span>
                    {selectedTask.budget != null && (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                        AED {selectedTask.budget.toLocaleString()}
                      </span>
                    )}
                  </div>
                </section>

                {/* Customer Info */}
                <section className="card-safe overflow-hidden min-w-0 rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-3">Customer Details</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-700">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{selectedTask.customer_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{selectedTask.customer_phone}</span>
                    </div>
                    {selectedTask.customer_email && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span>{selectedTask.customer_email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-700 sm:col-span-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{selectedTask.customer_address}</span>
                    </div>
                  </div>
                </section>

                {/* Description */}
                <section className="card-safe overflow-hidden min-w-0 rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Description</h5>
                  <p className="mt-2 text-sm text-gray-700">{selectedTask.description}</p>
                </section>

                {/* Service Description */}
                <section className="card-safe overflow-hidden min-w-0 rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Service Description</h5>
                  <p className="mt-2 text-sm text-gray-700">{selectedTask.service_description}</p>
                </section>

                {/* Notes */}
                {selectedTask.notes && (
                  <section className="card-safe overflow-hidden min-w-0 rounded-xl border border-gray-200 bg-white p-4">
                    <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Notes</h5>
                    <p className="mt-2 text-sm text-gray-700">{selectedTask.notes}</p>
                  </section>
                )}

                {/* Task Attachments */}
                {selectedTask.attachment_urls && selectedTask.attachment_urls.length > 0 && (
                  <section className="card-safe overflow-hidden min-w-0 rounded-xl border border-gray-200 bg-white p-4">
                    <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-3 flex items-center gap-2">
                      <Paperclip className="w-4 h-4" />
                      Task Attachments
                    </h5>
                    <AttachmentViewer attachments={selectedTask.attachment_urls} />
                  </section>
                )}

                {/* Submissions & Reviews */}
                <section className="card-safe overflow-hidden min-w-0 rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-4">
                    Submissions &amp; Review Feedback
                  </h5>
                  {getSubmissionWrappers(selectedTask).length === 0 ? (
                    <p className="text-sm text-gray-500">No submissions yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {(() => {
                        const wrappers = getSubmissionWrappers(selectedTask);
                        const hasAnyReview = wrappers.some((w) => (w.submission?.reviews || []).length > 0);
                        const latestSubmissionId = wrappers.length > 0 ? wrappers[wrappers.length - 1].submission?.id : null;
                        const editableWrappers = wrappers.filter((w) => (w.submission?.reviews || []).length === 0);
                        const latestEditable = editableWrappers.length > 0 ? editableWrappers[editableWrappers.length - 1] : null;
                        const taskActive = selectedTask.task_state === 'active';
                        const taskRejected = selectedTask.status === 'rejected';
                        const isMarketingOwner = user?.role === 'marketing_lead' && selectedTask.marketing_user_id === user.id;
                        const canEditSubmission = latestEditable && taskActive && !taskRejected && isMarketingOwner;
                        const latestEditableId = canEditSubmission ? latestEditable!.submission?.id : null;
                        const isEditingThis = editingSubmissionId !== null;

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

                                  {canReview && isLatestSubmission && selectedTask.task_state === 'active' && (
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
                                      {editingReviewId && (
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

                {/* Submission Form */}
                {user?.role === 'marketing_lead' && selectedTask.marketing_user_id === user.id && selectedTask.status !== 'rejected' && selectedTask.task_state === 'active' && (
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
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
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
              </div>

              {/* Sidebar Timeline */}
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

      {/* ── Create Task Modal ── */}
      {showCreateModal && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="card-safe overflow-hidden min-w-0 bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Create Marketing Task</h3>
                <p className="text-sm text-gray-500 mt-0.5">Fill in the task and customer details. Fields marked with <span className="text-red-500">*</span> are required.</p>
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

              {/* Customer Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={newTaskForm.customer_name}
                    onChange={(e) => { setNewTaskForm((f) => ({ ...f, customer_name: e.target.value })); if (fieldErrors.customer_name) setFieldErrors((prev) => { const n = { ...prev }; delete n.customer_name; return n; }); }}
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm ${fieldErrors.customer_name ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                    disabled={isCreating}
                  />
                  {fieldErrors.customer_name && <p className="text-xs text-red-600 mt-1">{fieldErrors.customer_name}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Customer Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={newTaskForm.customer_phone}
                    onChange={(e) => { setNewTaskForm((f) => ({ ...f, customer_phone: e.target.value })); if (fieldErrors.customer_phone) setFieldErrors((prev) => { const n = { ...prev }; delete n.customer_phone; return n; }); }}
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm ${fieldErrors.customer_phone ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                    disabled={isCreating}
                  />
                  {fieldErrors.customer_phone && <p className="text-xs text-red-600 mt-1">{fieldErrors.customer_phone}</p>}
                </div>
              </div>

              {/* Email & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Customer Email</label>
                  <input
                    type="email"
                    value={newTaskForm.customer_email}
                    onChange={(e) => setNewTaskForm((f) => ({ ...f, customer_email: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                    disabled={isCreating}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Customer Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={newTaskForm.customer_address}
                    onChange={(e) => { setNewTaskForm((f) => ({ ...f, customer_address: e.target.value })); if (fieldErrors.customer_address) setFieldErrors((prev) => { const n = { ...prev }; delete n.customer_address; return n; }); }}
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm ${fieldErrors.customer_address ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                    disabled={isCreating}
                  />
                  {fieldErrors.customer_address && <p className="text-xs text-red-600 mt-1">{fieldErrors.customer_address}</p>}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
                <select
                  value={newTaskForm.category}
                  onChange={(e) => setNewTaskForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                  disabled={isCreating}
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Service Description */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Service Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={newTaskForm.service_description}
                  onChange={(e) => { setNewTaskForm((f) => ({ ...f, service_description: e.target.value })); if (fieldErrors.service_description) setFieldErrors((prev) => { const n = { ...prev }; delete n.service_description; return n; }); }}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm ${fieldErrors.service_description ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                  disabled={isCreating}
                />
                {fieldErrors.service_description && <p className="text-xs text-red-600 mt-1">{fieldErrors.service_description}</p>}
              </div>

              {/* Budget, Preferred Start Date, Deadline */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Budget (AED)</label>
                  <input
                    type="number"
                    value={newTaskForm.budget}
                    onChange={(e) => setNewTaskForm((f) => ({ ...f, budget: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                    disabled={isCreating}
                    min="0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Preferred Start Date</label>
                  <input
                    type="date"
                    value={newTaskForm.preferred_start_date}
                    onChange={(e) => setNewTaskForm((f) => ({ ...f, preferred_start_date: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                    disabled={isCreating}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Deadline</label>
                  <input
                    type="date"
                    value={newTaskForm.deadline}
                    onChange={(e) => setNewTaskForm((f) => ({ ...f, deadline: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                    disabled={isCreating}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
                <textarea
                  rows={2}
                  value={newTaskForm.notes}
                  onChange={(e) => setNewTaskForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                  disabled={isCreating}
                />
              </div>

              {/* Attachment */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Attachment (optional)</label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm">
                    <Image className="w-4 h-4" />
                    {createFilesRef.current.length ? `${createFilesRef.current.length} file(s)` : 'Choose Files'}
                    <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" disabled={isCreating} />
                  </label>
                  {createFilesRef.current.length > 0 && (
                    <button type="button" onClick={() => { createFilesRef.current = []; setCreateFilesVersion((v) => v + 1); }} className="text-sm text-red-600 hover:underline" disabled={isCreating}>Remove All</button>
                  )}
                </div>
                {createFilesRef.current.length > 0 && (
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {createFilesRef.current.map((file, idx) => (
                      <div key={idx} className="relative group border rounded-lg overflow-hidden bg-gray-50">
                        {file.type?.startsWith('image/') ? (
                          <img src={URL.createObjectURL(file)} alt={`New ${idx + 1}`} className="w-full h-24 object-contain" onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)} />
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

      {/* ── Edit Task Modal ── */}
      {showEditTask && editingTaskId && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="card-safe overflow-hidden min-w-0 bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Edit Marketing Task</h3>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={editForm.customer_name}
                    onChange={(e) => { setEditForm({ ...editForm, customer_name: e.target.value }); if (editFormErrors.customer_name) setEditFormErrors((prev) => { const n = { ...prev }; delete n.customer_name; return n; }); }}
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm ${editFormErrors.customer_name ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                    disabled={isUpdating}
                  />
                  {editFormErrors.customer_name && <p className="text-xs text-red-600 mt-1">{editFormErrors.customer_name}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Customer Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={editForm.customer_phone}
                    onChange={(e) => { setEditForm({ ...editForm, customer_phone: e.target.value }); if (editFormErrors.customer_phone) setEditFormErrors((prev) => { const n = { ...prev }; delete n.customer_phone; return n; }); }}
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm ${editFormErrors.customer_phone ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                    disabled={isUpdating}
                  />
                  {editFormErrors.customer_phone && <p className="text-xs text-red-600 mt-1">{editFormErrors.customer_phone}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Customer Email</label>
                  <input
                    type="email"
                    value={editForm.customer_email}
                    onChange={(e) => setEditForm({ ...editForm, customer_email: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                    disabled={isUpdating}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Customer Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={editForm.customer_address}
                    onChange={(e) => { setEditForm({ ...editForm, customer_address: e.target.value }); if (editFormErrors.customer_address) setEditFormErrors((prev) => { const n = { ...prev }; delete n.customer_address; return n; }); }}
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm ${editFormErrors.customer_address ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                    disabled={isUpdating}
                  />
                  {editFormErrors.customer_address && <p className="text-xs text-red-600 mt-1">{editFormErrors.customer_address}</p>}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                  disabled={isUpdating}
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Service Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={editForm.service_description}
                  onChange={(e) => { setEditForm({ ...editForm, service_description: e.target.value }); if (editFormErrors.service_description) setEditFormErrors((prev) => { const n = { ...prev }; delete n.service_description; return n; }); }}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm ${editFormErrors.service_description ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                  disabled={isUpdating}
                />
                {editFormErrors.service_description && <p className="text-xs text-red-600 mt-1">{editFormErrors.service_description}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Budget (AED)</label>
                  <input
                    type="number"
                    value={editForm.budget}
                    onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                    disabled={isUpdating}
                    min="0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Preferred Start Date</label>
                  <input
                    type="date"
                    value={editForm.preferred_start_date}
                    onChange={(e) => setEditForm({ ...editForm, preferred_start_date: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                    disabled={isUpdating}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Deadline</label>
                  <input
                    type="date"
                    value={editForm.deadline}
                    onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                    disabled={isUpdating}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                  disabled={isUpdating}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Attachment (optional)</label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm">
                    <Image className="w-4 h-4" />
                    {editFilesRef.current.length ? `${editFilesRef.current.length} new file(s)` : (keptTaskUrls.length > 0 ? 'Add More Files' : 'Choose Files')}
                    <input type="file" accept="image/*" multiple onChange={(event) => { const newFiles = Array.from(event.target.files || []); if (newFiles.length === 0) return; editFilesRef.current = [...editFilesRef.current, ...newFiles]; setEditFilesVersion((v) => v + 1); }} className="hidden" disabled={isUpdating} />
                  </label>
                  {((editFilesRef.current.length > 0) || (keptTaskUrls.length > 0)) && (
                    <button type="button" onClick={() => { editFilesRef.current = []; setKeptTaskUrls([]); setEditFilesVersion((v) => v + 1); }} className="text-sm text-red-600 hover:underline" disabled={isUpdating}>Remove All</button>
                  )}
                </div>
                {(keptTaskUrls.length > 0 || editFilesRef.current.length > 0) && (
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
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
    </div>
  );
}

export default MarketingTasks;
