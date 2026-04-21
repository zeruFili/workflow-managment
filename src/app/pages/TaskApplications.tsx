import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { mockDesignerTasks, mockDesignerTaskApplications } from '../data/mockData';
import { DesignerTask, DesignerTaskApplication } from '../types';
import {
  CheckCircle2,
  User,
  Users,
} from 'lucide-react';

const APPLICATION_STORAGE_KEY = 'designer-task-applications';
const TASK_STORAGE_KEY = 'designer-tasks';

const reviewRoles = new Set(['general_manager', 'system_administrator']);

const designerRoster = [
  { id: '3', name: 'Emily Chen', role: 'Design Team Leader' },
  { id: '4', name: 'Michael Brown', role: 'Designer' },
  { id: '9', name: 'Sophia Ahmed', role: 'Designer' },
  { id: '10', name: 'Daniel Reed', role: 'Designer' },
  { id: '11', name: 'Liam Carter', role: 'Designer' },
];

function loadApplications(): DesignerTaskApplication[] {
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

function loadTasks(): DesignerTask[] {
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

function getDesignerName(designerId: string) {
  return designerRoster.find((designer) => designer.id === designerId)?.name ?? `Designer ${designerId}`;
}

export function TaskApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<DesignerTaskApplication[]>(loadApplications);
  const [tasks, setTasks] = useState<DesignerTask[]>(loadTasks);
  const [selectedDesignerByTask, setSelectedDesignerByTask] = useState<Record<string, string>>({});

  if (!user) return null;

  if (!reviewRoles.has(user.role)) {
    return (
      <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">Access denied. Admin and General Manager only.</p>
      </div>
    );
  }

  const persistApplications = (updatedApplications: DesignerTaskApplication[]) => {
    setApplications(updatedApplications);
    localStorage.setItem(APPLICATION_STORAGE_KEY, JSON.stringify(updatedApplications));
  };

  const persistTasks = (updatedTasks: DesignerTask[]) => {
    setTasks(updatedTasks);
    localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(updatedTasks));
  };

  const groupedApplications = tasks
    .map((task) => ({
      task,
      applications: applications.filter((application) => application.taskId === task.id),
    }))
    .filter((entry) => entry.applications.length > 0);

  const handleAssign = (taskId: string, taskApplications: DesignerTaskApplication[]) => {
    const selectedDesignerId = selectedDesignerByTask[taskId];
    if (!selectedDesignerId) {
      return;
    }

    const now = new Date().toISOString();
    const assignedDesignerName = getDesignerName(selectedDesignerId);
    const selectedApplicant = taskApplications.find((application) => application.applicantId === selectedDesignerId);

    const updatedTasks = tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            assignedTo: selectedDesignerId,
            status: 'in_progress' as const,
          }
        : task
    );

    const updatedApplications = applications.map((candidate) => {
      if (candidate.taskId !== taskId) {
        return candidate;
      }

      if (selectedApplicant && candidate.id === selectedApplicant.id) {
        return {
          ...candidate,
          status: 'assigned' as const,
          reviewedBy: user.id,
          reviewedByName: user.name,
          reviewedAt: now,
          reviewNote: `Assigned to ${assignedDesignerName}.`,
        };
      }

      if (candidate.status === 'pending') {
        return {
          ...candidate,
          status: 'rejected' as const,
          reviewedBy: user.id,
          reviewedByName: user.name,
          reviewedAt: now,
          reviewNote: selectedApplicant
            ? `Assigned to ${assignedDesignerName}.`
            : `Assigned to ${assignedDesignerName} (did not apply).`,
        };
      }

      return {
        ...candidate,
        reviewNote: candidate.reviewNote || `Assigned to ${assignedDesignerName}.`,
      };
    });

    persistTasks(updatedTasks);
    persistApplications(updatedApplications);
    setSelectedDesignerByTask((currentState) => {
      const nextState = { ...currentState };
      delete nextState[taskId];
      return nextState;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Task Applications</h2>
          <p className="text-gray-600 mt-1">Review which designer applied, then assign a designer by name if needed.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <Users className="w-4 h-4" />
          Admin and General Manager only
        </div>
      </div>

      {groupedApplications.length > 0 ? (
        <div className="space-y-4">
          {groupedApplications.map(({ task, applications: taskApplications }) => (
            <div key={task.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 space-y-4">
              <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">{task.title}</h3>
                  <p className="text-sm text-gray-500">{task.description}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${task.assignedTo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {task.assignedTo ? 'Assigned' : 'Pending assignment'}
                </span>
              </div>

              <div className="space-y-3">
                {taskApplications.map((application) => (
                  <div key={application.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-3 flex-col sm:flex-row">
                      <div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <p className="font-medium text-gray-900">{application.applicantName}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Applied on {new Date(application.appliedAt).toLocaleString()}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${application.status === 'assigned' ? 'bg-green-100 text-green-700' : application.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {application.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-3">{application.message}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Designer name: {application.applicantName} {application.reviewNote ? `• ${application.reviewNote}` : ''}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-dashed border-blue-300 bg-blue-50 p-4 space-y-4">
                {(() => {
                  const applicantIds = new Set(taskApplications.map((application) => application.applicantId));
                  const applicantOptions = taskApplications.map((application) => ({
                    id: application.applicantId,
                    label: `${application.applicantName} (applied)`,
                  }));
                  const nonApplicantOptions = designerRoster
                    .filter((designer) => !applicantIds.has(designer.id))
                    .map((designer) => ({
                      id: designer.id,
                      label: `${designer.name} (${designer.role}, did not apply)`,
                    }));
                  const assignOptions = [...applicantOptions, ...nonApplicantOptions];

                  return (
                    <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assign designer</label>
                  <select
                    value={selectedDesignerByTask[task.id] || ''}
                    onChange={(event) =>
                      setSelectedDesignerByTask((currentState) => ({
                        ...currentState,
                        [task.id]: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Choose designer</option>
                    {assignOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-500">Includes designers who did not apply for this task.</p>

                <button
                  type="button"
                  onClick={() => handleAssign(task.id, taskApplications)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Assign Designer
                </button>
                    </>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">No designer applications have been submitted yet.</p>
        </div>
      )}
    </div>
  );
}