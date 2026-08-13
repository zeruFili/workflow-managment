import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Calendar, CheckCircle2, Clock, Landmark, Megaphone, ShieldCheck, Send, AlertCircle, Loader2, Undo2, Image, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotificationCounts } from '../contexts/NotificationCountsContext';
import designerApi, { DesignerTaskItem } from '../../api/designerApi';
import { designerTaskCache } from '../data/designerTaskCache';
import { PaginationWithNumbers } from '../components/ui/PaginationWithNumbers';
import AttachmentViewer from '../components/AttachmentViewer';
import notificationApi from '../../api/notificationApi';

const API_POSTINGS_CACHE_KEY = 'designer-open-job-postings-api';
const VIEWED_CARDS_STORAGE_KEY = 'designer-open-job-postings-viewed-cards';
const PAGE_SIZE = 10;

function loadViewedCards(): Set<string> {
  try {
    const stored = localStorage.getItem(VIEWED_CARDS_STORAGE_KEY);
    return new Set(stored ? JSON.parse(stored) : []);
  } catch {
    return new Set<string>();
  }
}

function saveViewedCards(cards: Set<string>) {
  try {
    localStorage.setItem(VIEWED_CARDS_STORAGE_KEY, JSON.stringify([...cards]));
  } catch {
    // Ignore storage errors
  }
}

function cachePostingsForBadge(postings: DesignerTaskItem[]) {
  const minimal = postings.map((p) => ({ id: p.id, createdAt: p.created_at }));
  localStorage.setItem(API_POSTINGS_CACHE_KEY, JSON.stringify(minimal));
}

