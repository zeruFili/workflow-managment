import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { mockDesignerTasks, mockDesignerTaskApplications, mockProjects } from '../data/mockData';
import { DesignerTask, DesignerTaskApplication, TaskStatus } from '../types';
import {
  AlertCircle,
  BadgeCheck,
  Calendar,
  CheckCircle,
  CheckCircle2,
  Clock,
  Edit,
  Plus,
  Send,
  User,
  XCircle,
} from 'lucide-react';

const TASK_STORAGE_KEY = 'designer-tasks';
const APPLICATION_STORAGE_KEY = 'designer-task-applications';

const allowedRoles = new Set(['general_manager', 'system_administrator', 'design_team_leader', 'designer']);
const reviewRoles = new Set(['general_manager', 'system_administrator']);

const emptyNewTask = {
  title: '',
  description: '',
  instruction: '',
  storyPoints: '',
  projectId: '',
  deadline: '',
};

const roleNamesByUserId: Record<string, string> = {
  '1': 'Marketing Lead',
  '2': 'General Manager',
  '3': 'Design Team Leader',
  '4': 'Designer',
  '5': 'Site Engineer',
  '6': 'Finance Officer',
  '7': 'Purchasing Team',
  '8': 'System Administrator',
  '9': 'Sophia Ahmed',
  '10': 'Daniel Reed',
  '11': 'Liam Carter',
};

function loadDesignerTasks(): DesignerTask[] {
  const savedTasks = localStorage.getItem(TASK_STORAGE_KEY);
  if (savedTasks) {
    const parsedTasks = JSON.parse(savedTasks) as DesignerTask[];
    const mergedTasks = [
      ...parsedTasks.map((task) => {
        const seedTask = mockDesignerTasks.find((candidate) => candidate.id === task.id);
        return seedTask ? { ...seedTask, ...task } : task;
      }),
      ...mockDesignerTasks.filter((seedTask) => !parsedTasks.some((task) => task.id === seedTask.id)),
    ];

    localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(mergedTasks));
    return mergedTasks;
  }

  localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(mockDesignerTasks));
  return mockDesignerTasks;
}

function loadDesignerApplications(): DesignerTaskApplication[] {
  const savedApplications = localStorage.getItem(APPLICATION_STORAGE_KEY);
  if (savedApplications) {
    const parsedApplications = JSON.parse(savedApplications) as DesignerTaskApplication[];
    const mergedApplications = [
      ...parsedApplications.map((application) => {
        const seedApplication = mockDesignerTaskApplications.find((candidate) => candidate.id === application.id);
        return seedApplication ? { ...seedApplication, ...application } : application;
      }),
      ...mockDesignerTaskApplications.filter(
        (seedApplication) => !parsedApplications.some((application) => application.id === seedApplication.id)
      ),
    ];

    localStorage.setItem(APPLICATION_STORAGE_KEY, JSON.stringify(mergedApplications));
    return mergedApplications;
  }

  localStorage.setItem(APPLICATION_STORAGE_KEY, JSON.stringify(mockDesignerTaskApplications));
  return mockDesignerTaskApplications;
}

function getTaskAssigneeLabel(assignedTo?: string) {
  if (!assignedTo) {
    return 'Open for application';
  }

  return roleNamesByUserId[assignedTo] ?? `User ${assignedTo}`;
}

