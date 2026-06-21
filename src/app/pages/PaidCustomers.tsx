import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import marketingApi, {
  MarketingTaskItem,
  MarketingSubmissionWrapper,
  MarketingSubmissionRaw,
  MarketingReviewRaw,
} from '../../api/marketingApi';
import notificationApi from '../../api/notificationApi';
import {
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
  XCircle,
  AlertCircle,
} from 'lucide-react';
import AttachmentViewer from '../components/AttachmentViewer';

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
  const items = task.submissionsWithReviews?.submissions || [];
  return items.map((s: any) => ({
    submissionId: s.submissionId || s.id,
    hasNotification: s.hasNotification || false,
    notificationId: s.notificationId || null,
    submission: s.submission || {
      id: s.id,
      marketing_task_id: s.marketing_task_id,
      description: s.description,
      attachment_urls: s.attachment_urls,
      created_at: s.created_at,
      updated_at: s.updated_at,
      reviews: s.reviews || [],
    },
  }));
}

export function getUnseenPaidCustomerCount() {
  return marketingNotificationIds.size - viewedMarketingCards.size;
}

export function PaidCustomers() {
  const { user } = useAuth();

  const [marketingTasks, setMarketingTasks] = useState<MarketingTaskItem[]>([]);
  const [marketingTasksLoading, setMarketingTasksLoading] = useState(true);

  const [selectedTask, setSelectedTask] = useState<MarketingTaskItem | null>(null);
  const [taskDetailLoading, setTaskDetailLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  const [editingSubmissionId, setEditingSubmissionId] = useState<string | null>(null);
  const [reviewDraft, setReviewDraft] = useState<Record<string, string>>({});

  const [draftNote, setDraftNote] = useState<Record<string, string>>({});
  const [draftScreenshots, setDraftScreenshots] = useState<Record<string, string | null>>({});
  const draftFilesRef = useRef<Record<string, File[]>>({});
  const [submissionDraftLoading, setSubmissionDraftLoading] = useState<Record<string, boolean>>({});
  const [submissionError, setSubmissionError] = useState<Record<string, string>>({});
  const [submissionFieldError, setSubmissionFieldError] = useState<Record<string, string>>({});
  const [submissionSuccess, setSubmissionSuccess] = useState<Record<string, string | null>>({});
  const [reviewError, setReviewError] = useState<Record<string, string>>({});

  const fetchMarketingTasks = useCallback(async () => {
    if (!user || (user.role !== 'marketing_lead' && user.role !== 'ceo' && user.role !== 'general_manager' && user.role !== 'finance_officer')) return;
    setMarketingTasksLoading(true);
    try {
      const response = await marketingApi.getMarketingTasks({ limit: 100 });
      console.log('[PaidCustomers] GET /marketing-tasks response:', response);
      if (response.success) {
        setMarketingTasks(response.data);
        response.data.forEach((t, i) => {
          console.log(`[PaidCustomers] Task ${i + 1}: id=${t.id}, title="${t.title}", submissions=${t.submissionsWithReviews?.submissions?.length || 0}`);
        });
        marketingNotificationIds = new Set(
          response.data.filter((t) => {
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
    } catch { /* silent */ }
    finally { setMarketingTasksLoading(false); }
  }, [user]);

  useEffect(() => { fetchMarketingTasks(); }, [fetchMarketingTasks]);

  const openDetail = async (task: MarketingTaskItem) => {
    console.log('[PaidCustomers] openDetail clicked:', {
      taskId: task.id,
      title: task.title,
      rawSubmissions: JSON.stringify(task.submissionsWithReviews?.submissions),
      rawSubmissionsCount: task.submissionsWithReviews?.submissions?.length || 0,
      wrappersCount: getSubmissionWrappers(task).length,
    });
    setSelectedTask(task);
    setDraftNote((prev) => ({ ...prev, [task.id]: '' }));
    setDraftScreenshots((prev) => ({ ...prev, [task.id]: null }));
    draftFilesRef.current = { ...draftFilesRef.current, [task.id]: [] };
    setExpandedSubmissionId(null);
    setEditingSubmissionId(null);
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
      viewedMarketingCards.add(task.id);
      publishBadgeCount(
        [...marketingNotificationIds].filter((id) => !viewedMarketingCards.has(id)).length
      );
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
    setDraftScreenshots((prev) => ({ ...prev, [taskId]: URL.createObjectURL(files[0]) }));
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
    let isSuccess = false;

    try {
      const formData = new FormData();
      formData.append('description', note);
      for (const file of files) formData.append('attachmentFiles', file);

      const response = isEditing
        ? await marketingApi.updateSubmission(editingSubmissionId!, formData)
        : await marketingApi.createSubmission(taskId, formData);

      if (response.success) {
        isSuccess = true;
        setSubmissionSuccess((prev) => ({ ...prev, [taskId]: 'Submission has been sent successfully.' }));
        await fetchMarketingTasks();
        if (selectedTask?.id === taskId) {
          const refreshed = await marketingApi.getMarketingTasks({ limit: 100 });
          if (refreshed.success) {
            const found = refreshed.data.find((t) => t.id === taskId);
            if (found) setSelectedTask(found);
          }
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
    } else if (isSuccess) {
      setEditingSubmissionId(null);
      const oldUrl = draftScreenshots[taskId] ?? null;
      if (oldUrl && oldUrl.startsWith('blob:')) URL.revokeObjectURL(oldUrl);
      setDraftScreenshots((prev) => ({ ...prev, [taskId]: null }));
      setDraftNote((prev) => ({ ...prev, [taskId]: '' }));
      draftFilesRef.current = { ...draftFilesRef.current, [taskId]: [] };
    }
  };

  const handleEditSubmission = (taskId: string, subId: string) => {
    if (!selectedTask) return;
    const wrapper = getSubmissionWrappers(selectedTask).find((w) => w.submission.id === subId);
    if (!wrapper) return;
    setEditingSubmissionId(subId);
    setDraftNote((prev) => ({ ...prev, [taskId]: wrapper.submission.description || '' }));
    setDraftScreenshots((prev) => ({ ...prev, [taskId]: wrapper.submission.attachment_urls?.[0] || null }));
    draftFilesRef.current = { ...draftFilesRef.current, [taskId]: [] };
    setExpandedSubmissionId(subId);
    setSubmissionError((prev) => ({ ...prev, [taskId]: '' }));
  };

  const handleReviewSubmission = async (taskId: string, subId: string, outcome: string) => {
    const note = reviewDraft[taskId] ?? '';
    setReviewError((prev) => ({ ...prev, [taskId]: '' }));
    let errorMsg: string | null = null;

    try {
      await marketingApi.createReview(subId, {
        description: note.trim() || `Review: ${outcome}`,
        review_outcome: outcome,
      });
    } catch (err: unknown) {
      errorMsg = (err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined) || 'Unable to submit review.';
    }

    if (errorMsg) {
      setReviewError((prev) => ({ ...prev, [taskId]: errorMsg! }));
    } else {
      setReviewDraft((prev) => ({ ...prev, [taskId]: '' }));
      await fetchMarketingTasks();
      if (selectedTask?.id === taskId) {
        const refreshed = await marketingApi.getMarketingTasks({ limit: 100 });
        if (refreshed.success) {
          const found = refreshed.data.find((t) => t.id === taskId);
          if (found) setSelectedTask(found);
        }
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
      <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">Access denied.</p>
      </div>
    );
  }

  const canReview = user?.role === 'ceo' || user?.role === 'general_manager' || user?.role === 'finance_officer';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-col lg:flex-row">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Paid Customers</h2>
          <p className="text-gray-600 mt-1">
            Marketing tasks with one or more submissions. Click to open full detail.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm min-w-[220px]">
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

      {marketingTasksLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : marketingTasks.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">No paid customer records yet.</p>
          <p className="text-sm text-gray-400 mt-1">Marketing tasks will appear here once they are created.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {marketingTasks.map((task) => {
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
                className={`border rounded-xl p-5 bg-white shadow-sm transition-all hover:shadow-md ${
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
                <section className="rounded-xl border border-gray-200 bg-white p-4">
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

                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-3">Customer Details</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-700"><User className="w-4 h-4 text-gray-400" /><span className="font-medium">{selectedTask.customer_name}</span></div>
                    <div className="flex items-center gap-2 text-gray-700"><Phone className="w-4 h-4 text-gray-400" /><span>{selectedTask.customer_phone}</span></div>
                    {selectedTask.customer_email && <div className="flex items-center gap-2 text-gray-700"><Mail className="w-4 h-4 text-gray-400" /><span>{selectedTask.customer_email}</span></div>}
                    <div className="flex items-center gap-2 text-gray-700 sm:col-span-2"><MapPin className="w-4 h-4 text-gray-400" /><span>{selectedTask.customer_address}</span></div>
                  </div>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Description</h5>
                  <p className="mt-2 text-sm text-gray-700">{selectedTask.description}</p>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Service Description</h5>
                  <p className="mt-2 text-sm text-gray-700">{selectedTask.service_description}</p>
                </section>

                {selectedTask.notes && (
                  <section className="rounded-xl border border-gray-200 bg-white p-4">
                    <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Notes</h5>
                    <p className="mt-2 text-sm text-gray-700">{selectedTask.notes}</p>
                  </section>
                )}

                {selectedTask.attachment_urls && selectedTask.attachment_urls.length > 0 && (
                  <section className="rounded-xl border border-gray-200 bg-white p-4">
                    <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-3 flex items-center gap-2">
                      <Paperclip className="w-4 h-4" />Task Attachments
                    </h5>
                    <AttachmentViewer attachments={selectedTask.attachment_urls} />
                  </section>
                )}

                <section className="rounded-xl border border-gray-200 bg-white p-4">
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
                        const isMarketingOwner = user?.role === 'marketing_lead' && selectedTask.marketing_user_id === user.id;
                        const canEditSubmission = latestEditable && taskActive && !taskRejected && isMarketingOwner;
                        const latestEditableId = canEditSubmission ? latestEditable!.submission?.id : null;
                        const isEditingThis = editingSubmissionId !== null;

                        return wrappers.map((wrapper, idx) => {
                          const sub = wrapper.submission;
                          const subHasNotification = wrapper.hasNotification || (sub.reviews || []).some((r) => r.hasNotification);
                          const isSubExpanded = expandedSubmissionId === sub.id;
                          const isThisLatestEditable = sub.id === latestEditableId;
                          const isLatestSubmission = sub.id === latestSubmissionId;

                          return (
                            <div key={sub.id} className={`border rounded-lg overflow-hidden ${subHasNotification ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}`}>
                              <button type="button" onClick={() => setExpandedSubmissionId(isSubExpanded ? null : sub.id)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
                                <div className="flex items-center gap-3">
                                  {subHasNotification && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                                  <div>
                                    <span className="font-medium text-gray-800">Submission {idx + 1}</span>
                                    <span className="ml-2 text-xs text-gray-500">{new Date(sub.created_at).toLocaleString()}</span>
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
                                          return (
                                            <div key={review.id} className={`border rounded-lg overflow-hidden ${review.hasNotification ? 'border-blue-400 ring-1 ring-blue-100' : 'border-gray-200'}`}>
                                              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50">
                                                {review.hasNotification && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${entryColor}`}>
                                                  <ReviewIcon className="w-3 h-3" />{statusLabel}
                                                </span>
                                                <span className="text-xs text-gray-500">{new Date(review.created_at).toLocaleString()}</span>
                                                <span className="text-xs text-gray-400">by {review.reviewer_user?.full_name || `User ${review.reviewer_user_id.slice(0, 8)}`}</span>
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
                                      <h6 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Review &amp; Decision</h6>
                                      <textarea rows={2} value={reviewDraft[selectedTask.id] ?? ''}
                                        onChange={(e) => setReviewDraft((prev) => ({ ...prev, [selectedTask.id]: e.target.value }))}
                                        placeholder="Your feedback or reason..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm mb-2" />
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
                                          <Send className="w-3.5 h-3.5" />Feedback
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

                {user?.role === 'marketing_lead' && selectedTask.marketing_user_id === user.id && selectedTask.status !== 'rejected' && selectedTask.task_state === 'active' && (
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
                              ? `${draftFilesRef.current[selectedTask.id].length} file(s) selected`
                              : draftScreenshots[selectedTask.id] ? 'Change Files' : 'Choose Files'}
                            <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.rar"
                              onChange={(e) => handleFilesChange(selectedTask.id, e.target.files)} className="hidden" disabled={submissionDraftLoading[selectedTask.id]} />
                          </label>
                          {(draftScreenshots[selectedTask.id] || (draftFilesRef.current[selectedTask.id]?.length ?? 0) > 0) && (
                            <button type="button" onClick={() => {
                              const oldUrl = draftScreenshots[selectedTask.id] ?? null;
                              if (oldUrl) URL.revokeObjectURL(oldUrl);
                              setDraftScreenshots((prev) => ({ ...prev, [selectedTask.id]: null }));
                              draftFilesRef.current = { ...draftFilesRef.current, [selectedTask.id]: [] };
                            }} className="text-sm text-red-600 hover:underline" disabled={submissionDraftLoading[selectedTask.id]}>Remove All</button>
                          )}
                        </div>
                        {draftScreenshots[selectedTask.id] && (
                          <img src={draftScreenshots[selectedTask.id]!} alt="preview" className="mt-2 w-full max-h-40 rounded-lg border object-contain" />
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
                <section className="rounded-xl border border-gray-200 bg-white p-4">
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
