import React, { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Clock, Landmark, Megaphone, ShieldCheck, Send } from 'lucide-react';
import { JOB_POSTINGS_STORAGE_KEY, jobPostingSeedTasks } from './JobPostings';
import { roleNamesByUserId, APPLICATION_STORAGE_KEY } from './designerTaskShared';
import { useAuth } from '../contexts/AuthContext';
import { DesignerTaskApplication, Task } from '../types';

type JobPostingTask = Task & {
  storyPoints?: number;
  telegramScreenshot?: string;
};

function loadJobPostings(): JobPostingTask[] {
  const savedTasks = localStorage.getItem(JOB_POSTINGS_STORAGE_KEY);
  if (!savedTasks) {
    localStorage.setItem(JOB_POSTINGS_STORAGE_KEY, JSON.stringify(jobPostingSeedTasks));
    return jobPostingSeedTasks;
  }

  const parsedTasks = JSON.parse(savedTasks) as JobPostingTask[];
  const mergedTasks = [
    ...parsedTasks.map((task) => {
      const seedTask = jobPostingSeedTasks.find((candidate) => candidate.id === task.id);
      return seedTask ? { ...seedTask, ...task } : task;
    }),
    ...jobPostingSeedTasks.filter((seedTask) => !parsedTasks.some((task) => task.id === seedTask.id)),
  ];

  localStorage.setItem(JOB_POSTINGS_STORAGE_KEY, JSON.stringify(mergedTasks));
  return mergedTasks;
}

function loadApplications(): DesignerTaskApplication[] {
  const saved = localStorage.getItem(APPLICATION_STORAGE_KEY);
  if (saved) {
    return JSON.parse(saved) as DesignerTaskApplication[];
  }
  return [];
}

function getStatusTone(status: string) {
  if (status === 'completed') return 'bg-green-100 text-green-700';
  if (status === 'in_progress') return 'bg-blue-100 text-blue-700';
  return 'bg-amber-100 text-amber-700';
}

export function DesignerOpenJobPostings() {
  const { user } = useAuth();
  const [postings] = useState<JobPostingTask[]>(() => loadJobPostings());
  const [applications, setApplications] = useState<DesignerTaskApplication[]>(loadApplications);
  const [applyingForTaskId, setApplyingForTaskId] = useState<string | null>(null);
  const [applyMessage, setApplyMessage] = useState('');

  const summary = useMemo(
    () => ({
      total: postings.length,
      pending: postings.filter((posting) => posting.status === 'pending').length,
      inProgress: postings.filter((posting) => posting.status === 'in_progress').length,
      completed: postings.filter((posting) => posting.status === 'completed').length,
    }),
    [postings]
  );

  const startApply = (taskId: string) => {
    setApplyingForTaskId(taskId);
    setApplyMessage('');
  };

  const cancelApply = () => {
    setApplyingForTaskId(null);
    setApplyMessage('');
  };

  const submitApplication = (posting: JobPostingTask) => {
    if (!user || !applyMessage.trim()) return;

    const newApplication: DesignerTaskApplication = {
      id: `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      taskId: posting.id,
      applicantId: user.id,
      applicantName: user.name ?? 'Unknown Designer',
      status: 'pending',
      message: applyMessage.trim(),
      appliedAt: new Date().toISOString(),
    };

    const updated = [...applications, newApplication];
    setApplications(updated);
    localStorage.setItem(APPLICATION_STORAGE_KEY, JSON.stringify(updated));
    setApplyingForTaskId(null);
    setApplyMessage('');
  };

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
              This view reads the posting data directly from the CEO, General Manager, and System Administrator workflow so designers can review the source details without leaving the page.
            </p>
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
          {postings.map((posting) => {
            const createdByLabel = roleNamesByUserId[posting.assignedBy] ?? `User ${posting.assignedBy}`;
            const hasApplied = user
              ? applications.some(
                  (app) => app.taskId === posting.id && app.applicantId === user.id
                )
              : false;
            const isApplying = applyingForTaskId === posting.id;

            return (
              <div
                key={posting.id}
                className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col"
              >
                {/* Row 1: role badge + status pill */}
                <div className="flex items-center justify-between gap-2 shrink-0">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 truncate max-w-[60%]">
                    <Landmark className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{createdByLabel}</span>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusTone(posting.status)}`}>
                    {posting.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Row 2: title */}
                <h4 className="mt-3 text-base font-semibold text-slate-900 line-clamp-2 shrink-0">{posting.title}</h4>

                {/* Row 3: description – no height restriction, grows naturally */}
                <p className="mt-1.5 text-sm text-slate-600 whitespace-pre-wrap">{posting.description}</p>

                {/* Row 4: badges */}
                <div className="mt-3 flex flex-wrap gap-2 text-xs shrink-0">
                  <span className="rounded-full bg-indigo-100 px-2.5 py-1 font-medium text-indigo-700">
                    Story Points: {posting.storyPoints ?? 0}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700 truncate max-w-[160px]">
                    Project ID: {posting.projectId}
                  </span>
                </div>

                {/* Row 5: dates */}
                <div className="mt-3 space-y-1 text-xs text-slate-500 shrink-0">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>Deadline: {posting.deadline ? new Date(posting.deadline).toLocaleDateString() : 'No deadline'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>Created: {new Date(posting.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Row 6: apply / applied / inline form */}
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
                          placeholder="Tell us why you’re interested…"
                          rows={3}
                          className="w-full resize-none rounded-lg border border-slate-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-400 outline-none"
                          autoFocus
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => submitApplication(posting)}
                            disabled={!applyMessage.trim()}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Send className="h-3.5 w-3.5" /> Submit
                          </button>
                          <button
                            onClick={cancelApply}
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