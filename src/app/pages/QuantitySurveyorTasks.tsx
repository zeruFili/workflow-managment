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
  loadQuantityReviewEvaluations as _loadQuantityReviewEvaluations,
  saveQuantityReviewEvaluations,
  createQuantityReviewEvaluationId,
  createDecisionMadeNotification,
} from '../data/quantitySurveyorWorkflow';
import { Plus, Send, X, Image } from 'lucide-react';

type ForwardFormState = {
  jobId: string;
  designWorkReference: string;
  designerName: string;
  description: string;
  telegramScreenshot: string; // will store data URL
  telegramScreenshotDescription: string;
  budgetExpectationReference: string;
};

const emptyForm: ForwardFormState = {
  jobId: '',
  designWorkReference: '',
  designerName: '',
  description: '',
  telegramScreenshot: '',
  telegramScreenshotDescription: '',
  budgetExpectationReference: '',
};

export function QuantitySurveyorTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<QuantityReviewTask[]>(() => loadQuantityReviewTasks());
  const [evaluations, setEvaluations] = useState(() => _loadQuantityReviewEvaluations());
  const [notifications, setNotifications] = useState(() => loadQuantityReviewNotifications());
  const [form, setForm] = useState<ForwardFormState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null); // separate preview URL

  if (!user) {
    return null;
  }

  const pendingLeadershipReview = evaluations.filter((evaluation) => evaluation.decisionStatus === 'pending').length;

  const persistTasks = (nextTasks: QuantityReviewTask[]) => {
    setTasks(nextTasks);
    saveQuantityReviewTasks(nextTasks);
  };

  const persistEvaluations = (next: any[]) => { setEvaluations(next); saveQuantityReviewEvaluations(next); };
  const persistNotifications = (next: any[]) => { setNotifications(next); saveQuantityReviewNotifications(next); };

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
    telegramScreenshotDescription: form.telegramScreenshotDescription.trim() || undefined,
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

  // Detail modal for leadership to review submissions
  const [selectedTask, setSelectedTask] = useState<QuantityReviewTask | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  const canManage = user.role === 'ceo' || user.role === 'general_manager' || user.role === 'system_administrator';

  const openDetail = (task: QuantityReviewTask) => {
    setSelectedTask(task);
    setShowDetail(true);
  };

  const closeDetail = () => { setSelectedTask(null); setShowDetail(false); };

  function pushNotification(notification: any) {
    try {
      const key = 'role-notifications';
      const saved = localStorage.getItem(key);
      const list = saved ? JSON.parse(saved) : [];
      list.unshift(notification);
      localStorage.setItem(key, JSON.stringify(list));
      persistNotifications([notification, ...notifications]);
    } catch (err) {
      // ignore
    }
  }

  const handleApprove = (task: QuantityReviewTask | null) => {
    if (!canManage || !task) return;

    // create or update a minimal evaluation to record decision
    const existing = evaluations.find((e) => e.taskId === task.id);
    const decisionEvaluation = existing ? { ...existing, decisionStatus: 'approved', decisionNotes: 'Approved by leadership', decidedBy: user.id, decidedByName: user.name, decidedAt: new Date().toISOString() } : {
      id: createQuantityReviewEvaluationId(), taskId: task.id, jobId: task.jobId, surveyorId: task.assignedTo, surveyorName: '', costValue: 0, evaluationNotes: '', recommendation: 'recommended_for_approval', submittedAt: new Date().toISOString(), decisionStatus: 'approved', decisionNotes: 'Approved by leadership', decidedBy: user.id, decidedByName: user.name, decidedAt: new Date().toISOString(),
    };

    const nextEvaluations = existing ? evaluations.map((e) => e.id === decisionEvaluation.id ? decisionEvaluation : e) : [decisionEvaluation, ...evaluations];
    persistEvaluations(nextEvaluations);
    pushNotification(createDecisionMadeNotification(task as any, decisionEvaluation as any));
    // update task status
    const nextTasks = tasks.map((t) => t.id === task.id ? { ...t, status: 'record_submitted', updatedAt: new Date().toISOString() } : t);
    persistTasks(nextTasks as QuantityReviewTask[]);
    setShowDetail(false);
  };

  const handleProvideFeedback = () => {
    if (!canManage || !selectedTask) return;
    if (!feedbackText.trim()) return;

    const task = selectedTask;
    const existing = evaluations.find((e) => e.taskId === task.id);
    const decisionEvaluation = existing ? { ...existing, decisionStatus: 'feedback', decisionNotes: feedbackText.trim(), decidedBy: user.id, decidedByName: user.name, decidedAt: new Date().toISOString() } : {
      id: createQuantityReviewEvaluationId(), taskId: task.id, jobId: task.jobId, surveyorId: task.assignedTo, surveyorName: '', costValue: 0, evaluationNotes: '', recommendation: 'recommends_revision', submittedAt: new Date().toISOString(), decisionStatus: 'feedback', decisionNotes: feedbackText.trim(), decidedBy: user.id, decidedByName: user.name, decidedAt: new Date().toISOString(),
    };

    const nextEvaluations = existing ? evaluations.map((e) => e.id === decisionEvaluation.id ? decisionEvaluation : e) : [decisionEvaluation, ...evaluations];
    persistEvaluations(nextEvaluations);
    pushNotification(createDecisionMadeNotification(task as any, decisionEvaluation as any));
    const nextTasks = tasks.map((t) => t.id === task.id ? { ...t, status: 'in_review', updatedAt: new Date().toISOString() } : t);
    persistTasks(nextTasks as QuantityReviewTask[]);
    setShowFeedbackModal(false);
    setShowDetail(false);
    setFeedbackText('');
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
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      task.status === 'pending_review'
                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }
                  >
                    {task.status.replace('_', ' ')}
                  </Badge>
                  {(() => {
                    const ev = evaluations.find((e) => e.taskId === task.id);
                    if (!ev) return null;
                    return (
                      <div className="flex items-center gap-2">
                        {ev.decisionStatus === 'feedback' && <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Feedback Provided</span>}
                        {ev.decisionStatus === 'approved' && <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>}
                        {ev.decisionStatus === 'pending' && <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Pending Decision</span>}
                        {ev.recommendation === 'recommends_revision' && <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Recommends Revision</span>}
                        {ev.recommendation === 'recommended_for_approval' && <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Within budget</span>}
                      </div>
                    );
                  })()}
                </div>
              </div>
               <div className="mt-3">
                <button
                  onClick={() => openDetail(task)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Open Submission Detail
                </button>
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
                <div className="mt-3">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Screenshot description (optional)</label>
                  <input
                    value={form.telegramScreenshotDescription}
                    onChange={(e) => setForm((c) => ({ ...c, telegramScreenshotDescription: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="Short caption or context for the screenshot"
                  />
                </div>
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

      {/* Detail modal for leadership review */}
      {showDetail && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-6">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-semibold">{selectedTask.jobId} — {selectedTask.designWorkReference}</h3>
                <p className="text-sm text-gray-500">Submitted: {new Date(selectedTask.submissionDate).toLocaleString()}</p>
                <p className="mt-2 text-sm text-slate-600">Review this submission carefully: inspect the screenshot evidence, confirm the task statement, and either approve or provide actionable feedback. Decisions are recorded with timestamps and will notify the submitter.</p>
              </div>
              <div>
                <button onClick={closeDetail} className="px-3 py-2 rounded-lg border">Close</button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <h4 className="text-sm font-medium text-gray-600">Task statement</h4>
                <p className="mt-2 text-gray-800">{selectedTask.description}</p>

                <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                  <h5 className="text-sm font-medium text-gray-600">Submission history</h5>
                  <ul className="mt-2 text-sm text-gray-700 space-y-1">
                    {selectedTask.submissionHistory.map((h) => <li key={h}>• {h}</li>)}
                  </ul>
                </div>

                {/* Quantity Surveyor's submitted evaluation / observations */}
                {(() => {
                  const ev = evaluations.find((e) => e.taskId === selectedTask.id);
                  if (!ev) return null;
                  return (
                    <div className="mt-4 p-4 bg-white rounded-lg border">
                      <h5 className="text-sm font-medium text-gray-600">Quantity Surveyor submission</h5>
                      <div className="mt-1 text-sm text-gray-700">Submitted by: {ev.surveyorName || 'Quantity Surveyor'} — {new Date(ev.submittedAt).toLocaleString()}</div>
                      {typeof ev.costValue === 'number' && (
                        <div className="mt-2 text-sm text-gray-700">Estimated cost: {ev.costValue.toLocaleString()}</div>
                      )}
                      <p className="mt-3 text-sm text-gray-800">{ev.evaluationNotes}</p>
                    </div>
                  );
                })()}

                <div className="mt-6">
                  <h5 className="text-sm font-medium text-gray-600">Uploaded screenshot evidence (Telegram preview)</h5>
                  <div className="mt-2">
                    <img src={selectedTask.telegramScreenshot} alt="telegram" className="w-full h-56 object-cover rounded-lg border" />
                  </div>
                  {selectedTask.telegramScreenshotDescription && (
                    <p className="mt-2 text-sm text-gray-600">{selectedTask.telegramScreenshotDescription}</p>
                  )}
                </div>
              </div>

              <aside className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <h5 className="text-sm font-medium text-gray-600">Submission metadata</h5>
                  <div className="mt-2 text-sm text-gray-700">
                    <div>Job ID: {selectedTask.jobId}</div>
                    <div>Designer: {selectedTask.designerName}</div>
                    <div>Submitted: {new Date(selectedTask.submissionDate).toLocaleString()}</div>
                    <div>Status: {selectedTask.status.replace('_', ' ')}</div>
                    {(() => {
                      const ev = evaluations.find((e) => e.taskId === selectedTask.id);
                      if (!ev) return null;
                      if (ev.recommendation === 'recommends_revision') {
                        return <div className="mt-2"><Badge className="bg-amber-100 text-amber-700 border-amber-200">Recommends Revision</Badge></div>;
                      }
                      if (ev.recommendation === 'recommended_for_approval') {
                        return <div className="mt-2"><Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Within budget</Badge></div>;
                      }
                      return null;
                    })()}
                  </div>
                </div>

                {canManage && (
                  <div className="p-4 bg-white rounded-lg border shadow-sm">
                    <h5 className="text-sm font-medium text-gray-600">Actions</h5>
                    <div className="mt-3 flex flex-col gap-2">
                      <button onClick={() => handleApprove(selectedTask)} className="w-full px-3 py-2 bg-green-600 text-white rounded-lg">Approve</button>
                      <button onClick={() => setShowFeedbackModal(true)} className="w-full px-3 py-2 border rounded-lg text-gray-700">Provide Feedback</button>
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>
      )}

      {/* Feedback modal */}
      {showFeedbackModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold">Provide Feedback</h4>
              <button onClick={() => setShowFeedbackModal(false)} className="px-3 py-2 rounded-lg border">Cancel</button>
            </div>
            <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} rows={6} className="w-full mt-4 rounded-lg border px-3 py-2 text-sm" placeholder="Enter feedback for the Quantity Surveyor" />
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setShowFeedbackModal(false)} className="px-4 py-2 rounded-lg border">Close</button>
              <button onClick={() => handleProvideFeedback()} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Send Feedback</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuantitySurveyorTasks;