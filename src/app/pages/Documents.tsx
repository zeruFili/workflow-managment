import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { mockDocuments, mockProjects } from '../data/mockData';
import { FileText, Download, Upload, Search, Filter } from 'lucide-react';

export function Documents() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  if (!user) return null;

  let filteredDocuments = mockDocuments;

  if (searchTerm) {
    filteredDocuments = filteredDocuments.filter(d =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  if (filterType !== 'all') {
    filteredDocuments = filteredDocuments.filter(d => d.type === filterType);
  }

  const getProject = (projectId: string) => {
    return mockProjects.find(p => p.id === projectId);
  };

  const fileTypes = [...new Set(mockDocuments.map(d => d.type))];

  const getFileIcon = (type: string) => {
    const colors: Record<string, string> = {
      pdf: 'bg-red-100 text-red-600',
      dwg: 'bg-blue-100 text-blue-600',
      xlsx: 'bg-green-100 text-green-600',
      zip: 'bg-purple-100 text-purple-600',
      jpg: 'bg-orange-100 text-orange-600',
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
  };

  const canUpload = user.role === 'designer' || user.role === 'site_engineer' || user.role === 'finance_officer';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
          <p className="text-gray-600 mt-1">Manage project files and documents</p>
        </div>
        {canUpload && (
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
            <Upload className="w-5 h-5" />
            <span className="hidden sm:inline">Upload</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            {fileTypes.map(type => (
              <option key={type} value={type}>{type.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocuments.map((doc) => {
          const project = getProject(doc.projectId);
          return (
            <div
              key={doc.id}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${getFileIcon(doc.type)}`}>
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{doc.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {doc.type.toUpperCase()} • {doc.size}
                  </p>
                </div>
              </div>

              {project && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Project</p>
                  <p className="text-sm font-medium text-gray-900 mt-1 truncate">
                    {project.name}
                  </p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  <p>Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Download className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredDocuments.length === 0 && (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No documents found</p>
        </div>
      )}
    </div>
  );
}
