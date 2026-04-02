import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { mockTasks, mockProjects } from '../data/mockData';
import { Calendar, User, Filter, CheckCircle, Clock, XCircle } from 'lucide-react';

export function Tasks() {
  const { user } = useAuth();
  const [filterStatus, setFilterStatus] = useState<string>('all');

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
    { status: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Tasks</h2>
        <p className="text-gray-600 mt-1">Manage and track your tasks</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filterStatus === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          All Tasks ({mockTasks.length})
        </button>
        {statusGroups.map((group) => {
          const count = userTasks.filter(t => t.status === group.status).length;
          return (
            <button
              key={group.status}
              onClick={() => setFilterStatus(group.status)}
              className={`px-4 py-2 rounded-lg transition-colors ${
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

              {user.role === 'designer' && task.assignedTo === user.id && task.status !== 'completed' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors text-sm">
                    Update Status
                  </button>
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
    </div>
  );
}
