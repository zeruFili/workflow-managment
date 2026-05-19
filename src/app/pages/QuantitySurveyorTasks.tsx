import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Badge } from '../components/ui/badge';
import {
  createQuantityReviewTaskId,
  createTaskAssignedNotification,
  loadQuantityReviewEvaluations,
  loadQuantityReviewNotifications,
  loadQuantityReviewTasks,
  QuantityReviewTask,
  saveQuantityReviewNotifications,
  saveQuantityReviewTasks,
} from '../data/quantitySurveyorWorkflow';
import { Plus, Send } from 'lucide-react';

type ForwardFormState = {
  jobId: string;
  designWorkReference: string;
  designerName: string;
  description: string;
  telegramScreenshot: string;
  budgetExpectationReference: string;
};

const emptyForm: ForwardFormState = {
  jobId: '',
  designWorkReference: '',
  designerName: '',
  description: '',
  telegramScreenshot: '',
  budgetExpectationReference: '',
};

export function QuantitySurveyorTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<QuantityReviewTask[]>(() => loadQuantityReviewTasks());
  const [form, setForm] = useState<ForwardFormState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) {
    return null;
  }

  const evaluations = loadQuantityReviewEvaluations();
  const pendingLeadershipReview = evaluations.filter((evaluation) => evaluation.decisionStatus === 'pending').length;

  const persistTasks = (nextTasks: QuantityReviewTask[]) => {
    setTasks(nextTasks);
    saveQuantityReviewTasks(nextTasks);
  };

  const handleForwardTask = (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    const nextTask: QuantityReviewTask = {
      id: createQuantityReviewTaskId(),
      jobId: form.jobId.trim(),
      designWorkReference: form.designWorkReference.trim(),
      telegramScreenshot: form.telegramScreenshot.trim(),
      description: form.description.trim(),
      designerName: form.designerName.trim(),
      submissionDate: new Date().toISOString(),
      budgetExpectationReference: form.budgetExpectationReference.trim() || undefined,
      submissionHistory: [
        'Designer submission received in Telegram.',
        `${user.role === 'ceo' ? 'CEO' : 'General Manager'} forwarded the submission for quantity review.`,
      ],
      status: 'pending_review',
      createdBy: user.id,
      assignedTo: '11',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const nextTasks = [nextTask, ...tasks];
    persistTasks(nextTasks);

    const notifications = loadQuantityReviewNotifications();
    saveQuantityReviewNotifications([createTaskAssignedNotification(nextTask), ...notifications]);

    setForm(emptyForm);
    setIsSubmitting(false);
  };

  const forwardedByCurrentUser = tasks.filter((task) => task.createdBy === user.id).length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Quantity Surveyor Assignment Desk</h2>
            <p className="mt-1 text-sm text-slate-600">
              Forward design submissions from Telegram to Quantity Surveyor with screenshot evidence and job details.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Forwarded by you: {forwardedByCurrentUser}</Badge>
            <Badge className="bg-amber-100 text-amber-700 border-amber-200">Pending leadership review: {pendingLeadershipReview}</Badge>
          </div>
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={handleForwardTask} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900">
            <Plus className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Forward design task to Quantity Surveyor</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Job Reference</label>
              <input
                required
                value={form.jobId}
                onChange={(event) => setForm((current) => ({ ...current, jobId: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="JOB-2090"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Design Work Reference</label>
              <input
                required
                value={form.designWorkReference}
                onChange={(event) => setForm((current) => ({ ...current, designWorkReference: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="DW-2090-A"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Designer Name</label>
              <input
                required
                value={form.designerName}
                onChange={(event) => setForm((current) => ({ ...current, designerName: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Designer full name"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Budget Expectation Reference</label>
              <input
                value={form.budgetExpectationReference}
                onChange={(event) => setForm((current) => ({ ...current, budgetExpectationReference: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Optional budget reference"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Telegram Screenshot URL</label>
            <input
              required
              type="url"
              value={form.telegramScreenshot}
              onChange={(event) => setForm((current) => ({ ...current, telegramScreenshot: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Description Text</label>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Describe the forwarded design submission and what should be reviewed."
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
          >
            <Send className="h-4 w-4" />
            Forward to Quantity Surveyor
          </button>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Forwarded design queue</h3>
          <p className="mt-1 text-sm text-slate-600">Latest Telegram design submissions sent for quantity review.</p>

          <div className="mt-4 space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{task.jobId}</p>
                    <p className="text-sm text-slate-500">{task.designWorkReference}</p>
                  </div>
                  <Badge
                    className={task.status === 'pending_review' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200'}
                  >
                    {task.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600">{task.description}</p>
                <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">Designer: {task.designerName}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default QuantitySurveyorTasks;
