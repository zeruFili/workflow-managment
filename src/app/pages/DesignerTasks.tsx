import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { mockProjects } from '../data/mockData';
import {
  designerRoles,
  getTaskAssigneeLabel,
  loadDesignerApplications,
  loadDesignerTasks,
  roleNamesByUserId,
} from './designerTaskShared';
import { DesignerTask, DesignerTaskApplication } from '../types';
import { AlertCircle, Calendar, Clock, Image, Send, User, XCircle } from 'lucide-react';

export function DesignerTasks() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'applications' | 'assignments'>('assignments');
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<DesignerTask | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedApplicationTask, setSelectedApplicationTask] = useState<DesignerTask | null>(null);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [tasks, setTasks] = useState<DesignerTask[]>(loadDesignerTasks);
  const [applications, setApplications] = useState<DesignerTaskApplication[]>(loadDesignerApplications);

  // Submission form state – inside the detail modal
  const [submissionType, setSubmissionType] = useState<'Case Study' | 'Design Stage' | 'Rendering' | 'Final Stage'>('Design Stage');
  const [submissionNote, setSubmissionNote] = useState('');
  const [submissionFilePreview, setSubmissionFilePreview] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

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

  const persistApplications = (updatedApplications: DesignerTaskApplication[]) => {
    setApplications(updatedApplications);
    localStorage.setItem('designer-task-applications', JSON.stringify(updatedApplications));
  };

  const handleSubmissionFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSubmissionError(null); // clear any attachment error
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSubmissionFilePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const addSubmission = () => {
    if (!selectedTaskDetail) return;

    // Validate Final Stage attachment
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

  const openApplicationModal = (task: DesignerTask) => {
    setSelectedApplicationTask(task);
    setApplicationMessage('');
  };

  const closeApplicationModal = () => {
    setSelectedApplicationTask(null);
    setApplicationMessage('');
  };

  const handleSubmitApplication = (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedApplicationTask) return;

    const alreadyApplied = applications.some((app) => app.taskId === selectedApplicationTask.id && app.applicantId === user.id);
    if (alreadyApplied) {
      closeApplicationModal();
      return;
    }

    const nextApplication: DesignerTaskApplication = {
      id: `dapp-${Date.now()}`,
      taskId: selectedApplicationTask.id,
      applicantId: user.id,
      applicantName: user.name,
      applicantRole: 'designer',
      message: applicationMessage.trim(),
      appliedAt: new Date().toISOString(),
      status: 'pending',
    };

    persistApplications([nextApplication, ...applications]);
    closeApplicationModal();
  };

  const openDetail = (task: DesignerTask) => {
    setSelectedTaskDetail(task);
    // Reset submission form for new detail
    setSubmissionNote('');
    setSubmissionFilePreview(null);
    setSubmissionType('Design Stage');
    setSubmissionError(null);
    setShowDetail(true);
  };

  const closeDetail = () => {
    setSelectedTaskDetail(null);
    setShowDetail(false);
  };

  const assignedTasks = tasks.filter((task) => !!task.assignedTo);
  const visibleAssignedTasks = user.role === 'designer' ? assignedTasks.filter((task) => task.assignedTo === user.id) : assignedTasks;
  const unassignedTasksWithApplications = tasks.filter((task) => !task.assignedTo && applications.some((app) => app.taskId === task.id));
  const applicationsByTask = unassignedTasksWithApplications.map((task) => ({
    task,
    applications: applications.filter((app) => app.taskId === task.id),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-col md:flex-row">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Designer Tasks</h2>
          <p className="text-gray-600 mt-1">Track assigned work and apply to open designer tasks.</p>
        </div>
      </div>

      <div className="flex border-b border-gray-200 gap-6">
        <button
          onClick={() => setActiveTab('assignments')}
          className={`pb-2 px-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'assignments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Assigned Tasks ({visibleAssignedTasks.length})
        </button>
        <button
          onClick={() => setActiveTab('applications')}
          className={`pb-2 px-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'applications' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Open Tasks ({unassignedTasksWithApplications.length})
        </button>
      </div>

      {activeTab === 'assignments' && (
        <>
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
                            {task.approvalStatus === 'approved'
                              ? 'Approved'
                              : task.approvalStatus === 'rejected'
                                ? 'Rejected'
                                : 'Pending Approval'}
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
        </>
      )}

      {activeTab === 'applications' && (
        <>
          {applicationsByTask.length === 0 ? (
            <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
              <Send className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No pending applications for open tasks.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {applicationsByTask.map(({ task, applications: taskApplications }) => {
                const project = mockProjects.find((p) => p.id === task.projectId);
                const visibleApplications = taskApplications.filter((app) => app.applicantId === user.id);

                if (visibleApplications.length === 0) return null;

                return (
                  <div key={task.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">{task.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">Open for application</p>
                      </div>
                      <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-medium">{taskApplications.length} application(s)</span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">Story Points: {task.storyPoints}</span>
                      {project && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">Project: {project.name}</span>}
                    </div>

                    <p className="text-sm text-gray-600 mb-4">{task.description}</p>

                    <div className="space-y-3">
                      {visibleApplications.map((app) => (
                        <div
                          key={app.id}
                          className={`p-4 rounded-lg border ${
                            app.status === 'assigned'
                              ? 'bg-green-50 border-green-200'
                              : app.status === 'rejected'
                                ? 'bg-red-50 border-red-200'
                                : 'bg-blue-50 border-blue-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-900">{app.applicantName}</span>
                            <span
                              className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                                app.status === 'assigned'
                                  ? 'bg-green-100 text-green-700'
                                  : app.status === 'rejected'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {app.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 italic">"{app.message}"</p>
                          <p className="text-xs text-gray-400 mt-1">Applied {new Date(app.appliedAt).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>

                    {user.role === 'designer' && !task.assignedTo && !visibleApplications.some((app) => app.applicantId === user.id) && (
                      <button
                        onClick={() => openApplicationModal(task)}
                        className="mt-4 w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg transition-colors text-sm"
                      >
                        <Send className="w-4 h-4" />
                        Apply for this task
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

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

                {/* Add Submission Form with Final Stage option */}
                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Add Submission</h5>
                  <div className="mt-3 space-y-3">
                    <div>
                      <select
                        value={submissionType}
                        onChange={(e) => {
                          setSubmissionType(e.target.value as any);
                          setSubmissionError(null); // clear error on type change
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

                {/* Communication History */}
                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Communication History</h5>
                  <div className="mt-3 space-y-3">
                    {applications
                      .filter((app) => app.taskId === selectedTaskDetail.id)
                      .sort((a, b) => new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime())
                      .map((app) => (
                        <div key={app.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-gray-900">{app.applicantName}</p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                app.status === 'assigned'
                                  ? 'bg-green-100 text-green-700'
                                  : app.status === 'rejected'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {app.status}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-gray-700 italic">"{app.message}"</p>
                          <p className="mt-1 text-xs text-gray-500">Applied {new Date(app.appliedAt).toLocaleString()}</p>
                        </div>
                      ))}
                    {applications.filter((app) => app.taskId === selectedTaskDetail.id).length === 0 && (
                      <p className="text-sm text-gray-500">No applications or communication notes yet.</p>
                    )}
                  </div>
                </section>
              </div>

              {/* Sidebar */}
              <aside className="space-y-4">
                {selectedTaskDetail.approvalStatus && (
                  <section className="rounded-xl border border-gray-200 bg-white p-4">
                    <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Approval Status</h5>
                    <p className="mt-2 text-sm text-gray-700">{selectedTaskDetail.approvalStatus}</p>
                    {selectedTaskDetail.approvalFeedback && <p className="mt-2 text-sm text-gray-600 italic">{selectedTaskDetail.approvalFeedback}</p>}
                  </section>
                )}

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

      {selectedApplicationTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl border border-gray-200">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Apply for Task</h3>
                <p className="text-sm text-gray-600 mt-1">Submit your application for {selectedApplicationTask.title}.</p>
              </div>
              <button onClick={closeApplicationModal} className="p-2 rounded-lg hover:bg-gray-100">
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmitApplication}>
              <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
                <p className="font-medium text-gray-900">{selectedApplicationTask.title}</p>
                <p className="mt-1">{selectedApplicationTask.description}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">Story Points: {selectedApplicationTask.storyPoints}</span>
                </div>
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Telegram Evidence</p>
                  {(selectedApplicationTask as any).telegramScreenshot ? (
                    <img src={(selectedApplicationTask as any).telegramScreenshot} alt="telegram" className="mt-2 w-full max-h-32 object-cover rounded-lg border" />
                  ) : (
                    <p className="mt-1 text-sm text-gray-500">No Telegram evidence attached.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Application Note</label>
                <textarea
                  rows={4}
                  value={applicationMessage}
                  onChange={(event) => setApplicationMessage(event.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tell the Admin or General Manager why you are a good fit for this task"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeApplicationModal} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors">
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DesignerTasks;