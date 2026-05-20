import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { mockProjects } from '../data/mockData';
import {
  assignmentRoles,
  getTaskAssigneeLabel,
  loadDesignerApplications,
  loadDesignerTasks,
  roleNamesByUserId,
} from './designerTaskShared';
import { DesignerTask, DesignerTaskApplication, TaskStatus } from '../types';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Edit,
  Image,
  Plus,
  XCircle,
  Briefcase,
} from 'lucide-react';

const emptyNewTask = {
  title: '',
  description: '',
  instruction: '',
  storyPoints: '',
  projectId: '',
  deadline: '',
  telegramScreenshot: '',
};

export function DesignerAssignments() {
  const { user } = useAuth();
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<DesignerTask | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [tasks, setTasks] = useState<DesignerTask[]>(loadDesignerTasks);
  const [applications, setApplications] = useState<DesignerTaskApplication[]>(loadDesignerApplications);
  const [newTask, setNewTask] = useState(emptyNewTask);
  const [newTaskImagePreview, setNewTaskImagePreview] = useState<string | null>(null);

  if (!user) return null;

  if (!assignmentRoles.has(user.role)) {
    return (
      <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">Access denied. CEO, General Manager, and System Administrator only.</p>
      </div>
    );
  }

  const canCreateTask = true;
  const isAdmin = true;

  const persistTasks = (updatedTasks: DesignerTask[]) => {
    setTasks(updatedTasks);
    localStorage.setItem('designer-tasks', JSON.stringify(updatedTasks));
  };

  const handleNewTaskImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setNewTask({ ...newTask, telegramScreenshot: dataUrl });
      setNewTaskImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const createTask = (event: React.FormEvent) => {
    event.preventDefault();

    const nextTask: DesignerTask = {
      id: `dtask-${Date.now()}`,
      projectId: newTask.projectId,
      title: newTask.title.trim(),
      description: newTask.description.trim(),
      instruction: newTask.instruction.trim(),
      storyPoints: Number(newTask.storyPoints),
      telegramScreenshot: newTask.telegramScreenshot || undefined,
      assignedBy: user.id,
      status: 'pending',
      deadline: newTask.deadline,
      createdAt: new Date().toISOString(),
    };

    persistTasks([nextTask, ...tasks]);
    setNewTask(emptyNewTask);
    setNewTaskImagePreview(null);
    setShowCreateTask(false);
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    persistTasks(tasks.map((task) => (task.id === taskId ? { ...task, status: newStatus } : task)));
    setEditingTask(null);
  };

  const openDetail = (task: DesignerTask) => {
    setSelectedTaskDetail(task);
    setShowDetail(true);
  };

  const closeDetail = () => {
    setSelectedTaskDetail(null);
    setShowDetail(false);
  };

  const assignedTasks = tasks.filter((task) => !!task.assignedTo);
  const visibleAssignedTasks = assignedTasks;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-col md:flex-row">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Designer Assignments</h2>
          <p className="text-gray-600 mt-1">Manage created designer tasks, assignments, and progress updates.</p>
        </div>
        {canCreateTask && (
          <button
            onClick={() => setShowCreateTask(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Create Designer Task</span>
          </button>
        )}
      </div>

      {visibleAssignedTasks.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No assigned designer tasks yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visibleAssignedTasks.map((task) => {
            const project = mockProjects.find((candidate) => candidate.id === task.projectId);
            const isEditing = editingTask === task.id;
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
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
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

                {isAdmin && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Update Status</label>
                          <select
                            defaultValue={task.status}
                            onChange={(event) => handleStatusChange(task.id, event.target.value as TaskStatus)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="incomplete">Incomplete</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingTask(null)}
                            className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => setEditingTask(null)}
                            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingTask(task.id)}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors text-sm"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Update Task</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900">{selectedTaskDetail.title}</h4>
                      <p className="mt-1 text-sm text-gray-500">ID: {selectedTaskDetail.id}</p>
                    </div>
                    <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">
                      Story Points: {selectedTaskDetail.storyPoints}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                      Created by {roleNamesByUserId[selectedTaskDetail.assignedBy] ?? `User ${selectedTaskDetail.assignedBy}`}
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                      Assigned to {getTaskAssigneeLabel(selectedTaskDetail.assignedTo)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      {selectedTaskDetail.status.replace('_', ' ')}
                    </span>
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

                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Submission Entries</h5>
                  <div className="mt-3 space-y-3">
                    {selectedTaskDetail.submissions && selectedTaskDetail.submissions.length > 0 ? (
                      selectedTaskDetail.submissions
                        .slice()
                        .reverse()
                        .map((s) => (
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

      {showCreateTask && canCreateTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Create Available Designer Task</h3>
            <p className="text-sm text-gray-600 mb-4">This task will be visible to designers so they can apply for it.</p>
            <form className="space-y-4" onSubmit={createTask}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Task Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(event) => setNewTask({ ...newTask, title: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter task title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  rows={4}
                  value={newTask.description}
                  onChange={(event) => setNewTask({ ...newTask, description: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe the work to be done"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Story Points</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newTask.storyPoints}
                  onChange={(event) => setNewTask({ ...newTask, storyPoints: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter story points"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Telegram Screenshot (optional)</label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-700">
                    <Image className="w-4 h-4" />
                    Choose Image
                    <input type="file" accept="image/*" onChange={handleNewTaskImageUpload} className="hidden" />
                  </label>
                  {newTaskImagePreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewTask({ ...newTask, telegramScreenshot: '' });
                        setNewTaskImagePreview(null);
                      }}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {newTaskImagePreview && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-1">Preview:</p>
                    <img src={newTaskImagePreview} alt="preview" className="max-w-full h-auto max-h-48 rounded-lg border object-contain" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Instruction</label>
                <textarea
                  rows={4}
                  value={newTask.instruction}
                  onChange={(event) => setNewTask({ ...newTask, instruction: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe what the designer must collect or measure"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
                <select
                  value={newTask.projectId}
                  onChange={(event) => setNewTask({ ...newTask, projectId: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select project</option>
                  {mockProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Deadline</label>
                <input
                  type="date"
                  value={newTask.deadline}
                  onChange={(event) => setNewTask({ ...newTask, deadline: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateTask(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DesignerAssignments;