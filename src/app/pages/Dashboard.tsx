import React, { useState } from 'react';
import { useAuth, getRoleName } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { mockProjects, mockTasks, mockApprovals } from '../data/mockData';
import {
  FolderKanban,
  CheckSquare,
  Clock,
  AlertCircle,
  TrendingUp,
  CheckCircle,
  Plus,
  Upload
} from 'lucide-react';

export function Dashboard() {
  const { user } = useAuth();
  const [showCreateTask, setShowCreateTask] = useState(false);

  if (!user) return null;

  const userProjects = mockProjects.filter(p => {
    if (user.role === 'general_manager' || user.role === 'system_administrator') {
      return true;
    }
    if (user.role === 'marketing_lead') {
      return p.createdBy === user.id;
    }
    if (user.role === 'design_team_leader' || user.role === 'designer') {
      return p.assignedTo === user.id || p.stage === 'design';
    }
    return p.stage !== 'lead';
  });

  const userTasks = mockTasks.filter(t => {
    if (user.role === 'general_manager' || user.role === 'system_administrator') {
      return true;
    }
    if (user.role === 'designer') {
      return t.assignedTo === user.id;
    }
    if (user.role === 'design_team_leader') {
      return t.assignedBy === user.id;
    }
    if (user.role === 'marketing_lead') {
      return t.assignedTo === user.id;
    }
    return false;
  });

  const pendingApprovals = mockApprovals.filter(a =>
    a.status === 'pending' && user.role === 'general_manager'
  );

  const activeProjects = userProjects.filter(p => p.status === 'active').length;
  const pendingTasks = userTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
  const completedTasks = userTasks.filter(t => t.status === 'completed').length;

  const stats = [
    {
      label: 'Active Projects',
      value: activeProjects,
      icon: FolderKanban,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: 'Pending Tasks',
      value: pendingTasks,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      label: 'Completed Tasks',
      value: completedTasks,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
  ];

  if (user.role === 'general_manager') {
    stats.push({
      label: 'Pending Approvals',
      value: pendingApprovals.length,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600 mt-1">Welcome back, {user.name}</p>
        <p className="text-sm text-gray-500">{getRoleName(user.role)}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className="text-3xl font-bold mt-2">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="hidden lg:block bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Recent Projects</h3>
            <Link to="/projects" className="text-sm text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {userProjects.slice(0, 5).map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="block p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{project.name}</p>
                    <p className="text-sm text-gray-500 mt-1">{project.clientName}</p>
                  </div>
                  <span className={`
                    px-2 py-1 rounded text-xs font-medium
                    ${project.stage === 'completed' ? 'bg-green-100 text-green-700' :
                      project.stage === 'approval' ? 'bg-yellow-100 text-yellow-700' :
                      project.stage === 'execution' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'}
                  `}>
                    {project.stage}
                  </span>
                </div>
              </Link>
            ))}
            {userProjects.length === 0 && (
              <p className="text-center text-gray-500 py-8">No projects found</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">My Tasks</h3>
            <div className="flex items-center gap-3">
              {user.role === 'marketing_lead' && (
                <button
                  onClick={() => setShowCreateTask(true)}
                  className="hidden md:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Task</span>
                </button>
              )}
              <Link to="/tasks" className="text-sm text-blue-600 hover:text-blue-700">
                View all
              </Link>
            </div>
          </div>
          <div className="space-y-3">
            {userTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{task.title}</p>
                    {task.deadline && (
                      <p className="text-xs text-gray-500 mt-1">
                        Due: {new Date(task.deadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <span className={`
                    px-2 py-1 rounded text-xs font-medium
                    ${task.status === 'completed' ? 'bg-green-100 text-green-700' :
                      task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      task.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'}
                  `}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
            {userTasks.length === 0 && (
              <p className="text-center text-gray-500 py-8">No tasks assigned</p>
            )}
          </div>
        </div>
      </div>

      {user.role === 'general_manager' && pendingApprovals.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Pending Approvals</h3>
            <Link to="/approvals" className="text-sm text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {pendingApprovals.map((approval) => {
              const project = mockProjects.find(p => p.id === approval.projectId);
              return (
                <Link
                  key={approval.id}
                  to="/approvals"
                  className="block p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{project?.name}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Stage: {approval.stage} | Requested: {new Date(approval.requestedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                      Pending
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
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
