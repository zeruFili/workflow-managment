import React, { useMemo, useState } from 'react';
import { Calendar, Clock, Image, Landmark, LayoutGrid, Megaphone, ShieldCheck, XCircle } from 'lucide-react';
import { mockProjects } from '../data/mockData';
import { Task } from '../types';
import { JOB_POSTINGS_STORAGE_KEY, jobPostingSeedTasks } from './JobPostings';
import { roleNamesByUserId } from './designerTaskShared';

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

function getStatusTone(status: string) {
  if (status === 'completed') return 'bg-green-100 text-green-700';
  if (status === 'in_progress') return 'bg-blue-100 text-blue-700';
  return 'bg-amber-100 text-amber-700';
}

export function DesignerOpenJobPostings() {
  const [postings] = useState<JobPostingTask[]>(() => loadJobPostings());
  const [selectedPosting, setSelectedPosting] = useState<JobPostingTask | null>(null);

  const summary = useMemo(
    () => ({
      total: postings.length,
      pending: postings.filter((posting) => posting.status === 'pending').length,
      inProgress: postings.filter((posting) => posting.status === 'in_progress').length,
      completed: postings.filter((posting) => posting.status === 'completed').length,
    }),
    [postings]
  );

  const openPosting = selectedPosting ?? postings[0] ?? null;
  const projectLabel = openPosting ? mockProjects.find((project) => project.id === openPosting.projectId)?.name : null;

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
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-4 md:grid-cols-2">
            {postings.map((posting) => {
              const isSelected = selectedPosting?.id === posting.id;
              const createdByLabel = roleNamesByUserId[posting.assignedBy] ?? `User ${posting.assignedBy}`;

              return (
                <button
                  key={posting.id}
                  type="button"
                  onClick={() => setSelectedPosting(posting)}
                  className={`rounded-2xl border p-5 text-left shadow-sm transition-colors ${
                    isSelected ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        <Landmark className="h-3.5 w-3.5" />
                        {createdByLabel}
                      </div>
                      <h4 className="mt-3 text-lg font-semibold text-slate-900">{posting.title}</h4>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusTone(posting.status)}`}>
                      {posting.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-slate-600 line-clamp-3">{posting.description}</p>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-indigo-100 px-2.5 py-1 font-medium text-indigo-700">
                      Story Points: {posting.storyPoints ?? 0}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                      Project ID: {posting.projectId}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Deadline: {posting.deadline ? new Date(posting.deadline).toLocaleDateString() : 'No deadline'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Created: {new Date(posting.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {openPosting ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      <LayoutGrid className="h-4 w-4" />
                      Posting Detail
                    </div>
                    <h4 className="mt-3 text-xl font-bold text-slate-900">{openPosting.title}</h4>
                    <p className="mt-1 text-sm text-slate-500">{projectLabel ?? openPosting.projectId}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPosting(null)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Clear selected posting"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Source</p>
                  <p className="mt-1 text-sm text-slate-800">{roleNamesByUserId[openPosting.assignedBy] ?? `User ${openPosting.assignedBy}`}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{openPosting.description}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Instructions</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {openPosting.instruction || 'No extra instruction was attached to this posting.'}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-blue-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Story Points</p>
                    <p className="mt-1 text-lg font-bold text-blue-700">{openPosting.storyPoints ?? 0}</p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Status</p>
                    <p className="mt-1 text-lg font-bold text-amber-700">{openPosting.status.replace('_', ' ')}</p>
                  </div>
                </div>

                {openPosting.telegramScreenshot ? (
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Image className="h-4 w-4 text-slate-500" />
                      Telegram Screenshot
                    </div>
                    <img
                      src={openPosting.telegramScreenshot}
                      alt="telegram screenshot"
                      className="mt-3 w-full rounded-xl border object-cover"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No Telegram screenshot was attached to this posting.</p>
                )}
              </div>
            ) : (
              <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center">
                <div>
                  <Megaphone className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="mt-4 text-sm font-medium text-slate-700">Select a posting to inspect the leadership details.</p>
                  <p className="mt-1 text-xs text-slate-500">The newest posting is shown automatically when none is selected.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DesignerOpenJobPostings;
