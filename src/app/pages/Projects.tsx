import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { mockProjects } from '../data/mockData';
import { Plus, Search, Filter, Calendar, User } from 'lucide-react';

export function Projects() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    clientName: '',
    description: '',
    deadline: '',
  });

  if (!user) return null;

  const canCreateProject = user.role === 'marketing_lead' || user.role === 'ceo';

  let filteredProjects = mockProjects.filter(p => {
    if (user.role === 'general_manager' || user.role === 'ceo') {
      return true;
    }
    if (user.role === 'marketing_lead') {
      return p.createdBy === user.id;
    }
    if (user.role === 'designer') {
      return p.assignedTo === user.id || p.stage === 'design';
    }
    return p.stage !== 'lead';
  });

  if (searchTerm) {
    filteredProjects = filteredProjects.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  if (filterStage !== 'all') {
    filteredProjects = filteredProjects.filter(p => p.stage === filterStage);
  }

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Creating project:', newProject);
    setShowNewProject(false);
    setNewProject({ name: '', clientName: '', description: '', deadline: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
          <p className="text-gray-600 mt-1">Manage and track all projects</p>
        </div>
        {canCreateProject && (
          <button
            onClick={() => setShowNewProject(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">New Project</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Stages</option>
            <option value="lead">Lead</option>
            <option value="design">Design</option>
            <option value="approval">Approval</option>
            <option value="execution">Execution</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map((project) => (
          <Link
            key={project.id}
            to={`/projects/${project.id}`}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-lg text-gray-900 line-clamp-1">
                {project.name}
              </h3>
              <span className={`
                px-2 py-1 rounded text-xs font-medium whitespace-nowrap
                ${project.stage === 'completed' ? 'bg-green-100 text-green-700' :
                  project.stage === 'approval' ? 'bg-yellow-100 text-yellow-700' :
                  project.stage === 'execution' ? 'bg-blue-100 text-blue-700' :
                  project.stage === 'design' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-700'}
              `}>
                {project.stage}
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
              {project.description}
            </p>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <User className="w-4 h-4" />
                <span>{project.clientName}</span>
              </div>
              {project.deadline && (
                <div className="flex items-center gap-2 text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>Due: {new Date(project.deadline).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <span className={`
                inline-block px-2 py-1 rounded text-xs font-medium
                ${project.status === 'completed' ? 'bg-green-50 text-green-700' :
                  project.status === 'on_hold' ? 'bg-red-50 text-red-700' :
                  'bg-blue-50 text-blue-700'}
              `}>
                {project.status.replace('_', ' ')}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">No projects found</p>
        </div>
      )}

      {showNewProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-semibold mb-4">Create New Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Name
                </label>
                <input
                  type="text"
                  value={newProject.clientName}
                  onChange={(e) => setNewProject({ ...newProject, clientName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deadline
                </label>
                <input
                  type="date"
                  value={newProject.deadline}
                  onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewProject(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