function getCachedPostings(): { id: string; createdAt: string }[] {
  try {
    const raw = localStorage.getItem(API_POSTINGS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const viewedOpenJobPostingCards = loadViewedCards();
const markedTaskNotificationIds = new Set<string>();
let hasResetForSessionOnce = false;

export function resetDesignerOpenJobPostingsHighlightState() {
  viewedOpenJobPostingCards.clear();
  saveViewedCards(viewedOpenJobPostingCards);
  markedTaskNotificationIds.clear();
}

export function getUnseenOpenJobPostingHighlightedIds() {
  const postings = getCachedPostings();
  return new Set(
    postings.filter((p) => !viewedOpenJobPostingCards.has(p.id)).map((p) => p.id)
  );
}

export function getUnseenOpenJobPostingsCount() {
  return getUnseenOpenJobPostingHighlightedIds().size;
}

function publishOpenJobPostingsBadgeCount(count: number) {
  window.dispatchEvent(
    new CustomEvent('open-job-postings-notifications-updated', { detail: count })
  );
}

function getStatusTone(status: string | null) {
  if (status === 'approved') return 'bg-green-100 text-green-700';
  if (status === 'rejected') return 'bg-red-100 text-red-700';
  return 'bg-amber-100 text-amber-700';
}

function getStatusLabel(status: string | null) {
  if (status === 'approved') return 'completed';
  if (status === 'rejected') return 'rejected';
  return 'pending';
}

export function DesignerOpenJobPostings() {
  const { user } = useAuth();
  const { decrement } = useNotificationCounts();
  const [postings, setPostings] = useState<DesignerTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiPage, setApiPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [applyingForTaskId, setApplyingForTaskId] = useState<string | null>(null);
  const [applyMessage, setApplyMessage] = useState('');
  const appliedTaskIds = useRef<Set<string>>(new Set());
  const [applyError, setApplyError] = useState<string | null>(null);
  const [submittingApply, setSubmittingApply] = useState(false);
  const [withdrawingTaskId, setWithdrawingTaskId] = useState<string | null>(null);
  const [viewImagesTaskId, setViewImagesTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState('');

  const highlightedIds = (() => {
    if (postings.length === 0) return new Set<string>();
    return new Set(
      postings
        .filter((p) => (p.taskNotification?.hasNotification || p.hasNestedNotification) && !viewedOpenJobPostingCards.has(p.id))
        .map((p) => p.id)
    );
  })();

  useEffect(() => {
    publishOpenJobPostingsBadgeCount(highlightedIds.size);
  }, [highlightedIds]);

  const observedElements = useRef<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const seenThisSession = useRef<Set<string>>(new Set());
  const postingsRef = useRef(postings);
  useEffect(() => { postingsRef.current = postings; }, [postings]);

  const markPostingNotificationRead = useCallback(
    (postingId: string, notifId: string) => {
      seenThisSession.current.add(postingId);
      if (markedTaskNotificationIds.has(notifId)) return;
      markedTaskNotificationIds.add(notifId);

      notificationApi
        .markRead(notifId)
        .then(() => {
          decrement('designerJobPostings');
        })
        .catch(() => {
          markedTaskNotificationIds.delete(notifId);
        });
    },
    [decrement]
  );

  useEffect(() => {
    if (user && !hasResetForSessionOnce) {
      resetDesignerOpenJobPostingsHighlightState();
      hasResetForSessionOnce = true;
    }
    if (!user) {
      hasResetForSessionOnce = false;
    }
  }, [user]);

  const fetchPostings = useCallback(async (page: number) => {
    try {
      setLoading(true);
      setError(null);
      const result = await designerTaskCache.fetch({ isPublic: true, assignedTo: '__unassigned__', page, limit: PAGE_SIZE });
      const tasks = result.data;
      setTotalItems(result.total);
      const processedTasks = tasks.map((t) =>
        viewedOpenJobPostingCards.has(t.id) && (t.taskNotification?.hasNotification || t.hasNestedNotification)
          ? { ...t, taskNotification: null, hasNestedNotification: false }
          : t
      );
      setPostings(processedTasks);
      cachePostingsForBadge(tasks);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load job postings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPostings(apiPage);
  }, [fetchPostings, apiPage]);

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
              const posting = postingsRef.current.find((p) => p.id === id);
              const topNotif = posting?.taskNotification;
              const swrNotif = posting?.submissionsWithReviews?.taskNotification;
              const notificationId =
                (topNotif?.hasNotification && topNotif.notificationId) ||
                (swrNotif?.hasNotification && swrNotif.notificationId) ||
                null;
              if (notificationId) {
                markPostingNotificationRead(id, notificationId);
              } else {
                seenThisSession.current.add(id);
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
      if (el && !observedElements.current.has(id)) {
        observer.observe(el);
      }
    });

    return () => {
      observer.disconnect();
      observedElements.current.clear();
    };
  }, [highlightedIds]);

  useEffect(() => {
    return () => {
      if (seenThisSession.current.size === 0) return;
      seenThisSession.current.forEach((id) => viewedOpenJobPostingCards.add(id));
      seenThisSession.current.clear();
      saveViewedCards(viewedOpenJobPostingCards);
    };
  }, []);

  const summary = useMemo(
    () => ({
      total: totalItems,
      pending: postings.filter((p) => p.status === 'pending' || !p.status).length,
      inProgress: postings.filter((p) => p.status === 'pending').length,
      completed: postings.filter((p) => p.status === 'approved').length,
    }),
    [postings, totalItems]
  );

  const startApply = (taskId: string) => {
    setApplyingForTaskId(taskId);
    setApplyMessage('');
    setApplyError(null);
  };

  const cancelApply = () => {
    setApplyingForTaskId(null);
    setApplyMessage('');
    setApplyError(null);
  };

  const startEdit = (taskId: string, currentMessage: string) => {
    setEditingTaskId(taskId);
    setEditMessage(currentMessage);
    setApplyError(null);
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setEditMessage('');
    setApplyError(null);
  };

  const submitEdit = async (taskId: string) => {
    if (!user || !editMessage.trim()) return;
    setSubmittingApply(true);
    setApplyError(null);
    try {
      await designerApi.updateApplication(taskId, { cover_note: editMessage.trim() });
      setPostings((prev) =>
        prev.map((p) => (p.id === taskId ? { ...p, coverNote: editMessage.trim() } : p))
      );
      setEditingTaskId(null);
      setEditMessage('');
    } catch (err: any) {
      setApplyError(err?.response?.data?.message || err?.message || 'Failed to update application');
    } finally {
      setSubmittingApply(false);
    }
  };

  const submitApplication = async (taskId: string) => {
    if (!user || !applyMessage.trim()) return;
    setSubmittingApply(true);
    setApplyError(null);
    try {
      await designerApi.apply(taskId, { cover_note: applyMessage.trim() });
      appliedTaskIds.current.add(taskId);
      setPostings((prev) => {
        const idx = prev.findIndex((p) => p.id === taskId);
        if (idx === -1) return prev;
        const updated = { ...prev[idx], applied: true, coverNote: applyMessage.trim() };
        const without = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
        return [updated, ...without];
      });
      setApplyingForTaskId(null);
      setApplyMessage('');
    } catch (err: any) {
      if (err?.response?.status === 409) {
        appliedTaskIds.current.add(taskId);
        setPostings((prev) => {
          const idx = prev.findIndex((p) => p.id === taskId);
          if (idx === -1) return prev;
          const withApplied = [...prev];
          withApplied[idx] = { ...withApplied[idx], applied: true };
          return withApplied;
        });
        setApplyingForTaskId(null);
        setApplyMessage('');
      } else {
        setApplyError(err?.response?.data?.message || err?.message || 'Failed to submit application');
      }
    } finally {
      setSubmittingApply(false);
    }
  };

  const withdrawApplication = async (taskId: string) => {
    console.log('[DesignerOpenJobPostings.withdrawApplication] ========== WITHDRAW START ==========');
    console.log('[DesignerOpenJobPostings.withdrawApplication] Task ID:', taskId);
    console.log('[DesignerOpenJobPostings.withdrawApplication] User:', user ? { id: user.id, role: user.role } : 'NONE');
    setWithdrawingTaskId(taskId);
    try {
      const response = await designerApi.withdrawApplication(taskId);
      console.log('[DesignerOpenJobPostings.withdrawApplication] API response:', response);
      if (response.success) {
        console.log('[DesignerOpenJobPostings.withdrawApplication] Withdrawal successful, updating local state');
        appliedTaskIds.current.delete(taskId);
        setPostings((prev) => {
          const idx = prev.findIndex((p) => p.id === taskId);
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = { ...updated[idx], applied: false };
          return updated;
        });
      } else {
        console.log('[DesignerOpenJobPostings.withdrawApplication] API returned success=false:', response.message);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || 'Unknown error';
      console.error('[DesignerOpenJobPostings.withdrawApplication] FAILED - status:', status, 'message:', msg);
      console.error('[DesignerOpenJobPostings.withdrawApplication] Full error:', err);
      setApplyError(msg);
    } finally {
      console.log('[DesignerOpenJobPostings.withdrawApplication] ========== WITHDRAW END ==========');
      setWithdrawingTaskId(null);
    }
  };

  const displayPostings = postings;

  const totalDisplayPages = Math.ceil(totalItems / PAGE_SIZE);
  const handlePageChange = (page: number) => {
    designerTaskCache.invalidate({ isPublic: true, assignedTo: '__unassigned__', page: apiPage, limit: PAGE_SIZE });
    setApiPage(page);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
        <p className="mt-3 text-red-700 font-medium">Failed to load job postings</p>
        <p className="mt-1 text-sm text-red-600">{error}</p>
        <button
          onClick={fetchPostings}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card-safe overflow-hidden min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              <Megaphone className="h-4 w-4" />
              Open Job Postings
            </div>
            <h3 className="mt-3 text-2xl font-bold text-slate-900">Job postings sent by leadership</h3>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Browse open designer tasks posted by the CEO and General Manager. Apply to tasks that match your skills.
            </p>
            {highlightedIds.size > 0 && (
              <p className="text-sm text-blue-600 mt-2 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-semibold">
                  {highlightedIds.size}
                </span>
                new {highlightedIds.size === 1 ? 'posting' : 'postings'} since your last visit
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{summary.total}</p>
            </div>
            <div className="rounded-xl bg-amber-50 px-3 py-3 text-center">
              <p className="text-xs uppercase tracking-wide text-amber-600">Pending</p>
              <p className="mt-1 text-lg font-semibold text-amber-700">{summary.pending}</p>
            </div>
            <div className="rounded-xl bg-blue-50 px-3 py-3 text-center">
              <p className="text-xs uppercase tracking-wide text-blue-600">Active</p>
              <p className="mt-1 text-lg font-semibold text-blue-700">{summary.inProgress}</p>
            </div>
            <div className="rounded-xl bg-green-50 px-3 py-3 text-center">
              <p className="text-xs uppercase tracking-wide text-green-600">Ready</p>
              <p className="mt-1 text-lg font-semibold text-green-700">{summary.completed}</p>
            </div>
          </div>
        </div>
      </div>

      {postings.length === 0 ? (
        <div className="card-safe overflow-hidden min-w-0 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <ShieldCheck className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-slate-500">No job postings are available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-auto">
          {displayPostings.map((posting) => {
            const assignedByLabel =
              posting.assigned_by_user?.full_name || `User ${posting.assigned_by_user_id}`;
            const hasApplied = posting.applied || appliedTaskIds.current.has(posting.id);
            const isApplying = applyingForTaskId === posting.id;
            const isHighlighted = highlightedIds.has(posting.id);

            return (
              <div
                key={posting.id}
                data-highlighted-id={isHighlighted ? posting.id : undefined}
                className={[
                  'card-safe overflow-hidden min-w-0 w-full rounded-2xl border bg-white p-5 shadow-sm flex flex-col transition-all duration-300',
                  isHighlighted
                    ? 'border-2 border-blue-400 ring-4 ring-blue-100 shadow-blue-100'
                    : 'border-slate-200',
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

                <div className="flex items-center justify-between gap-2 shrink-0">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 truncate max-w-[60%]">
                    <Landmark className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{assignedByLabel}</span>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusTone(posting.status)}`}>
                    {getStatusLabel(posting.status)}
                  </span>
                </div>

                <h4 className="mt-3 text-base font-semibold text-slate-900 line-clamp-2 shrink-0">{posting.title}</h4>

                <p className="mt-1.5 text-sm text-slate-600 whitespace-pre-wrap">{posting.description}</p>

                <div className="mt-3 flex flex-wrap gap-2 text-xs shrink-0">
                  <span className="rounded-full bg-indigo-100 px-2.5 py-1 font-medium text-indigo-700">
                    Story Points: {posting.story_point ?? 0}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700 truncate max-w-[160px]">
                    Task ID: {posting.id}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-xs text-slate-500 shrink-0">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>Deadline: {posting.due_date ? new Date(posting.due_date).toLocaleDateString() : 'No deadline'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>Created: {new Date(posting.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {posting.attachment_urls && posting.attachment_urls.length > 0 && (
                  <div className="mt-2 shrink-0">
                    <button
                      onClick={() => setViewImagesTaskId(posting.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <Image className="h-3.5 w-3.5" />
                      View Images ({posting.attachment_urls.length})
                    </button>
                    {viewImagesTaskId === posting.id && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                        <div className="card-safe overflow-hidden min-w-0 bg-white rounded-2xl shadow-2xl w-full max-w-2xl aspect-square max-h-[calc(100vh-4rem)] flex flex-col p-6">
                          <div className="shrink-0 flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Attachments</h3>
                            <button
                              onClick={() => setViewImagesTaskId(null)}
                              className="p-1.5 rounded-lg hover:bg-gray-100"
                            >
                              <X className="w-5 h-5 text-gray-500" />
                            </button>
                          </div>
                          <div className="flex-1 overflow-y-auto min-h-0">
                            <AttachmentViewer attachments={posting.attachment_urls} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {user && (
                  <div className="mt-3 shrink-0">
                    {hasApplied ? (
                      <div>
                        {editingTaskId === posting.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editMessage}
                              onChange={(e) => setEditMessage(e.target.value)}
                              placeholder="Update your application message..."
                              rows={3}
                              className="w-full resize-none rounded-lg border border-slate-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-400 outline-none"
                              autoFocus
                            />
                            {applyError && (
                              <p className="text-xs text-red-600">{applyError}</p>
                            )}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => submitEdit(posting.id)}
                                disabled={!editMessage.trim() || submittingApply}
                                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Send className="h-3.5 w-3.5" /> {submittingApply ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={cancelEdit}
                                disabled={submittingApply}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Applied
                              </span>
                              <button
                                onClick={() => startEdit(posting.id, posting.coverNote || '')}
                                className="inline-flex items-center gap-1 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                <span className="h-3.5 w-3.5 flex items-center justify-center">&#9998;</span>
                                Edit
                              </button>
                              <button
                                onClick={() => withdrawApplication(posting.id)}
                                disabled={withdrawingTaskId === posting.id}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Undo2 className="h-3.5 w-3.5" />
                                {withdrawingTaskId === posting.id ? 'Withdrawing...' : 'Withdraw'}
                              </button>
                            </div>
                            {posting.coverNote && (
                              <p className="text-xs text-slate-500 italic">"{posting.coverNote}"</p>
                            )}
                            {applyError && (
                              <p className="text-xs text-red-600 mt-1">{applyError}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : isApplying ? (
                      <div className="space-y-2">
                        <textarea
                          value={applyMessage}
                          onChange={(e) => setApplyMessage(e.target.value)}
                          placeholder="Tell us why you're interested..."
                          rows={3}
                          className="w-full resize-none rounded-lg border border-slate-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-400 outline-none"
                          autoFocus
                        />
                        {applyError && (
                          <p className="text-xs text-red-600">{applyError}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => submitApplication(posting.id)}
                            disabled={!applyMessage.trim() || submittingApply}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Send className="h-3.5 w-3.5" /> {submittingApply ? 'Submitting...' : 'Submit'}
                          </button>
                          <button
                            onClick={cancelApply}
                            disabled={submittingApply}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => startApply(posting.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <PaginationWithNumbers
        currentPage={apiPage}
        totalPages={totalDisplayPages}
        totalItems={totalItems}
        onPageChange={handlePageChange}
      />
    </div>
  );
}

export default DesignerOpenJobPostings;
