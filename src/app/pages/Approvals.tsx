import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { mockApprovals, mockProjects } from '../data/mockData';
import { CheckCircle, XCircle, Clock, MessageSquare } from 'lucide-react';

export function Approvals() {
  const { user } = useAuth();
  const [selectedApproval, setSelectedApproval] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  if (!user) return null;

  const canApprove = user.role === 'general_manager';

  let userApprovals = mockApprovals;

  if (user.role !== 'general_manager' && user.role !== 'system_administrator') {
    userApprovals = mockApprovals.filter(a => {
      const project = mockProjects.find(p => p.id === a.projectId);
      return project?.assignedTo === user.id || project?.createdBy === user.id;
    });
  }

  const getProject = (projectId: string) => {
    return mockProjects.find(p => p.id === projectId);
  };

  const handleApproval = (approvalId: string, action: 'approve' | 'reject') => {
    console.log(`${action} approval:`, approvalId, 'with feedback:', feedback);
    setSelectedApproval(null);
    setFeedback('');
  };

  const pendingApprovals = userApprovals.filter(a => a.status === 'pending');
  const reviewedApprovals = userApprovals.filter(a => a.status !== 'pending');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Approvals</h2>
        <p className="text-gray-600 mt-1">
          {canApprove ? 'Review and approve project stages' : 'Track approval requests'}
        </p>
      </div>

      {canApprove && pendingApprovals.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <Clock className="w-5 h-5" />
            <span className="font-medium">
              You have {pendingApprovals.length} pending approval{pendingApprovals.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {pendingApprovals.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-4">Pending Approvals</h3>
            <div className="space-y-4">
              {pendingApprovals.map((approval) => {
                const project = getProject(approval.projectId);
                if (!project) return null;

                return (
                  <div
                    key={approval.id}
                    className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg text-gray-900">{project.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{project.clientName}</p>
                      </div>
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                        Pending
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Stage</p>
                        <p className="font-medium text-gray-900 mt-1 capitalize">{approval.stage}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Requested</p>
                        <p className="font-medium text-gray-900 mt-1">
                          {new Date(approval.requestedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {canApprove && (
                      <>
                        {selectedApproval === approval.id ? (
                          <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Feedback
                              </label>
                              <textarea
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows={3}
                                placeholder="Enter your feedback..."
                              />
                            </div>
                            <div className="flex gap-3">
                              <button
                                onClick={() => handleApproval(approval.id, 'approve')}
                                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                              >
                                <CheckCircle className="w-5 h-5" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleApproval(approval.id, 'reject')}
                                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                              >
                                <XCircle className="w-5 h-5" />
                                Reject
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedApproval(null);
                                  setFeedback('');
                                }}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <button
                              onClick={() => setSelectedApproval(approval.id)}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                            >
                              Review
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {reviewedApprovals.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-4">Reviewed Approvals</h3>
            <div className="space-y-4">
              {reviewedApprovals.map((approval) => {
                const project = getProject(approval.projectId);
                if (!project) return null;

                return (
                  <div
                    key={approval.id}
                    className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg text-gray-900">{project.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{project.clientName}</p>
                      </div>
                      <span className={`
                        px-3 py-1 rounded-full text-sm font-medium
                        ${approval.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'}
                      `}>
                        {approval.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Stage</p>
                        <p className="font-medium text-gray-900 mt-1 capitalize">{approval.stage}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Reviewed</p>
                        <p className="font-medium text-gray-900 mt-1">
                          {approval.reviewedAt && new Date(approval.reviewedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {approval.feedback && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-start gap-2 text-gray-700">
                          <MessageSquare className="w-5 h-5 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Feedback</p>
                            <p className="text-sm mt-1">{approval.feedback}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {userApprovals.length === 0 && (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
            <p className="text-gray-500">No approvals found</p>
          </div>
        )}
      </div>
    </div>
  );
}
