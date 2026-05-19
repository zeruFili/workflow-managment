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
import { Plus, Send, X, Image } from 'lucide-react';

type ForwardFormState = {
  jobId: string;
  designWorkReference: string;
  designerName: string;
  description: string;
  telegramScreenshot: string; // will store data URL
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
  const [showForm, setShowForm] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null); // separate preview URL

  if (!user) {
    return null;
  }

  const evaluations = loadQuantityReviewEvaluations();
  const pendingLeadershipReview = evaluations.filter((evaluation) => evaluation.decisionStatus === 'pending').length;

  const persistTasks = (nextTasks: QuantityReviewTask[]) => {
    setTasks(nextTasks);
    saveQuantityReviewTasks(nextTasks);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setForm((c) => ({ ...c, telegramScreenshot: dataUrl }));
      setImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleForwardTask = (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    const nextTask: QuantityReviewTask = {
      id: createQuantityReviewTaskId(),
      jobId: form.jobId.trim(),
      designWorkReference: form.designWorkReference.trim(),
      telegramScreenshot: form.telegramScreenshot.trim(), // data URL
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
    setImagePreview(null);
    setIsSubmitting(false);
    setShowForm(false);
  };

  const forwardedByCurrentUser = tasks.filter((task) => task.createdBy === user.id).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Quantity Surveyor Assignment Desk</h2>
          <p className="mt-1 text-sm text-slate-600">
            Forward design submissions from Telegram to Quantity Surveyor with screenshot evidence and job details.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline">Forwarded by you: {forwardedByCurrentUser}</Badge>
          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
            Pending leadership review: {pendingLeadershipReview}
          </Badge>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Forward Design Task
          </button>
        </div>
      </div>

      {/* Queue */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
                  className={
                    task.status === 'pending_review'
                      ? 'bg-amber-100 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }
                >
                  {task.status.replace('_', ' ')}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-slate-600">{task.description}</p>
              <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
                Designer: {task.designerName}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Forward Design Task to Quantity Surveyor</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Fill in the details of the Telegram design submission.
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleForwardTask} className="px-6 py-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Job Reference</label>
                  <input
                    required
                    value={form.jobId}
                    onChange={(e) => setForm((c) => ({ ...c, jobId: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="JOB-2090"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Design Work Reference</label>
                  <input
                    required
                    value={form.designWorkReference}
                    onChange={(e) => setForm((c) => ({ ...c, designWorkReference: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="DW-2090-A"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Designer Name</label>
                  <input
                    required
                    value={form.designerName}
                    onChange={(e) => setForm((c) => ({ ...c, designerName: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="Designer full name"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Budget Expectation Reference</label>
                  <input
                    value={form.budgetExpectationReference}
                    onChange={(e) => setForm((c) => ({ ...c, budgetExpectationReference: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="Optional budget reference"
                  />
                </div>
              </div>

              {/* Updated Image Upload */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Telegram Screenshot</label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-700">
                    <Image className="w-4 h-4" />
                    Choose Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      required={!form.telegramScreenshot}
                    />
                  </label>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setForm((c) => ({ ...c, telegramScreenshot: '' }));
                        setImagePreview(null);
                      }}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {imagePreview && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-1">Preview:</p>
                    <img
                      src={imagePreview}
                      alt="Telegram screenshot preview"
                      className="max-w-full h-auto max-h-48 rounded-lg border object-contain"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Description Text</label>
                <textarea
                  required
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="Describe the forwarded design submission and what should be reviewed."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !form.telegramScreenshot}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  <Send className="h-4 w-4" />
                  Forward to Quantity Surveyor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuantitySurveyorTasks;