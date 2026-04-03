import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { mockTasks, mockProjects } from '../data/mockData';
import { Task, TaskStatus } from '../types';
import {
  Calendar,
  User,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  Plus,
  Edit,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export function Tasks() {
  const { user } = useAuth();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  if (!user) return null;

  let userTasks = mockTasks.filter(t => {
    if (user.role === 'general_manager' || user.role === 'system_administrator') {
      return true;
    }
    if (user.role === 'designer') {
      return t.assignedTo === user.id;
    }
    if (user.role === 'design_team_leader') {
      return t.assignedBy === user.id || t.assignedTo === user.id;
    }
    if (user.role === 'marketing_lead') {
      return t.assignedTo === user.id;
    }
    return false;
  });

  if (filterStatus !== 'all') {
    userTasks = userTasks.filter(t => t.status === filterStatus);
  }

  const getProject = (projectId: string) => {
    return mockProjects.find(p => p.id === projectId);
  };

  const statusGroups = [
    { status: 'pending', label: 'Pending', icon: Clock, color: 'text-gray-600', bgColor: 'bg-gray-100' },
    { status: 'in_progress', label: 'In Progress', icon: CheckCircle, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { status: 'completed', label: 'Completed', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
    { status: 'incomplete', label: 'Incomplete', icon: AlertCircle, color: 'text-orange-600', bgColor: 'bg-orange-100' },
    { status: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
  ];

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    console.log(`Updating task ${taskId} status to ${newStatus}`);
    setEditingTask(null);
  };

  const handleUpdateDescription = (taskId: string, description: string) => {
    console.log(`Updating task ${taskId} description:`, description);
  };

  const handleAttachFile = (taskId: string) => {
    console.log(`Attaching file to task ${taskId}`);
  };

  const canEditTask = (task: Task) => {
    if (user.role === 'marketing_lead' && task.assignedTo === user.id) {
      return true;
    }
    if (user.role === 'designer' && task.assignedTo === user.id) {
      return true;
    }
    if (user.role === 'design_team_leader') {
      return true;
    }
    return false;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tasks</h2>
          <p className="text-gray-600 mt-1">Manage and track your tasks</p>
        </div>
        {user.role === 'marketing_lead' && (
          <button
            onClick={() => setShowCreateTask(true)}
            className="hidden md:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Create Task</span>
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
          All Tasks ({userTasks.length})
        </button>
        {statusGroups.map((group) => {
          const count = userTasks.filter(t => t.status === group.status).length;
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
        {userTasks.map((task) => {
          const project = getProject(task.projectId);
          const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed';
          const isEditing = editingTask === task.id;

          return (
            <div
              key={task.id}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-lg text-gray-900 flex-1 pr-4">
                  {task.title}
                </h3>
                <span className={`
                  px-2 py-1 rounded text-xs font-medium whitespace-nowrap
                  ${task.status === 'completed' ? 'bg-green-100 text-green-700' :
                    task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    task.status === 'incomplete' ? 'bg-orange-100 text-orange-700' :
                    task.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'}
                `}>
                  {task.status.replace('_', ' ')}
                </span>
              </div>

              <p className="text-sm text-gray-600 mb-4">{task.description}</p>

              {project && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Project</p>
                  <p className="font-medium text-gray-900 mt-1">{project.name}</p>
                </div>
              )}

              {task.approvalStatus && (
                <div className={`mb-4 p-3 rounded-lg ${
                  task.approvalStatus === 'approved' ? 'bg-green-50 border border-green-200' :
                  task.approvalStatus === 'rejected' ? 'bg-red-50 border border-red-200' :
                  'bg-yellow-50 border border-yellow-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {task.approvalStatus === 'approved' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                    )}
                    <p className={`text-sm font-medium ${
                      task.approvalStatus === 'approved' ? 'text-green-700' :
                      task.approvalStatus === 'rejected' ? 'text-red-700' :
                      'text-yellow-700'
                    }`}>
                      {task.approvalStatus === 'approved' ? 'Approved' :
                       task.approvalStatus === 'rejected' ? 'Rejected' :
                       'Pending Approval'}
                    </p>
                  </div>
                  {task.approvalFeedback && (
                    <p className="text-sm text-gray-700 italic">"{task.approvalFeedback}"</p>
                  )}
                  {task.approvedBy && task.approvedAt && (
                    <p className="text-xs text-gray-500 mt-2">
                      By GM on {new Date(task.approvedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              {task.attachments && task.attachments.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Attachments</p>
                  <div className="space-y-2">
                    {task.attachments.map((attachment, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span>{attachment}</span>
                      </div>
                    ))}
                  </div>
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

              {canEditTask(task) && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Update Status
                        </label>
                        <select
                          defaultValue={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="incomplete">Incomplete</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Update Description
                        </label>
                        <textarea
                          defaultValue={task.description}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="Add description..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Attach Document
                        </label>
                        <button
                          onClick={() => handleAttachFile(task.id)}
                          className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                        >
                          <Upload className="w-4 h-4" />
                          <span>Upload File</span>
                        </button>
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

      {userTasks.length === 0 && (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">No tasks found</p>
        </div>
      )}

      {showCreateTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Create New Task</h3>
            <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault();
              setShowCreateTask(false);
            }}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Title
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter task title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter task description"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project
                </label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Select project</option>
                  {mockProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deadline
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attach File (Optional)
                </label>
                <button
                  type="button"
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>Choose File</span>
                </button>
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
    </div>
  );
}