export function DesignerTasks() {
  const { user } = useAuth();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [selectedApplicationTask, setSelectedApplicationTask] = useState<DesignerTask | null>(null);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [tasks, setTasks] = useState<DesignerTask[]>(loadDesignerTasks);
  const [applications, setApplications] = useState<DesignerTaskApplication[]>(loadDesignerApplications);
  const [newTask, setNewTask] = useState(emptyNewTask);

  if (!user) return null;

  if (!allowedRoles.has(user.role)) {
    return (
      <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">
          Access denied. Designer tasks are visible to the General Manager, System Administrator, Design Team Leader, and Designer only.
        </p>
      </div>
    );
  }

  const canCreateTask = user.role === 'general_manager' || user.role === 'system_administrator';
  const canApplyForTasks = user.role === 'designer';

  const visibleTasks = tasks.filter((task) => {
    if (user.role === 'design_team_leader') {
      return true;
    }

    return !task.assignedTo || task.assignedTo === user.id;
  });

  const filteredTasks = filterStatus === 'all'
    ? visibleTasks
    : visibleTasks.filter((task) => task.status === filterStatus);

  const persistTasks = (updatedTasks: DesignerTask[]) => {
    setTasks(updatedTasks);
    localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(updatedTasks));
  };

  const persistApplications = (updatedApplications: DesignerTaskApplication[]) => {
    setApplications(updatedApplications);
    localStorage.setItem(APPLICATION_STORAGE_KEY, JSON.stringify(updatedApplications));
  };

  const getTaskApplications = (taskId: string) => applications.filter((application) => application.taskId === taskId);

  const getMyApplication = (taskId: string) =>
    applications.find((application) => application.taskId === taskId && application.applicantId === user.id);

  const createTask = (event: React.FormEvent) => {
    event.preventDefault();

    const nextTask: DesignerTask = {
      id: `dtask-${Date.now()}`,
      projectId: newTask.projectId,
      title: newTask.title.trim(),
      description: newTask.description.trim(),
      instruction: newTask.instruction.trim(),
      storyPoints: Number(newTask.storyPoints),
      assignedBy: user.id,
      status: 'pending',
      deadline: newTask.deadline,
      createdAt: new Date().toISOString(),
    };

    persistTasks([nextTask, ...tasks]);
    setNewTask(emptyNewTask);
    setShowCreateTask(false);
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    persistTasks(tasks.map((task) => (task.id === taskId ? { ...task, status: newStatus } : task)));
    setEditingTask(null);
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

    if (!selectedApplicationTask) {
      return;
    }

    const alreadyApplied = applications.some(
      (application) => application.taskId === selectedApplicationTask.id && application.applicantId === user.id
    );

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-col md:flex-row">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Designer Tasks</h2>
          <p className="text-gray-600 mt-1">Tasks for the design team with story points and deadlines.</p>
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

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded-lg transition-colors text-sm ${
            filterStatus === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          All Tasks ({visibleTasks.length})
        </button>
        {[
          { status: 'pending', label: 'Pending' },
          { status: 'in_progress', label: 'In Progress' },
          { status: 'completed', label: 'Completed' },
          { status: 'incomplete', label: 'Incomplete' },
          { status: 'rejected', label: 'Rejected' },
        ].map((group) => {
          const count = filteredTasks.filter((task) => task.status === group.status).length;
          return (
            <button
              key={group.status}
              onClick={() => setFilterStatus(group.status)}
              className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                filterStatus === group.status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {group.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredTasks.map((task) => {
          const project = mockProjects.find((candidate) => candidate.id === task.projectId);
          const isEditing = editingTask === task.id;
          const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed';
          const taskApplications = getTaskApplications(task.id);
          const myApplication = getMyApplication(task.id);
          const canApplyToTask =
            canApplyForTasks && !task.assignedTo && (task.assignedBy === '2' || task.assignedBy === '8') && !myApplication;

          return (
            <div key={task.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3 gap-3">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">{task.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{getTaskAssigneeLabel(task.assignedTo)}</p>
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
                <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
                  Story Points: {task.storyPoints}
                </span>
                <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                  Created by {roleNamesByUserId[task.assignedBy] ?? `User ${task.assignedBy}`}
                </span>
                {!task.assignedTo && (
                  <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                    Open for application
                  </span>
                )}
                {taskApplications.length > 0 && (
                  <span className="px-2 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-medium">
                    Applications: {taskApplications.length}
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-3">{task.description}</p>

              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Work Instruction</p>
                <p className="text-sm text-gray-700 mt-1">{task.instruction}</p>
              </div>

              {myApplication && (
                <div
                  className={`mb-4 p-3 rounded-lg border ${
                    myApplication.status === 'assigned'
                      ? 'bg-green-50 border-green-200'
                      : myApplication.status === 'rejected'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <BadgeCheck
                      className={`w-4 h-4 ${
                        myApplication.status === 'assigned'
                          ? 'text-green-600'
                          : myApplication.status === 'rejected'
                            ? 'text-red-600'
                            : 'text-yellow-600'
                      }`}
                    />
                    <p
                      className={`text-sm font-medium ${
                        myApplication.status === 'assigned'
                          ? 'text-green-700'
                          : myApplication.status === 'rejected'
                            ? 'text-red-700'
                            : 'text-yellow-700'
                      }`}
                    >
                      Your application is {myApplication.status}
                    </p>
                  </div>
                  <p className="text-sm text-gray-700">{myApplication.message}</p>
                </div>
              )}

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

              {canApplyToTask && (
                <button
                  onClick={() => openApplicationModal(task)}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg transition-colors text-sm"
                >
                  <Send className="w-4 h-4" />
                  Apply for Task
                </button>
              )}

              {(user.role === 'general_manager' || user.role === 'system_administrator' || user.role === 'design_team_leader') && (
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

      {filteredTasks.length === 0 && (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">No designer tasks found</p>
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
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Create Task
                </button>
              </div>
            </form>
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
                <button
                  type="button"
                  onClick={closeApplicationModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                >
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
