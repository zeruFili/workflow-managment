import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { mockProjects, mockTasks, mockDocuments } from '../data/mockData';
import {
  ArrowLeft,
  Calendar,
  User,
  FileText,
  CheckSquare,
  Edit,
  Download
} from 'lucide-react';

export function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'documents'>('overview');

  if (!user || !id) return null;

  const project = mockProjects.find(p => p.id === id);
  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Project not found</p>
        <Link to="/projects" className="text-blue-600 hover:text-blue-700 mt-4 inline-block">
          Back to Projects
        </Link>
      </div>
    );
  }

  const projectTasks = mockTasks.filter(t => t.projectId === id);
  const projectDocuments = mockDocuments.filter(d => d.projectId === id);

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: FileText },
    { id: 'tasks' as const, label: `Tasks (${projectTasks.length})`, icon: CheckSquare },
    { id: 'documents' as const, label: `Documents (${projectDocuments.length})`, icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{project.name}</h2>
            <p className="text-gray-600 mt-1">{project.clientName}</p>
          </div>
          <span className={`
            px-3 py-1 rounded-lg text-sm font-medium
            ${project.stage === 'completed' ? 'bg-green-100 text-green-700' :
              project.stage === 'approval' ? 'bg-yellow-100 text-yellow-700' :
              project.stage === 'execution' ? 'bg-blue-100 text-blue-700' :
              project.stage === 'design' ? 'bg-purple-100 text-purple-700' :
              'bg-gray-100 text-gray-700'}
          `}>
            {project.stage}
          </span>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 border-b-2 transition-colors
                  ${activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'}
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-lg mb-4">Project Description</h3>
              <p className="text-gray-700">{project.description}</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-lg mb-4">Project Timeline</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-32 text-sm text-gray-500">Created</div>
                  <div className="flex-1 text-gray-900">
                    {new Date(project.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                {project.deadline && (
                  <div className="flex items-center gap-4">
                    <div className="w-32 text-sm text-gray-500">Deadline</div>
                    <div className="flex-1 text-gray-900">
                      {new Date(project.deadline).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-lg mb-4">Project Info</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="text-gray-900 font-medium mt-1 capitalize">
                    {project.status.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Current Stage</p>
                  <p className="text-gray-900 font-medium mt-1 capitalize">{project.stage}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Client</p>
                  <p className="text-gray-900 font-medium mt-1">{project.clientName}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-lg mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Tasks</span>
                  <span className="font-semibold">{projectTasks.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Completed Tasks</span>
                  <span className="font-semibold text-green-600">
                    {projectTasks.filter(t => t.status === 'completed').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Documents</span>
                  <span className="font-semibold">{projectDocuments.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6">
            <h3 className="font-semibold text-lg mb-4">Project Tasks</h3>
            <div className="space-y-3">
              {projectTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{task.title}</h4>
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
                  <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {task.deadline && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Due: {new Date(task.deadline).toLocaleDateString()}
                      </span>
                    )}
                    <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              {projectTasks.length === 0 && (
                <p className="text-center text-gray-500 py-8">No tasks for this project</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6">
            <h3 className="font-semibold text-lg mb-4">Project Documents</h3>
            <div className="space-y-3">
              {projectDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{doc.name}</p>
                      <p className="text-sm text-gray-500">
                        {doc.size} • Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Download className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              ))}
              {projectDocuments.length === 0 && (
                <p className="text-center text-gray-500 py-8">No documents uploaded</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
