import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { mockProjects } from '../data/mockData';
import {
  designerRoles,
  getTaskAssigneeLabel,
  loadDesignerTasks,
  roleNamesByUserId,
} from './designerTaskShared';
import { DesignerTask } from '../types';
import { AlertCircle, Calendar, Clock, Image, XCircle } from 'lucide-react';

export function DesignerTasks() {
  const { user } = useAuth();
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<DesignerTask | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [tasks, setTasks] = useState<DesignerTask[]>(loadDesignerTasks);

  // Submission form state – inside the detail modal
  const [submissionType, setSubmissionType] = useState<'Case Study' | 'Design Stage' | 'Rendering' | 'Final Stage'>('Design Stage');
  const [submissionNote, setSubmissionNote] = useState('');
  const [submissionFilePreview, setSubmissionFilePreview] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Feedback reply state
  const [feedbackReply, setFeedbackReply] = useState('');
  const [feedbackReplyError, setFeedbackReplyError] = useState<string | null>(null);

  if (!user) return null;

  if (!designerRoles.has(user.role)) {
    return (
      <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">Access denied. Designer and Design Team Leader only.</p>
      </div>
    );
  }

  const persistTasks = (updatedTasks: DesignerTask[]) => {
    setTasks(updatedTasks);
    localStorage.setItem('designer-tasks', JSON.stringify(updatedTasks));
  };

  // --- Submission helpers for progress (Design Stage / Final Stage etc.) ---
  const handleSubmissionFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSubmissionError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSubmissionFilePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const addSubmission = () => {
    if (!selectedTaskDetail) return;

    if (submissionType === 'Final Stage' && !submissionFilePreview) {
      setSubmissionError('A Telegram screenshot is required for Final Stage submissions.');
      return;
    }

    const newSubmission = {
      id: `sub-${Date.now()}`,
      submittedBy: user.id,
      submittedByName: user.name,
      submittedAt: new Date().toISOString(),
      notes: submissionNote.trim(),
      attachments: submissionFilePreview ? [submissionFilePreview] : undefined,
      metadata: { progressType: submissionType },
    };

    const updatedTasks = tasks.map((task) => {
      if (task.id === selectedTaskDetail.id) {
        const nextSubs = task.submissions ? [...task.submissions, newSubmission] : [newSubmission];
        return { ...task, submissions: nextSubs } as DesignerTask;
      }
      return task;
    });

    persistTasks(updatedTasks);

    setSelectedTaskDetail({
      ...selectedTaskDetail,
      submissions: selectedTaskDetail.submissions ? [...selectedTaskDetail.submissions, newSubmission] : [newSubmission],
    });

    // Reset form
    setSubmissionNote('');
    setSubmissionFilePreview(null);
    setSubmissionType('Design Stage');
    setSubmissionError(null);
  };

  // --- Feedback reply submission ---
  const submitFeedbackReply = () => {
    if (!selectedTaskDetail) return;
    if (!feedbackReply.trim()) {
      setFeedbackReplyError('Please enter a reply.');
      return;
    }

    const newSubmission = {
      id: `fb-${Date.now()}`,
      submittedBy: user.id,
      submittedByName: user.name,
      submittedAt: new Date().toISOString(),
      notes: feedbackReply.trim(),
      metadata: { progressType: 'Feedback Response' },
    };

    const updatedTasks = tasks.map((task) => {
      if (task.id === selectedTaskDetail.id) {
        const nextSubs = task.submissions ? [...task.submissions, newSubmission] : [newSubmission];
        return { ...task, submissions: nextSubs } as DesignerTask;
      }
      return task;
    });

    persistTasks(updatedTasks);
    setSelectedTaskDetail({
      ...selectedTaskDetail,
      submissions: selectedTaskDetail.submissions ? [...selectedTaskDetail.submissions, newSubmission] : [newSubmission],
    });
    setFeedbackReply('');
    setFeedbackReplyError(null);
  };

  const openDetail = (task: DesignerTask) => {
    setSelectedTaskDetail(task);
    // Reset forms
    setSubmissionNote('');
    setSubmissionFilePreview(null);
    setSubmissionType('Design Stage');
    setSubmissionError(null);
    setFeedbackReply('');
    setFeedbackReplyError(null);
    setShowDetail(true);
  };

  const closeDetail = () => {
    setSelectedTaskDetail(null);
    setShowDetail(false);
  };

  const assignedTasks = tasks.filter((task) => !!task.assignedTo);
  const visibleAssignedTasks = user.role === 'designer' ? assignedTasks.filter((task) => task.assignedTo === user.id) : assignedTasks;

  // Helper to determine if task is locked (Approved/Rejected)
  const isTaskLocked = (task: DesignerTask) =>
    task.approvalStatus === 'approved' || task.approvalStatus === 'rejected';

  // Helper to get display text for approval status
  const getApprovalDisplay = (task: DesignerTask) => {
    if (task.approvalStatus === 'approved') return 'Approved';
    if (task.approvalStatus === 'rejected') return 'Rejected';
    return 'Feedback'; // pending or undefined → Feedback
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-col md:flex-row">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Designer Tasks</h2>
          <p className="text-gray-600 mt-1">Track assigned work and submission details.</p>
        </div>
      </div>
      {visibleAssignedTasks.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">No assigned designer tasks yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visibleAssignedTasks.map((task) => {
            const project = mockProjects.find((candidate) => candidate.id === task.projectId);
            const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed';

            return (
              <div key={task.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3 gap-3">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{task.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">Assigned to: {getTaskAssigneeLabel(task.assignedTo)}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                      task.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : task.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-700'
                          : task.status === 'incomplete'
                            ? 'bg-orange-100 text-orange-700'
                            : task.status === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {task.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">Story Points: {task.storyPoints}</span>
                  <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                    Created by {roleNamesByUserId[task.assignedBy] ?? `User ${task.assignedBy}`}
                  </span>
                  {task.assignedTo && (
                    <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                      Assigned to {getTaskAssigneeLabel(task.assignedTo)}
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-3">{task.description}</p>

                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Telegram Evidence</p>
                  {(task as any).telegramScreenshot ? (
                    <img src={(task as any).telegramScreenshot} alt="telegram" className="mt-2 w-full max-h-32 object-cover rounded-lg border" />
                  ) : (
                    <p className="mt-1 text-sm text-gray-500">No Telegram evidence attached.</p>
                  )}
                </div>

                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Work Instruction</p>
                  <p className="text-sm text-gray-700 mt-1">{task.instruction}</p>
                </div>

                <button onClick={() => openDetail(task)} className="mb-4 text-sm text-blue-600 hover:underline">
                  Open Submission Detail
                </button>

                {project && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Project</p>
                    <p className="font-medium text-gray-900 mt-1">{project.name}</p>
                  </div>
                )}

                {/* Approval status badge */}
                {task.approvalStatus && (
                  <div
                    className={`mb-4 p-3 rounded-lg ${
                      task.approvalStatus === 'approved'
                        ? 'bg-green-50 border border-green-200'
                        : task.approvalStatus === 'rejected'
                          ? 'bg-red-50 border border-red-200'
                          : 'bg-yellow-50 border border-yellow-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {task.approvalStatus === 'approved' ? (
                        <AlertCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                      )}
                      <p
                        className={`text-sm font-medium ${
                          task.approvalStatus === 'approved'
                            ? 'text-green-700'
                            : task.approvalStatus === 'rejected'
                              ? 'text-red-700'
                              : 'text-yellow-700'
                        }`}
                      >
                        {getApprovalDisplay(task)}
                      </p>
                    </div>
                    {task.approvalFeedback && <p className="text-sm text-gray-700 italic">"{task.approvalFeedback}"</p>}
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  {task.deadline && (
                    <div className={`flex items-center gap-2 ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                      <Calendar className="w-4 h-4" />
                      <span>
                        Due: {new Date(task.deadline).toLocaleDateString()}
                        {isOverdue && ' (Overdue)'}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && selectedTaskDetail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 py-6 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">Submission Detail</h3>
                <p className="mt-1 text-sm text-gray-500">Designer task communication and assignment context</p>
              </div>
              <button onClick={closeDetail} className="rounded-lg p-2 hover:bg-gray-100">
                <XCircle className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 px-6 py-5 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-5">
                {/* Task Overview */}
                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900">{selectedTaskDetail.title}</h4>
                      <p className="mt-1 text-sm text-gray-500">ID: {selectedTaskDetail.id}</p>
                    </div>
                    <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">Story Points: {selectedTaskDetail.storyPoints}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">Created by {roleNamesByUserId[selectedTaskDetail.assignedBy] ?? `User ${selectedTaskDetail.assignedBy}`}</span>
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">Assigned to {getTaskAssigneeLabel(selectedTaskDetail.assignedTo)}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{selectedTaskDetail.status.replace('_', ' ')}</span>
                  </div>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Description</h5>
                  <p className="mt-2 text-sm text-gray-700">{selectedTaskDetail.description}</p>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Work Instruction</h5>
                  <p className="mt-2 text-sm text-gray-700">{selectedTaskDetail.instruction}</p>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Telegram Evidence</h5>
                  {(selectedTaskDetail as any).telegramScreenshot ? (
                    <img src={(selectedTaskDetail as any).telegramScreenshot} alt="telegram evidence" className="mt-3 w-full max-h-72 rounded-lg border object-contain" />
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">No Telegram evidence attached.</p>
                  )}
                </section>

                {/* Existing Submission Entries */}
                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Submission Entries</h5>
                  <div className="mt-3 space-y-3">
                    {selectedTaskDetail.submissions && selectedTaskDetail.submissions.length > 0 ? (
                      selectedTaskDetail.submissions.slice().reverse().map((s) => (
                        <div key={s.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{s.metadata?.progressType ?? 'Update'}</p>
                              <p className="mt-1 text-xs text-gray-500">
                                {s.submittedByName ?? s.submittedBy} • {new Date(s.submittedAt).toLocaleString()}
                              </p>
                            </div>
                            {s.attachments && s.attachments[0] && (
                              <img src={s.attachments[0]} alt="submission attachment" className="w-20 h-14 object-cover rounded-md border" />
                            )}
                          </div>
                          {s.notes && <p className="mt-2 text-sm text-gray-700 italic">"{s.notes}"</p>}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No submissions yet.</p>
                    )}
                  </div>
                </section>

                {/* Add Submission (only when task is NOT locked) */}
                {!isTaskLocked(selectedTaskDetail) && (
                  <section className="rounded-xl border border-gray-200 bg-white p-4">
                    <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Add Submission</h5>
                    <div className="mt-3 space-y-3">
                      <div>
                        <select
                          value={submissionType}
                          onChange={(e) => {
                            setSubmissionType(e.target.value as any);
                            setSubmissionError(null);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option>Case Study</option>
                          <option>Design Stage</option>
                          <option>Rendering</option>
                          <option>Final Stage</option>
                        </select>
                      </div>
                      <div>
                        <textarea
                          rows={3}
                          value={submissionNote}
                          onChange={(e) => setSubmissionNote(e.target.value)}
                          placeholder="Progress note"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <label className={`flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm ${
                            submissionType === 'Final Stage' ? 'text-red-600 border-red-300' : 'text-gray-700'
                          }`}>
                            <Image className="w-4 h-4" />
                            Attach Telegram Screenshot
                            {submissionType === 'Final Stage' && <span className="text-red-500">*</span>}
                            <input type="file" accept="image/*" onChange={handleSubmissionFileUpload} className="hidden" />
                          </label>
                          {submissionFilePreview && (
                            <button
                              type="button"
                              onClick={() => {
                                setSubmissionFilePreview(null);
                                setSubmissionError(null);
                              }}
                              className="text-sm text-red-600 hover:underline"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        {submissionType === 'Final Stage' && (
                          <p className="mt-1 text-xs text-red-500">Telegram screenshot is required for Final Stage submissions.</p>
                        )}
                        {submissionFilePreview && (
                          <img src={submissionFilePreview} alt="preview" className="mt-2 w-full max-h-32 object-contain rounded-lg border" />
                        )}
                      </div>

                      {submissionError && (
                        <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                          {submissionError}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={addSubmission}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors"
                        >
                          Submit Progress
                        </button>
                        <button
                          onClick={() => {
                            setSubmissionNote('');
                            setSubmissionFilePreview(null);
                            setSubmissionType('Design Stage');
                            setSubmissionError(null);
                          }}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </section>
                )}

                {/* NEW: Task Status & Feedback (replaces old Communication History) */}
                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Task Status & Feedback</h5>
                  <div className="mt-3 space-y-3">
                    {/* Status display */}
                    <div className={`p-3 rounded-lg border ${
                      selectedTaskDetail.approvalStatus === 'approved' ? 'bg-green-50 border-green-200' :
                      selectedTaskDetail.approvalStatus === 'rejected' ? 'bg-red-50 border-red-200' :
                      'bg-yellow-50 border-yellow-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className={`w-4 h-4 ${
                          selectedTaskDetail.approvalStatus === 'approved' ? 'text-green-600' :
                          selectedTaskDetail.approvalStatus === 'rejected' ? 'text-red-600' :
                          'text-yellow-600'
                        }`} />
                        <p className="text-sm font-medium text-gray-900">
                          {getApprovalDisplay(selectedTaskDetail)}
                        </p>
                      </div>
                      {selectedTaskDetail.approvalFeedback && (
                        <p className="text-sm text-gray-700 italic">"{selectedTaskDetail.approvalFeedback}"</p>
                      )}
                    </div>

                    {/* Feedback reply input – only when status is Feedback (pending) */}
                    {!isTaskLocked(selectedTaskDetail) && (
                      <div>
                        <textarea
                          rows={3}
                          value={feedbackReply}
                          onChange={(e) => { setFeedbackReply(e.target.value); setFeedbackReplyError(null); }}
                          placeholder="Reply to feedback..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        {feedbackReplyError && (
                          <p className="text-xs text-red-600 mt-1">{feedbackReplyError}</p>
                        )}
                        <button
                          onClick={submitFeedbackReply}
                          className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                        >
                          Send Reply
                        </button>
                      </div>
                    )}

                    {/* If locked (Approved/Rejected), show a notice */}
                    {isTaskLocked(selectedTaskDetail) && (
                      <p className="text-sm text-gray-500 italic">
                        The task has been {selectedTaskDetail.approvalStatus}. No further actions can be taken.
                      </p>
                    )}
                  </div>
                </section>
              </div>

              {/* Sidebar */}
              <aside className="space-y-4">
                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Timeline</h5>
                  <div className="mt-2 space-y-2 text-sm text-gray-700">
                    <p>Deadline: {selectedTaskDetail.deadline ? new Date(selectedTaskDetail.deadline).toLocaleDateString() : 'No deadline'}</p>
                    <p>Created: {new Date(selectedTaskDetail.createdAt).toLocaleDateString()}</p>
                    <p>Assigned by: {roleNamesByUserId[selectedTaskDetail.assignedBy] ?? `User ${selectedTaskDetail.assignedBy}`}</p>
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

export default DesignerTasks;