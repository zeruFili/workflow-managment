import React, { useState, useEffect } from 'react';
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
  ChevronDown,
  ChevronUp,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Send,
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

// ---------- Types ----------
type PhaseKey = 'caseStudy' | 'designStage' | 'rendering' | 'finalStage';

export interface DesignerSubmissionSnapshot {
  note: string;
  screenshot: string | null;
  submittedAt: string;
}

export interface PhaseHistoryEntry {
  status: 'feedback' | 'approved' | 'rejected';
  message: string;
  timestamp: string;
  designerSubmission: DesignerSubmissionSnapshot;
}

export interface PhaseData {
  note: string;
  screenshot: string | null;
  history: PhaseHistoryEntry[];
}

type SubmissionProgress = Record<string, Record<PhaseKey, PhaseData>>;

const PHASES: { key: PhaseKey; label: string }[] = [
  { key: 'caseStudy', label: 'Case Study' },
  { key: 'designStage', label: 'Design Stage' },
  { key: 'rendering', label: 'Rendering' },
  { key: 'finalStage', label: 'Final Stage' },
];

const STORAGE_KEY = 'designer-submission-progress';

// ---------- Helpers ----------
function loadSubmissionProgress(): SubmissionProgress {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? normalizeSubmissionProgress(JSON.parse(stored)) : {};
  } catch {
    return {};
  }
}

function defaultPhase(): PhaseData {
  return { note: '', screenshot: null, history: [] };
}

