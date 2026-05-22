import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { mockProjects } from '../data/mockData';
import {
  designerRoles,
  getTaskAssigneeLabel,
  loadDesignerTasks,
  roleNamesByUserId,
} from './designerTaskShared';
import { DesignerTask } from '../types';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Image,
  XCircle,
  Briefcase,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';

// ---------- Types (mirror DesignerAssignments) ----------
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

// ---------- Helpers (identical to DesignerAssignments) ----------
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

function getLastPopulatedPhaseIndex(progress: Record<PhaseKey, PhaseData> | null): number {
  if (!progress) return -1;
  for (let i = PHASES.length - 1; i >= 0; i--) {
    if (phaseHasDisplayableContent(progress[PHASES[i].key])) {
      return i;
    }
  }
  return -1;
}

// NEW: Check if any phase in the task has been rejected
function isTaskRejected(progress: Record<PhaseKey, PhaseData> | null): boolean {
  if (!progress) return false;
  for (const phase of PHASES) {
    const data = progress[phase.key];
    if (data && data.history && data.history.length > 0) {
      if (getCurrentStatus(data) === 'rejected') {
        return true;
      }
    }
  }
  return false;
}

// -----------------------------------------------

export function DesignerTasks() {
  const { user } = useAuth();
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<DesignerTask | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [tasks, setTasks] = useState<DesignerTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const seededRef = useRef(false);

  const [submissionProgress, setSubmissionProgress] = useState<SubmissionProgress>({});

  const [expandedPhase, setExpandedPhase] = useState<PhaseKey | null>(null);
  const [expandedHistoryIdx, setExpandedHistoryIdx] = useState<Record<string, Record<PhaseKey, number | null>>>({});

  // Draft state for Open Submission
  const [draftNotes, setDraftNotes] = useState<Record<string, Record<PhaseKey, string>>>({});
  const [draftScreenshots, setDraftScreenshots] = useState<Record<string, Record<PhaseKey, string | null>>>({});

  // Seed demo tasks and varied submission progress for a rich card set
  useEffect(() => {
    if (!user || seededRef.current) return;
    seededRef.current = true;

    // Load existing tasks
    let existingTasks = loadDesignerTasks();
    const userAssigned = existingTasks.filter((t) => t.assignedTo === user.id);
    if (userAssigned.length < 8) {
      const demosNeeded = 8 - userAssigned.length;
      const newDemos: DesignerTask[] = [];
      for (let i = 1; i <= demosNeeded; i++) {
        const taskId = `demo-task-${Date.now()}-${i}`;
        if (existingTasks.some((t) => t.id === taskId)) continue;
        newDemos.push({
          id: taskId,
          projectId: mockProjects[0]?.id || 'proj-1',
          title: `Demo Task ${i}`,
          description: `Description for demo task ${i}.`,
          instruction: `Please collect data for demo task ${i}.`,
          storyPoints: i * 2,
          assignedBy: 'gm-1',
          assignedTo: user.id,
          status: i % 2 === 0 ? 'in_progress' : 'pending',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
        });
      }
      existingTasks = [...existingTasks, ...newDemos];
      localStorage.setItem('designer-tasks', JSON.stringify(existingTasks));
    }
    setTasks(existingTasks);

    // Seed varied submission progress for every task
    const storedProgress = loadSubmissionProgress();
    const updatedProgress = { ...storedProgress };
    let progressChanged = false;

    existingTasks.forEach((task, idx) => {
      if (!updatedProgress[task.id]) {
        const phaseProgress: Partial<Record<PhaseKey, PhaseData>> = {};
        const pattern = idx % 5;

        const createHistoryEntry = (status: PhaseHistoryEntry['status'], message: string, label: string): PhaseHistoryEntry => ({
          status,
          message,
          timestamp: new Date().toISOString(),
          designerSubmission: buildDesignerSubmissionSnapshot(label),
        });

        if (pattern === 1) {
          phaseProgress.caseStudy = {
            note: 'Case study completed.',
            screenshot: null,
            history: [createHistoryEntry('approved', 'Looks good.', 'Case Study')],
          };
          phaseProgress.designStage = {
            note: 'Design draft.',
            screenshot: null,
            history: [createHistoryEntry('feedback', 'Please revise layout.', 'Design Stage')],
          };
        } else if (pattern === 2) {
          phaseProgress.caseStudy = {
            note: 'Case study done.',
            screenshot: null,
            history: [createHistoryEntry('approved', 'Perfect.', 'Case Study')],
          };
          phaseProgress.designStage = {
            note: 'Design final.',
            screenshot: null,
            history: [createHistoryEntry('rejected', 'Does not meet standards.', 'Design Stage')],
          };
        } else if (pattern === 3) {
          phaseProgress.caseStudy = {
            note: 'Initial case study.',
            screenshot: null,
            history: [createHistoryEntry('feedback', 'Add more details.', 'Case Study')],
          };
        } else if (pattern === 4) {
          phaseProgress.caseStudy = {
            note: 'Case study done.',
            screenshot: null,
            history: [createHistoryEntry('approved', 'Approved.', 'Case Study')],
          };
          phaseProgress.designStage = {
            note: 'Design draft.',
            screenshot: null,
            history: [createHistoryEntry('approved', 'Looks great.', 'Design Stage')],
          };
          phaseProgress.rendering = {
            note: 'Rendering preview.',
            screenshot: null,
            history: [createHistoryEntry('feedback', 'Adjust colors.', 'Rendering')],
          };
        }
        // pattern 0 leaves everything as default (pending)

        PHASES.forEach((phase) => {
          if (!phaseProgress[phase.key]) phaseProgress[phase.key] = defaultPhase();
        });
        updatedProgress[task.id] = phaseProgress as Record<PhaseKey, PhaseData>;
        progressChanged = true;
      }
    });

    if (progressChanged) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProgress));
    }
    setSubmissionProgress(updatedProgress);
    setIsLoading(false);
  }, [user]);

  // Persist progress on any change (e.g., after designer submission)
  useEffect(() => {
    if (Object.keys(submissionProgress).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(submissionProgress));
    }
  }, [submissionProgress]);

  if (!user) return null;
  if (!designerRoles.has(user.role)) {
    return (
      <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">Access denied. Designer and Design Team Leader only.</p>
      </div>
    );
  }

  const getDisplayProgress = (taskId: string): Record<PhaseKey, PhaseData> => {
    return submissionProgress[taskId] || {
      caseStudy: defaultPhase(),
      designStage: defaultPhase(),
      rendering: defaultPhase(),
      finalStage: defaultPhase(),
    };
  };

  const openDetail = (task: DesignerTask) => {
    setSelectedTaskDetail(task);
    const progress = getDisplayProgress(task.id);
    const notesDraft: Record<PhaseKey, string> = {} as Record<PhaseKey, string>;
    const screenshotsDraft: Record<PhaseKey, string | null> = {} as Record<PhaseKey, string | null>;
    PHASES.forEach((p) => {
      notesDraft[p.key] = progress[p.key]?.note || '';
      screenshotsDraft[p.key] = null;
    });
    setDraftNotes({ ...draftNotes, [task.id]: notesDraft });
    setDraftScreenshots({ ...draftScreenshots, [task.id]: screenshotsDraft });
    setExpandedPhase('caseStudy');
    setExpandedHistoryIdx((prev) => ({
      ...prev,
      [task.id]: { caseStudy: null, designStage: null, rendering: null, finalStage: null },
    }));
    setShowDetail(true);
  };

  const closeDetail = () => {
    setSelectedTaskDetail(null);
    setShowDetail(false);
    setExpandedPhase(null);
  };

  const handleSubmitPhaseProgress = (taskId: string, phase: PhaseKey) => {
    const note = draftNotes[taskId]?.[phase] ?? '';
    const newScreenshot = draftScreenshots[taskId]?.[phase] ?? null;

    setSubmissionProgress((prev) => {
      const taskProgress = prev[taskId] ?? getDisplayProgress(taskId);
      const updatedPhase: PhaseData = {
        ...taskProgress[phase],
        note: note.trim(),
        screenshot: newScreenshot ?? taskProgress[phase].screenshot,
      };
      return {
        ...prev,
        [taskId]: {
          ...taskProgress,
          [phase]: updatedPhase,
        },
      };
    });

    setDraftScreenshots((prev) => ({
      ...prev,
      [taskId]: { ...prev[taskId], [phase]: null },
    }));
  };

  const handleFileChange = (taskId: string, phase: PhaseKey, file: File | undefined) => {
    if (!file) {
      setDraftScreenshots((prev) => ({
        ...prev,
        [taskId]: { ...prev[taskId], [phase]: null },
      }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDraftScreenshots((prev) => ({
        ...prev,
        [taskId]: { ...prev[taskId], [phase]: reader.result as string },
      }));
    };
    reader.readAsDataURL(file);
  };

  const toggleHistoryEntry = (taskId: string, phase: PhaseKey, idx: number) => {
    setExpandedHistoryIdx((prev) => {
      const taskIdx = prev[taskId] ?? { caseStudy: null, designStage: null, rendering: null, finalStage: null };
      return {
        ...prev,
        [taskId]: {
          ...taskIdx,
          [phase]: taskIdx[phase] === idx ? null : idx,
        },
      };
    });
  };

  const getCurrentPhaseInfo = (taskId: string) => {
    const progress = getDisplayProgress(taskId);
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
    return { currentPhaseKey, currentPhaseLabel, currentPhaseStatus };
  };

  const assignedTasks = tasks.filter((task) => !!task.assignedTo);
  const visibleAssignedTasks = user.role === 'designer'
    ? assignedTasks.filter((task) => task.assignedTo === user.id)
    : assignedTasks;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-col md:flex-row">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Designer Tasks</h2>
          <p className="text-gray-600 mt-1">Submit your work and view feedback on assigned tasks.</p>
        </div>
      </div>

      {visibleAssignedTasks.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No assigned designer tasks yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visibleAssignedTasks.map((task) => {
            const project = mockProjects.find((c) => c.id === task.projectId);
            const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed';
            const { currentPhaseKey, currentPhaseLabel, currentPhaseStatus } = getCurrentPhaseInfo(task.id);

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
                  {/* Phase status badge */}
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
                  <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Work Instruction</p>
                  <p className="text-sm text-gray-700 mt-1">{task.instruction}</p>
                </div>

                <button
                  onClick={() => openDetail(task)}
                  className="mb-4 text-sm text-blue-600 hover:underline"
                >
                  Open Submission Detail
                </button>

                {/* Last Phase Status Summary */}
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
                    <div className={`flex items-center gap-2 ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                      <Calendar className="w-4 h-4" />
                      <span>Due: {new Date(task.deadline).toLocaleDateString()}{isOverdue && ' (Overdue)'}</span>
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

      {/* Detail Modal (Designer's editable view – identical layout to Assignments page) */}
      {showDetail && selectedTaskDetail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 py-6 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">Submission Detail</h3>
                <p className="mt-1 text-sm text-gray-500">Submit your work and view feedback</p>
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
                      <h4 className="text-xl font-semibold text-gray-900">{selectedTaskDetail.title}</h4>
                      <p className="mt-1 text-sm text-gray-500">ID: {selectedTaskDetail.id}</p>
                    </div>
                    <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">
                      Story Points: {selectedTaskDetail.storyPoints}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                      Created by {roleNamesByUserId[selectedTaskDetail.assignedBy] ?? `User ${selectedTaskDetail.assignedBy}`}
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
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Description</h5>
                  <p className="mt-2 text-sm text-gray-700">{selectedTaskDetail.description}</p>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Work Instruction</h5>
                  <p className="mt-2 text-sm text-gray-700">{selectedTaskDetail.instruction}</p>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Telegram Evidence</h5>
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

                {/* Submission Progress & Review (Designer's editable view) */}
                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-4">
                    Submission Progress &amp; Review Feedback
                  </h5>

                  {(() => {
                    const progress = getDisplayProgress(selectedTaskDetail.id);
                    const taskRejected = isTaskRejected(progress);
                    const stopIdx = findFirstNonApprovedPhaseIndex(PHASES, progress);
                    const lastPopulated = getLastPopulatedPhaseIndex(progress);
                    const displayPhaseIdx = stopIdx !== -1 ? stopIdx : lastPopulated;

                    const visiblePhases = PHASES.filter((phase, idx) => {
                      const hasContent = phaseHasDisplayableContent(progress[phase.key]);
                      if (stopIdx !== -1 && idx > stopIdx) return false;
                      if (idx === displayPhaseIdx + 1 && !hasContent) return true;
                      return hasContent;
                    });

                    if (visiblePhases.length === 0) {
                      return <p className="text-sm text-gray-500">No submission data yet.</p>;
                    }

                    return (
                      <div className="space-y-3">
                        {taskRejected && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-red-600" />
                            <span className="text-sm font-medium text-red-700">This task has been rejected. No further submissions can be made.</span>
                          </div>
                        )}
                        {visiblePhases.map((phase) => {
                          const taskId = selectedTaskDetail.id;
                          const phaseData = progress[phase.key] ?? defaultPhase();
                          const isExpanded = expandedPhase === phase.key;
                          const currentStatus = getCurrentStatus(phaseData);
                          const history = phaseData.history || [];
                          const isApproved = currentStatus === 'approved';
                          // Submission is allowed only if phase is NOT approved AND the task is NOT rejected
                          const canSubmit = !isApproved && !taskRejected;
                          const noteDraft = draftNotes[taskId]?.[phase.key] ?? '';
                          const newScreenshot = draftScreenshots[taskId]?.[phase.key] ?? null;
                          const existingScreenshot = phaseData.screenshot;
                          const taskHistoryIdx = expandedHistoryIdx[taskId]?.[phase.key];

                          const statusBadge = {
                            feedback: { label: 'Feedback Given', icon: MessageSquare, color: 'bg-yellow-100 text-yellow-700' },
                            approved: { label: 'Approved', icon: ThumbsUp, color: 'bg-green-100 text-green-700' },
                            rejected: { label: 'Rejected', icon: ThumbsDown, color: 'bg-red-100 text-red-700' },
                            pending: { label: 'Pending Review', icon: Clock, color: 'bg-blue-100 text-blue-700' },
                          }[currentStatus];

                          return (
                            <div key={phase.key} className="border border-gray-200 rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={() => setExpandedPhase(isExpanded ? null : phase.key)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="font-medium text-gray-800">{phase.label}</span>
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.color}`}>
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
                                  {/* Open Submission (only when allowed) */}
                                  {canSubmit && (
                                    <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-blue-50/50">
                                      <h6 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4" />
                                        Open Submission
                                      </h6>
                                      <div className="space-y-3">
                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 mb-1">
                                            Progress Note
                                          </label>
                                          <textarea
                                            rows={3}
                                            value={noteDraft}
                                            onChange={(e) =>
                                              setDraftNotes((prev) => ({
                                                ...prev,
                                                [taskId]: { ...prev[taskId], [phase.key]: e.target.value },
                                              }))
                                            }
                                            placeholder="Describe your progress..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 mb-1">
                                            Telegram Screenshot{' '}
                                            {phase.key === 'finalStage' && (
                                              <span className="text-red-500">(required)</span>
                                            )}
                                            {phase.key !== 'finalStage' && (
                                              <span className="text-gray-400 text-xs ml-1">(optional)</span>
                                            )}
                                          </label>
                                          <div className="flex items-center gap-2">
                                            <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-700">
                                              <Image className="w-4 h-4" />
                                              {newScreenshot || existingScreenshot ? 'Change Screenshot' : 'Upload Screenshot'}
                                              <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) =>
                                                  handleFileChange(taskId, phase.key, e.target.files?.[0])
                                                }
                                                className="hidden"
                                              />
                                            </label>
                                            {(newScreenshot || existingScreenshot) && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setDraftScreenshots((prev) => ({
                                                    ...prev,
                                                    [taskId]: { ...prev[taskId], [phase.key]: null },
                                                  }));
                                                }}
                                                className="text-sm text-red-600 hover:underline"
                                              >
                                                Remove
                                              </button>
                                            )}
                                          </div>
                                          {newScreenshot && (
                                            <img
                                              src={newScreenshot}
                                              alt="preview"
                                              className="mt-2 w-full max-h-40 rounded-lg border object-contain"
                                            />
                                          )}
                                          {!newScreenshot && existingScreenshot && (
                                            <img
                                              src={existingScreenshot}
                                              alt="current screenshot"
                                              className="mt-2 w-full max-h-40 rounded-lg border object-contain"
                                            />
                                          )}
                                          {!newScreenshot && !existingScreenshot && (
                                            <p className="mt-1 text-xs text-gray-400">No screenshot provided.</p>
                                          )}
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                          <button
                                            onClick={() => handleSubmitPhaseProgress(taskId, phase.key)}
                                            className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors"
                                          >
                                            Save Progress
                                          </button>
                                          <button
                                            onClick={() => {
                                              setDraftNotes((prev) => ({
                                                ...prev,
                                                [taskId]: { ...prev[taskId], [phase.key]: '' },
                                              }));
                                              setDraftScreenshots((prev) => ({
                                                ...prev,
                                                [taskId]: { ...prev[taskId], [phase.key]: null },
                                              }));
                                            }}
                                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
                                          >
                                            Clear
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Designer's Progress Note (read-only when approved or task rejected) */}
                                  {(isApproved || !canSubmit) && (
                                    <div>
                                      <h6 className="text-sm font-medium text-gray-700 mb-1">Designer's Progress Note</h6>
                                      {phaseData.note ? (
                                        <div className="text-sm text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100 whitespace-pre-wrap">
                                          {phaseData.note}
                                        </div>
                                      ) : (
                                        <p className="text-sm text-gray-400 italic">No progress note submitted.</p>
                                      )}
                                    </div>
                                  )}

                                  {/* Telegram Screenshot (read-only when approved or task rejected) */}
                                  {(isApproved || !canSubmit) && (
                                    <div>
                                      <h6 className="text-sm font-medium text-gray-700 mb-1">Telegram Screenshot</h6>
                                      {existingScreenshot ? (
                                        <img
                                          src={existingScreenshot}
                                          alt="current screenshot"
                                          className="mt-2 max-w-full h-auto max-h-64 rounded-lg border object-contain"
                                        />
                                      ) : (
                                        <p className="text-sm text-gray-400 italic">No screenshot provided.</p>
                                      )}
                                    </div>
                                  )}

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
                                              : entry.status.charAt(0).toUpperCase() + entry.status.slice(1);
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
                                            <div key={idxEntry} className="border border-gray-200 rounded-lg overflow-hidden">
                                              <button
                                                type="button"
                                                onClick={() => toggleHistoryEntry(taskId, phase.key, idxEntry)}
                                                className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
                                              >
                                                <div className="flex items-center gap-2">
                                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${entryColor}`}>
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
                                                        <span className="italic text-gray-400">No note</span>
                                                      )}
                                                    </p>
                                                    {entry.designerSubmission.screenshot ? (
                                                      <img
                                                        src={entry.designerSubmission.screenshot}
                                                        alt="designer screenshot"
                                                        className="mt-2 max-w-full h-auto max-h-40 rounded border object-contain"
                                                      />
                                                    ) : (
                                                      <p className="text-xs text-gray-400 italic mt-1">No screenshot</p>
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
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </section>
              </div>

              {/* Sidebar */}
              <aside className="space-y-4">
                {selectedTaskDetail.approvalStatus && (
                  <section className="rounded-xl border border-gray-200 bg-white p-4">
                    <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Overall Approval</h5>
                    <p className="mt-2 text-sm text-gray-700">{selectedTaskDetail.approvalStatus}</p>
                    {selectedTaskDetail.approvalFeedback && (
                      <p className="mt-2 text-sm text-gray-600 italic">"{selectedTaskDetail.approvalFeedback}"</p>
                    )}
                  </section>
                )}

                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Timeline</h5>
                  <div className="mt-2 space-y-2 text-sm text-gray-700">
                    <p>Deadline: {selectedTaskDetail.deadline ? new Date(selectedTaskDetail.deadline).toLocaleDateString() : 'No deadline'}</p>
                    <p>Created: {new Date(selectedTaskDetail.createdAt).toLocaleDateString()}</p>
                    <p>Assigned by: {roleNamesByUserId[selectedTaskDetail.assignedBy] ?? `User ${selectedTaskDetail.assignedBy}`}</p>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DesignerTasks;