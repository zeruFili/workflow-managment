import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Calendar, CheckCircle2, Clock, Landmark, Megaphone, ShieldCheck, Send, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import designerApi, { DesignerTaskItem } from '../../api/designerApi';
import { designerTaskCache } from '../data/designerTaskCache';
import notificationApi from '../../api/notificationApi';

const API_POSTINGS_CACHE_KEY = 'designer-open-job-postings-api';

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

const viewedOpenJobPostingCards = new Set<string>();
const markedTaskNotificationIds = new Set<string>();
let hasResetForSessionOnce = false;

export function resetDesignerOpenJobPostingsHighlightState() {
  viewedOpenJobPostingCards.clear();
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
  const [postings, setPostings] = useState<DesignerTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyingForTaskId, setApplyingForTaskId] = useState<string | null>(null);
  const [applyMessage, setApplyMessage] = useState('');
  const appliedTaskIds = useRef<Set<string>>(new Set());
  const [applyError, setApplyError] = useState<string | null>(null);
  const [submittingApply, setSubmittingApply] = useState(false);

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

  const seenThisSession = useRef<Set<string>>(new Set());
  const observedElements = useRef<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const pendingTaskNotifIds = useRef<Map<string, string>>(new Map());
  const postingsRef = useRef(postings);
  useEffect(() => { postingsRef.current = postings; }, [postings]);

  useEffect(() => {
    if (user && !hasResetForSessionOnce) {
      resetDesignerOpenJobPostingsHighlightState();
      hasResetForSessionOnce = true;
    }
    if (!user) {
      hasResetForSessionOnce = false;
    }
  }, [user]);

  const fetchPostings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const tasks = await designerTaskCache.fetch({ isPublic: true, assignedTo: '__unassigned__', limit: 100 });
      setPostings(tasks);
      cachePostingsForBadge(tasks);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load job postings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPostings();
  }, [fetchPostings]);

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
              const posting = postingsRef.current.find((p) => p.id === id);
              const topNotif = posting?.taskNotification;
              const swrNotif = posting?.submissionsWithReviews?.taskNotification;
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
      if (seenThisSession.current.size === 0 && pendingTaskNotifIds.current.size === 0) return;

      const currentPostings = postingsRef.current;

      seenThisSession.current.forEach((id) => {
        const posting = currentPostings.find((p) => p.id === id);
        const hasRemainingNotif =
          posting?.hasNestedNotification ||
          posting?.taskNotification?.hasNotification ||
          posting?.submissionsWithReviews?.taskNotification?.hasNotification;
        if (!hasRemainingNotif) {
          viewedOpenJobPostingCards.add(id);
        }
      });
      seenThisSession.current.clear();
      observedElements.current.clear();

      const pending = new Map(pendingTaskNotifIds.current);
      pendingTaskNotifIds.current.clear();

      for (const [postingId, notifId] of pending) {
        if (markedTaskNotificationIds.has(notifId)) continue;
        markedTaskNotificationIds.add(notifId);

        notificationApi.markRead(notifId)
          .then(() => {
            setPostings((prev) =>
              prev.map((p) =>
                p.id === postingId
                  ? {
                      ...p,
                      taskNotification: null,
                      submissionsWithReviews: {
                        ...(p.submissionsWithReviews as any),
                        taskNotification: { hasNotification: false, notificationId: null },
                      },
                    }
                  : p
              )
            );
          })
          .catch(() => {
            markedTaskNotificationIds.delete(notifId);
          });
      }
    };
  }, []);

  const summary = useMemo(
    () => ({
      total: postings.length,
      pending: postings.filter((p) => p.status === 'pending' || !p.status).length,
      inProgress: postings.filter((p) => p.status === 'pending').length,
      completed: postings.filter((p) => p.status === 'approved').length,
    }),
    [postings]
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

  const submitApplication = async (taskId: string) => {
    if (!user || !applyMessage.trim()) return;
    setSubmittingApply(true);
    setApplyError(null);
    try {
      await designerApi.apply(taskId, { cover_note: applyMessage.trim() });
      appliedTaskIds.current.add(taskId);
      setApplyingForTaskId(null);
      setApplyMessage('');
    } catch (err: any) {
      if (err?.response?.status === 409) {
        appliedTaskIds.current.add(taskId);
        setApplyingForTaskId(null);
        setApplyMessage('');
      } else {
        setApplyError(err?.response?.data?.message || err?.message || 'Failed to submit application');
      }
    } finally {
      setSubmittingApply(false);
    }
  };

  const sortedPostings = [...postings].sort((a, b) => {
    const aHL = highlightedIds.has(a.id) ? 1 : 0;
    const bHL = highlightedIds.has(b.id) ? 1 : 0;
    if (bHL !== aHL) return bHL - aHL;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

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
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:min-w-[420px]">
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
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <ShieldCheck className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-slate-500">No job postings are available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 auto-rows-auto">
          {sortedPostings.map((posting) => {
            const assignedByLabel =
              posting.assigned_by_user?.full_name || `User ${posting.assigned_by_user_id}`;
            const hasApplied = appliedTaskIds.current.has(posting.id);
            const isApplying = applyingForTaskId === posting.id;
            const isHighlighted = highlightedIds.has(posting.id);

            return (
              <div
                key={posting.id}
                data-highlighted-id={isHighlighted ? posting.id : undefined}
                className={[
                  'w-full rounded-2xl border bg-white p-5 shadow-sm flex flex-col transition-all duration-300',
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

                {user && (
                  <div className="mt-3 shrink-0">
                    {hasApplied ? (
                      <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Applied
                      </span>
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
    </div>
  );
}

export default DesignerOpenJobPostings;