function createSubmissionScreenshot(phaseLabel: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="480" viewBox="0 0 800 480">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>
      </defs>
      <rect width="800" height="480" fill="url(#bg)" rx="28" />
      <rect x="56" y="56" width="688" height="368" rx="24" fill="#ffffff" fill-opacity="0.06" stroke="#cbd5e1" stroke-opacity="0.18" />
      <text x="400" y="205" fill="#f8fafc" font-size="30" font-family="Arial,Helvetica,sans-serif" text-anchor="middle" font-weight="700">Designer Submission</text>
      <text x="400" y="255" fill="#cbd5e1" font-size="20" font-family="Arial,Helvetica,sans-serif" text-anchor="middle">${phaseLabel}</text>
      <text x="400" y="308" fill="#94a3b8" font-size="15" font-family="Arial,Helvetica,sans-serif" text-anchor="middle">No uploaded screenshot was available, so a placeholder was created.</text>
    </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

function buildDesignerSubmissionSnapshot(
  phaseLabel: string,
  phaseData?: PhaseData,
  submittedAt?: string
): DesignerSubmissionSnapshot {
  const note = phaseData?.note?.trim() || `Designer submission for ${phaseLabel}`;

  return {
    note,
    screenshot: phaseData?.screenshot ?? createSubmissionScreenshot(phaseLabel),
    submittedAt: submittedAt ?? phaseData?.history?.[0]?.timestamp ?? new Date().toISOString(),
  };
}

function normalizeSubmissionProgress(progress: SubmissionProgress): SubmissionProgress {
  const normalized: SubmissionProgress = {};

  for (const [taskId, taskProgress] of Object.entries(progress)) {
    const mergedProgress = {
      caseStudy: defaultPhase(),
      designStage: defaultPhase(),
      rendering: defaultPhase(),
      finalStage: defaultPhase(),
      ...(taskProgress as Record<PhaseKey, PhaseData>),
    };

    normalized[taskId] = {
      caseStudy: {
        ...mergedProgress.caseStudy,
        history: (mergedProgress.caseStudy.history ?? []).map((entry) => ({
          ...entry,
          designerSubmission: entry.designerSubmission
            ?? buildDesignerSubmissionSnapshot('Case Study', mergedProgress.caseStudy, entry.timestamp),
        })),
      },
      designStage: {
        ...mergedProgress.designStage,
        history: (mergedProgress.designStage.history ?? []).map((entry) => ({
          ...entry,
          designerSubmission: entry.designerSubmission
            ?? buildDesignerSubmissionSnapshot('Design Stage', mergedProgress.designStage, entry.timestamp),
        })),
      },
      rendering: {
        ...mergedProgress.rendering,
        history: (mergedProgress.rendering.history ?? []).map((entry) => ({
          ...entry,
          designerSubmission: entry.designerSubmission
            ?? buildDesignerSubmissionSnapshot('Rendering', mergedProgress.rendering, entry.timestamp),
        })),
      },
      finalStage: {
        ...mergedProgress.finalStage,
        history: (mergedProgress.finalStage.history ?? []).map((entry) => ({
          ...entry,
          designerSubmission: entry.designerSubmission
            ?? buildDesignerSubmissionSnapshot('Final Stage', mergedProgress.finalStage, entry.timestamp),
        })),
      },
    };
  }

  return normalized;
}

function defaultTaskProgress(): Record<PhaseKey, PhaseData> {
  return {
    caseStudy: defaultPhase(),
    designStage: defaultPhase(),
    rendering: defaultPhase(),
    finalStage: defaultPhase(),
  };
}

function getCurrentStatus(phase: PhaseData): PhaseHistoryEntry['status'] | 'pending' {
  const history = phase.history ?? [];
  if (history.length === 0) return 'pending';
  return history[history.length - 1].status;
}

function findFirstNonApprovedPhaseIndex(
  phases: typeof PHASES,
  progress: Record<PhaseKey, PhaseData> | null
): number {
  if (!progress) return -1;
  for (let i = 0; i < phases.length; i++) {
    const phaseData = progress[phases[i].key];
    if (phaseData && phaseData.history && phaseData.history.length > 0 && getCurrentStatus(phaseData) !== 'approved') {
      return i;
    }
  }
  return -1;
}

function phaseHasDisplayableContent(p: PhaseData | undefined): boolean {
  if (!p) return false;
  return (p.history && p.history.length > 0) || !!p.screenshot;
}

function getTaskEndStatus(taskId: string): 'approved' | 'feedback' | 'rejected' | 'pending' {
  const charCode = taskId.charCodeAt(taskId.length - 1);
  const mod = charCode % 4;
  if (mod === 0) return 'approved';
  if (mod === 1) return 'feedback';
  if (mod === 2) return 'rejected';
  return 'pending';
}

function generateMockProgress(lastReviewedPhaseIndex: number, taskId?: string): Record<PhaseKey, PhaseData> {
  const progress: Partial<Record<PhaseKey, PhaseData>> = {};
  const endStatus = taskId ? getTaskEndStatus(taskId) : 'approved';

  for (let i = 0; i <= lastReviewedPhaseIndex; i++) {
    const key = PHASES[i].key;
    const isLastPhase = i === lastReviewedPhaseIndex;

    let history: PhaseHistoryEntry[] = [];

    if (isLastPhase) {
      if (endStatus === 'approved') {
        history = [
          { status: 'feedback', message: 'Minor clarifications needed.', timestamp: '2026-05-10T09:00:00Z' },
          { status: 'approved', message: 'Looks good, proceed.', timestamp: '2026-05-10T14:00:00Z' },
        ];
      } else if (endStatus === 'feedback') {
        history = [
          { status: 'feedback', message: 'Minor revisions needed before approval.', timestamp: '2026-05-10T09:00:00Z' },
        ];
      } else if (endStatus === 'rejected') {
        history = [
          { status: 'rejected', message: 'This does not meet requirements.', timestamp: '2026-05-10T09:00:00Z' },
        ];
      } else {
        history = [];
      }
    } else {
      history = [
        { status: 'feedback', message: 'Minor clarifications needed.', timestamp: '2026-05-10T09:00:00Z' },
        { status: 'approved', message: 'Looks good, proceed.', timestamp: '2026-05-10T14:00:00Z' },
      ];
    }

    const designerSubmission = buildDesignerSubmissionSnapshot(PHASES[i].label, {
      note: `Designer note for ${PHASES[i].label}`,
      screenshot: null,
      history,
    });

    progress[key] = {
      note: `Designer note for ${PHASES[i].label}`,
      screenshot: null,
      history: history.map((entry) => ({
        ...entry,
        designerSubmission,
      })),
    };
  }

  for (let i = lastReviewedPhaseIndex + 1; i < PHASES.length; i++) {
    progress[PHASES[i].key] = defaultPhase();
  }
  return progress as Record<PhaseKey, PhaseData>;
}

function getTaskMockPhaseIndex(task: DesignerTask): number {
  if (task.id === 'dtask-1') return 0;
  const charCode = task.id.charCodeAt(task.id.length - 1);
  return 1 + (charCode % 3);
}

function getLastPopulatedPhaseIndex(progress: Record<PhaseKey, PhaseData> | null): number {
  if (!progress) return -1;
  for (let i = PHASES.length - 1; i >= 0; i--) {
    if (phaseHasDisplayableContent(progress[PHASES[i].key])) {
      return i;
    }
  }
  return -1;
}

// -----------------------------------------------

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

  const [submissionProgress, setSubmissionProgress] = useState<SubmissionProgress>(loadSubmissionProgress);
  const [expandedPhase, setExpandedPhase] = useState<PhaseKey | null>(null);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, Record<PhaseKey, string>>>({});
  const [expandedHistoryIdx, setExpandedHistoryIdx] = useState<Record<string, Record<PhaseKey, number | null>>>({});

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(submissionProgress));
  }, [submissionProgress]);

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
      setNewTask({ ...newTask, telegramScreenshot: reader.result as string });
      setNewTaskImagePreview(reader.result as string);
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
    setExpandedPhase('caseStudy');

    setSubmissionProgress((prev) => {
      const existing = prev[task.id];
      const hasContent =
        existing &&
        Object.values(existing).some(
          (p) => phaseHasDisplayableContent(p)
        );
      const lastPopulatedIndex = getLastPopulatedPhaseIndex(existing ?? null);
      const shouldSeedProgress =
        !hasContent || (task.id !== 'dtask-1' && lastPopulatedIndex <= 0);

      if (shouldSeedProgress) {
        const phaseIndex = getTaskMockPhaseIndex(task);
        const mockProgress = generateMockProgress(phaseIndex, task.id);
        return { ...prev, [task.id]: mockProgress };
      }
      return prev;
    });

    setFeedbackDrafts((prev) => ({
      ...prev,
      [task.id]: { caseStudy: '', designStage: '', rendering: '', finalStage: '' },
    }));
    setExpandedHistoryIdx((prev) => ({
      ...prev,
      [task.id]: { caseStudy: null, designStage: null, rendering: null, finalStage: null },
    }));
  };

  const closeDetail = () => {
    setSelectedTaskDetail(null);
    setShowDetail(false);
    setExpandedPhase(null);
  };

  const addHistoryEntry = (taskId: string, phase: PhaseKey, entry: PhaseHistoryEntry) => {
    setSubmissionProgress((prev) => {
      const taskProgress = prev[taskId] ?? defaultTaskProgress();
      const phaseData = taskProgress[phase] ?? defaultPhase();
      const phaseLabel = PHASES.find((candidate) => candidate.key === phase)?.label ?? phase;
      const designerSubmission = buildDesignerSubmissionSnapshot(phaseLabel, phaseData, entry.timestamp);
      return {
        ...prev,
        [taskId]: {
          ...taskProgress,
          [phase]: {
            ...phaseData,
            history: [
              ...(phaseData.history || []),
              {
                ...entry,
                designerSubmission,
              },
            ],
          },
        },
      };
    });
  };

  const resetPhaseHistory = (taskId: string, phase: PhaseKey) => {
    setSubmissionProgress((prev) => {
      const taskProgress = prev[taskId];
      if (!taskProgress) return prev;
      return {
        ...prev,
        [taskId]: {
          ...taskProgress,
          [phase]: {
            ...taskProgress[phase],
            history: [],
          },
        },
      };
    });
  };

  const getDisplayProgress = (taskId: string): Record<PhaseKey, PhaseData> => {
    const realProgress = submissionProgress[taskId];
    if (realProgress) {
      const hasAnyContent = Object.values(realProgress).some(
        (p) => phaseHasDisplayableContent(p)
      );
      if (hasAnyContent) return realProgress;
    }
    return defaultTaskProgress();
  };

  // ---------- Review actions ----------
  const handleSubmitFeedback = (taskId: string, phase: PhaseKey) => {
    const draft = feedbackDrafts[taskId]?.[phase]?.trim();
    if (!draft) {
      alert('Please enter a feedback message.');
      return;
    }
    addHistoryEntry(taskId, phase, {
      status: 'feedback',
      message: draft,
      timestamp: new Date().toISOString(),
    });
    setFeedbackDrafts((prev) => ({ ...prev, [taskId]: { ...prev[taskId], [phase]: '' } }));
  };

  const handleApprove = (taskId: string, phase: PhaseKey) => {
    const draft = feedbackDrafts[taskId]?.[phase]?.trim() || '';
    addHistoryEntry(taskId, phase, {
      status: 'approved',
      message: draft,
      timestamp: new Date().toISOString(),
    });
    setFeedbackDrafts((prev) => ({ ...prev, [taskId]: { ...prev[taskId], [phase]: '' } }));
  };

  const handleReject = (taskId: string, phase: PhaseKey) => {
    const draft = feedbackDrafts[taskId]?.[phase]?.trim();
    if (!draft) {
      alert('A feedback message is required to reject.');
      return;
    }
    addHistoryEntry(taskId, phase, {
      status: 'rejected',
      message: draft,
      timestamp: new Date().toISOString(),
    });
    setFeedbackDrafts((prev) => ({ ...prev, [taskId]: { ...prev[taskId], [phase]: '' } }));
  };

  const handleReset = (taskId: string, phase: PhaseKey) => {
    resetPhaseHistory(taskId, phase);
    setFeedbackDrafts((prev) => ({ ...prev, [taskId]: { ...prev[taskId], [phase]: '' } }));
  };

  const updateDraft = (taskId: string, phase: PhaseKey, text: string) => {
    setFeedbackDrafts((prev) => ({ ...prev, [taskId]: { ...prev[taskId], [phase]: text } }));
  };

  const toggleHistoryEntry = (taskId: string, phase: PhaseKey, idx: number) => {
    setExpandedHistoryIdx((prev) => {
      const taskIdx = prev[taskId] ?? {
        caseStudy: null,
        designStage: null,
        rendering: null,
        finalStage: null,
      };
      return {
        ...prev,
        [taskId]: {
          ...taskIdx,
          [phase]: taskIdx[phase] === idx ? null : idx,
        },
      };
    });
  };

  const currentProgress = selectedTaskDetail
    ? getDisplayProgress(selectedTaskDetail.id)
    : null;

  const lastPopulatedIdx = getLastPopulatedPhaseIndex(currentProgress);
  const visiblePhases = lastPopulatedIdx >= 0 ? PHASES.slice(0, lastPopulatedIdx + 1).filter(
    (phase) => phaseHasDisplayableContent(currentProgress?.[phase.key])
  ) : [];

  // Find the first phase that is not approved (feedback or rejected) – later phases are hidden
  const stopIdx = findFirstNonApprovedPhaseIndex(PHASES, currentProgress);

  const assignedTasks = tasks.filter((task) => !!task.assignedTo);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-col md:flex-row">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Designer Assignments</h2>
          <p className="text-gray-600 mt-1">
            Manage created designer tasks, assignments, and progress updates.
          </p>
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

      {/* Task Cards */}
      {assignedTasks.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No assigned designer tasks yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {assignedTasks.map((task) => {
            const project = mockProjects.find((candidate) => candidate.id === task.projectId);
            const isEditing = editingTask === task.id;
            const isOverdue =
              task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed';

            // Determine current phase info from submission progress
            const progress = getDisplayProgress(task.id);
            const stopIdx = findFirstNonApprovedPhaseIndex(PHASES, progress);
            let currentPhaseKey: PhaseKey | null = null;
            let currentPhaseLabel = '';
            let currentPhaseStatus: PhaseHistoryEntry['status'] | 'pending' = 'pending';

            if (stopIdx !== -1) {
              currentPhaseKey = PHASES[stopIdx].key;
              currentPhaseLabel = PHASES[stopIdx].label;
              currentPhaseStatus = getCurrentStatus(progress[currentPhaseKey]);
            } else {
              const lastPopulatedIdx = getLastPopulatedPhaseIndex(progress);
              if (lastPopulatedIdx >= 0) {
                currentPhaseKey = PHASES[lastPopulatedIdx].key;
                currentPhaseLabel = PHASES[lastPopulatedIdx].label;
                currentPhaseStatus = getCurrentStatus(progress[currentPhaseKey]);
              }
            }

            return (
              <div
                key={task.id}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3 gap-3">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{task.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Assigned to: {getTaskAssigneeLabel(task.assignedTo)}
                    </p>
                  </div>
                  {/* UPDATED STATUS BADGE */}
                  {currentPhaseKey ? (
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                        currentPhaseStatus === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : currentPhaseStatus === 'feedback'
                          ? 'bg-yellow-100 text-yellow-700'
                          : currentPhaseStatus === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {currentPhaseLabel} -{' '}
                      {currentPhaseStatus === 'approved'
                        ? 'Approved'
                        : currentPhaseStatus === 'feedback'
                        ? 'Feedback Given'
                        : currentPhaseStatus === 'rejected'
                        ? 'Rejected'
                        : 'Pending Review'}
                    </span>
                  ) : (
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
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
                    Story Points: {task.storyPoints}
                  </span>
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

                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                    Work Instruction
                  </p>
                  <p className="text-sm text-gray-700 mt-1">{task.instruction}</p>
                </div>

                <button
                  onClick={() => openDetail(task)}
                  className="mb-4 text-sm text-blue-600 hover:underline"
                >
                  Open Submission Detail
                </button>

                {/* NEW: Last Phase Status from Submission Progress */}
                {(() => {
                  const progress = getDisplayProgress(task.id);
                  const stopIdx = findFirstNonApprovedPhaseIndex(PHASES, progress);
                  const lastPopulated = getLastPopulatedPhaseIndex(progress);
                  const displayIdx = stopIdx !== -1 ? stopIdx : lastPopulated;
                  if (displayIdx === -1) return null;
                  const phaseKey = PHASES[displayIdx].key;
                  const phaseLabel = PHASES[displayIdx].label;
                  const phaseData = progress[phaseKey];
                  if (!phaseData || !phaseData.history || phaseData.history.length === 0) return null;
                  const latest = phaseData.history[phaseData.history.length - 1];
                  const status = latest.status;
                  const message = latest.message;
                  const isApproved = status === 'approved';
                  const isRejected = status === 'rejected';
                  const isFeedback = status === 'feedback';
                  const BadgeIcon = isApproved ? CheckCircle2 : isRejected ? XCircle : AlertCircle;
                  const containerColor = isApproved
                    ? 'bg-green-50 border-green-200'
                    : isRejected
                    ? 'bg-red-50 border-red-200'
                    : 'bg-yellow-50 border-yellow-200';
                  const textColor = isApproved
                    ? 'text-green-700'
                    : isRejected
                    ? 'text-red-700'
                    : 'text-yellow-700';
                  const iconColor = isApproved
                    ? 'text-green-600'
                    : isRejected
                    ? 'text-red-600'
                    : 'text-yellow-600';
                  const displayLabel = isApproved
                    ? `${phaseLabel} - Approved`
                    : isFeedback
                    ? 'Feedback'
                    : `${phaseLabel} - Rejected`;
                  return (
                    <div className={`mb-4 p-3 rounded-lg border ${containerColor}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <BadgeIcon className={`w-4 h-4 ${iconColor}`} />
                        <p className={`text-sm font-medium ${textColor}`}>{displayLabel}</p>
                      </div>
                      {message && (
                        <p className="text-sm text-gray-700 italic">"{message}"</p>
                      )}
                    </div>
                  );
                })()}

                {project && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Project</p>
                    <p className="font-medium text-gray-900 mt-1">{project.name}</p>
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  {task.deadline && (
                    <div
                      className={`flex items-center gap-2 ${
                        isOverdue ? 'text-red-600' : 'text-gray-500'
                      }`}
                    >
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
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && selectedTaskDetail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 py-6 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">Submission Detail</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Review designer submissions and provide feedback
                </p>
              </div>
              <button onClick={closeDetail} className="rounded-lg p-2 hover:bg-gray-100">
                <XCircle className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 px-6 py-5 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-5">
                {/* Task Info */}
                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900">
                        {selectedTaskDetail.title}
                      </h4>
                      <p className="mt-1 text-sm text-gray-500">ID: {selectedTaskDetail.id}</p>
                    </div>
                    <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">
                      Story Points: {selectedTaskDetail.storyPoints}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                      Created by{' '}
                      {roleNamesByUserId[selectedTaskDetail.assignedBy] ??
                        `User ${selectedTaskDetail.assignedBy}`}
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
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">
                    Description
                  </h5>
                  <p className="mt-2 text-sm text-gray-700">{selectedTaskDetail.description}</p>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">
                    Work Instruction
                  </h5>
                  <p className="mt-2 text-sm text-gray-700">{selectedTaskDetail.instruction}</p>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">
                    Telegram Evidence
                  </h5>
                  {(selectedTaskDetail as any).telegramScreenshot ? (
                    <img
                      src={(selectedTaskDetail as any).telegramScreenshot}
                      alt="telegram evidence"
                      className="mt-3 w-full max-h-72 rounded-lg border object-contain"
                    />
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">No Telegram evidence attached.</p>
                  )}
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">
                    Submission Entries
                  </h5>
                  <div className="mt-3 space-y-3">
                    {selectedTaskDetail.submissions &&
                    selectedTaskDetail.submissions.length > 0 ? (
                      selectedTaskDetail.submissions
                        .slice()
                        .reverse()
                        .map((s) => (
                          <div
                            key={s.id}
                            className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {s.metadata?.progressType ?? 'Update'}
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                  {s.submittedByName ?? s.submittedBy} •{' '}
                                  {new Date(s.submittedAt).toLocaleString()}
                                </p>
                              </div>
                              {s.attachments && s.attachments[0] && (
                                <img
                                  src={s.attachments[0]}
                                  alt="submission attachment"
                                  className="w-20 h-14 object-cover rounded-md border"
                                />
                              )}
                            </div>
                            {s.notes && (
                              <p className="mt-2 text-sm text-gray-700 italic">"{s.notes}"</p>
                            )}
                          </div>
                        ))
                    ) : (
                      <p className="text-sm text-gray-500">No submissions yet.</p>
                    )}
                  </div>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">
                    Communication History
                  </h5>
                  <div className="mt-3 space-y-3">
                    {applications
                      .filter((app) => app.taskId === selectedTaskDetail.id)
                      .sort(
                        (a, b) =>
                          new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime()
                      )
                      .map((app) => (
                        <div
                          key={app.id}
                          className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-gray-900">
                              {app.applicantName}
                            </p>
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
                          <p className="mt-1 text-xs text-gray-500">
                            Applied {new Date(app.appliedAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    {applications.filter((app) => app.taskId === selectedTaskDetail.id)
                      .length === 0 && (
                      <p className="text-sm text-gray-500">
                        No applications or communication notes yet.
                      </p>
                    )}
                  </div>
                </section>

                {/* Submission Progress & Review – UPDATED LOGIC */}
                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-4">
                    Submission Progress & Review
                  </h5>

                  {/* Last Phase Status Summary */}
                  {(() => {
                    const displayPhaseIdx = stopIdx !== -1 ? stopIdx : lastPopulatedIdx;
                    if (displayPhaseIdx === -1) return null;
                    const phaseKey = PHASES[displayPhaseIdx].key;
                    const phaseLabel = PHASES[displayPhaseIdx].label;
                    const phaseData = currentProgress?.[phaseKey];
                    if (!phaseData) return null;
                    const history = phaseData.history ?? [];
                    if (history.length === 0) return null;
                    const latestEntry = history[history.length - 1];
                    const status = latestEntry.status;
                    const message = latestEntry.message;
                    const isApproved = status === 'approved';
                    const isRejected = status === 'rejected';
                    const isFeedback = status === 'feedback';
                    const BadgeIcon = isApproved ? CheckCircle2 : isRejected ? XCircle : AlertCircle;
                    const badgeColor = isApproved
                      ? 'bg-green-100 text-green-700'
                      : isRejected
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700';
                    const statusLabel = isApproved
                      ? 'Approved'
                      : isRejected
                      ? 'Rejected'
                      : 'Feedback';
                    const displayLabel = isApproved
                      ? `${phaseLabel} - Approved`
                      : isFeedback
                      ? 'Feedback'
                      : `${phaseLabel} - Rejected`;
                    return (
                      <div
                        className={`p-4 rounded-lg border mb-4 ${
                          isApproved
                            ? 'bg-green-50 border-green-200'
                            : isRejected
                            ? 'bg-red-50 border-red-200'
                            : 'bg-yellow-50 border-yellow-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <BadgeIcon
                            className={`w-4 h-4 ${
                              isApproved
                                ? 'text-green-600'
                                : isRejected
                                ? 'text-red-600'
                                : 'text-yellow-600'
                            }`}
                          />
                          <p className="text-sm font-medium text-gray-800">{displayLabel}</p>
                        </div>
                        {message && (
                          <p className="text-sm text-gray-700 italic">"{message}"</p>
                        )}
                      </div>
                    );
                  })()}

                  {visiblePhases.length === 0 ? (
                    <p className="text-sm text-gray-500">No submission data yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {visiblePhases.map((phase, idx) => {
                        if (stopIdx !== -1 && idx > stopIdx) return null;

                        const taskId = selectedTaskDetail.id;
                        const phaseData = currentProgress?.[phase.key] ?? defaultPhase();
                        const isExpanded = expandedPhase === phase.key;
                        const currentStatus = getCurrentStatus(phaseData);
                        const history = phaseData.history || [];
                        const draft = feedbackDrafts[taskId]?.[phase.key] ?? '';
                        const taskHistoryIdx = expandedHistoryIdx[taskId]?.[phase.key];

                        const statusBadge = {
                          feedback: {
                            label: 'Feedback Given',
                            icon: MessageSquare,
                            color: 'bg-yellow-100 text-yellow-700',
                          },
                          approved: {
                            label: 'Approved',
                            icon: ThumbsUp,
                            color: 'bg-green-100 text-green-700',
                          },
                          rejected: {
                            label: 'Rejected',
                            icon: ThumbsDown,
                            color: 'bg-red-100 text-red-700',
                          },
                          pending: {
                            label: 'Pending Review',
                            icon: Clock,
                            color: 'bg-blue-100 text-blue-700',
                          },
                        }[currentStatus];

                        return (
                          <div
                            key={phase.key}
                            className="border border-gray-200 rounded-lg overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => setExpandedPhase(isExpanded ? null : phase.key)}
                              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-medium text-gray-800">{phase.label}</span>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.color}`}
                                >
                                  <statusBadge.icon className="w-3 h-3" />
                                  {statusBadge.label}
                                </span>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-gray-500" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                              )}
                            </button>

                            {isExpanded && (
                              <div className="p-4 space-y-4 bg-white">
                                {/* Designer's Progress Note */}
                                <div>
                                  <h6 className="text-sm font-medium text-gray-700 mb-1">
                                    Designer's Progress Note
                                  </h6>
                                  {phaseData.note ? (
                                    <div className="text-sm text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100 whitespace-pre-wrap">
                                      {phaseData.note}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-400 italic">
                                      No progress note submitted.
                                    </p>
                                  )}
                                </div>

                                {/* Telegram Screenshot */}
                                <div>
                                  <h6 className="text-sm font-medium text-gray-700 mb-1">
                                    Telegram Screenshot{' '}
                                    {phase.key === 'finalStage' && (
                                      <span className="text-red-500">(required)</span>
                                    )}
                                    {phase.key !== 'finalStage' && (
                                      <span className="text-gray-400 text-xs ml-1">(optional)</span>
                                    )}
                                  </h6>
                                  {phaseData.screenshot ? (
                                    <div className="mt-2">
                                      <img
                                        src={phaseData.screenshot}
                                        alt={`${phase.label} evidence`}
                                        className="max-w-full h-auto max-h-64 rounded-lg border object-contain"
                                      />
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-400 italic">
                                      {phase.key === 'finalStage'
                                        ? 'No screenshot provided (required for final stage).'
                                        : 'No screenshot provided.'}
                                    </p>
                                  )}
                                </div>

                                {/* Prior Feedback Messages */}
                                {history.length > 0 && (
                                  <div className="border-t border-gray-100 pt-4">
                                    <h6 className="text-sm font-medium text-gray-700 mb-2">
                                      Prior Feedback Messages
                                    </h6>
                                    <div className="space-y-2">
                                      {history.map((entry, idxEntry) => {
                                        const isEntryExpanded = taskHistoryIdx === idxEntry;
                                        const entryBadge =
                                          entry.status === 'feedback'
                                            ? 'Feedback Given'
                                            : entry.status.charAt(0).toUpperCase() +
                                              entry.status.slice(1);
                                        const EntryIcon =
                                          entry.status === 'approved'
                                            ? ThumbsUp
                                            : entry.status === 'rejected'
                                            ? ThumbsDown
                                            : MessageSquare;
                                        const entryColor =
                                          entry.status === 'approved'
                                            ? 'bg-green-100 text-green-700'
                                            : entry.status === 'rejected'
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-yellow-100 text-yellow-700';

                                        return (
                                          <div
                                            key={idxEntry}
                                            className="border border-gray-200 rounded-lg overflow-hidden"
                                          >
                                            <button
                                              type="button"
                                              onClick={() =>
                                                toggleHistoryEntry(taskId, phase.key, idxEntry)
                                              }
                                              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
                                            >
                                              <div className="flex items-center gap-2">
                                                <span
                                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${entryColor}`}
                                                >
                                                  <EntryIcon className="w-3 h-3" />
                                                  {entryBadge}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                  {new Date(entry.timestamp).toLocaleString()}
                                                </span>
                                              </div>
                                              {isEntryExpanded ? (
                                                <ChevronUp className="w-4 h-4 text-gray-500" />
                                              ) : (
                                                <ChevronDown className="w-4 h-4 text-gray-500" />
                                              )}
                                            </button>
                                            {isEntryExpanded && (
                                              <div className="p-3 bg-white space-y-3">
                                                <p className="text-sm text-gray-800 whitespace-pre-wrap font-medium">
                                                  "{entry.message}"
                                                </p>
                                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                                    Designer's Submission at this point
                                                  </p>
                                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                                    {entry.designerSubmission.note || (
                                                      <span className="italic text-gray-400">
                                                        No note
                                                      </span>
                                                    )}
                                                  </p>
                                                  {entry.designerSubmission.screenshot ? (
                                                    <img
                                                      src={entry.designerSubmission.screenshot}
                                                      alt="designer screenshot"
                                                      className="mt-2 max-w-full h-auto max-h-40 rounded border object-contain"
                                                    />
                                                  ) : (
                                                    <p className="text-xs text-gray-400 italic mt-1">
                                                      No screenshot
                                                    </p>
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Review Actions */}
                                <div className="border-t border-gray-100 pt-4">
                                  <h6 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4" />
                                    Your Review & Decision
                                  </h6>
                                  <div className="mb-3">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                      Add new message/reason
                                    </label>
                                    <textarea
                                      rows={3}
                                      value={draft}
                                      onChange={(e) =>
                                        updateDraft(taskId, phase.key, e.target.value)
                                      }
                                      placeholder="Your feedback or reason..."
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    />
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {currentStatus !== 'approved' && (
                                      <button
                                        onClick={() => handleApprove(taskId, phase.key)}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-300 hover:bg-green-100 transition-colors"
                                      >
                                        <ThumbsUp className="w-3.5 h-3.5" /> Approve
                                      </button>
                                    )}
                                    {currentStatus !== 'rejected' && (
                                      <button
                                        onClick={() => handleReject(taskId, phase.key)}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-300 hover:bg-red-100 transition-colors"
                                      >
                                        <ThumbsDown className="w-3.5 h-3.5" /> Reject
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleSubmitFeedback(taskId, phase.key)}
                                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100 transition-colors"
                                    >
                                      <Send className="w-3.5 h-3.5" /> Submit Feedback
                                    </button>
                                    {history.length > 0 && (
                                      <button
                                        onClick={() => handleReset(taskId, phase.key)}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                                      >
                                        Clear Review
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>

              {/* Sidebar */}
              <aside className="space-y-4">
                {selectedTaskDetail.approvalStatus && (
                  <section className="rounded-xl border border-gray-200 bg-white p-4">
                    <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">
                      Overall Approval
                    </h5>
                    <p className="mt-2 text-sm text-gray-700">
                      {selectedTaskDetail.approvalStatus}
                    </p>
                    {selectedTaskDetail.approvalFeedback && (
                      <p className="mt-2 text-sm text-gray-600 italic">
                        "{selectedTaskDetail.approvalFeedback}"
                      </p>
                    )}
                  </section>
                )}

                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">
                    Timeline
                  </h5>
                  <div className="mt-2 space-y-2 text-sm text-gray-700">
                    <p>
                      Deadline:{' '}
                      {selectedTaskDetail.deadline
                        ? new Date(selectedTaskDetail.deadline).toLocaleDateString()
                        : 'No deadline'}
                    </p>
                    <p>
                      Created: {new Date(selectedTaskDetail.createdAt).toLocaleDateString()}
                    </p>
                    <p>
                      Assigned by:{' '}
                      {roleNamesByUserId[selectedTaskDetail.assignedBy] ??
                        `User ${selectedTaskDetail.assignedBy}`}
                    </p>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateTask && canCreateTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Create Available Designer Task</h3>
            <p className="text-sm text-gray-600 mb-4">
              This task will be visible to designers so they can apply for it.
            </p>
            <form className="space-y-4" onSubmit={createTask}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Title
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={newTask.description}
                  onChange={(event) =>
                    setNewTask({ ...newTask, description: event.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe the work to be done"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Story Points
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newTask.storyPoints}
                  onChange={(event) =>
                    setNewTask({ ...newTask, storyPoints: event.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter story points"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telegram Screenshot (optional)
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-700">
                    <Image className="w-4 h-4" />
                    Choose Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleNewTaskImageUpload}
                      className="hidden"
                    />
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
                    <img
                      src={newTaskImagePreview}
                      alt="preview"
                      className="max-w-full h-auto max-h-48 rounded-lg border object-contain"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instruction
                </label>
                <textarea
                  rows={4}
                  value={newTask.instruction}
                  onChange={(event) =>
                    setNewTask({ ...newTask, instruction: event.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe what the designer must collect or measure"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
                <select
                  value={newTask.projectId}
                  onChange={(event) =>
                    setNewTask({ ...newTask, projectId: event.target.value })
                  }
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
                  onChange={(event) =>
                    setNewTask({ ...newTask, deadline: event.target.value })
                  }
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
    </div>
  );
}

export default DesignerAssignments;