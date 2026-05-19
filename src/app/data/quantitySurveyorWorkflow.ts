import { UserRole } from '../types';

export type QuantityReviewStatus = 'pending_review' | 'in_review' | 'record_submitted';

export type QuantityReviewRecommendation = 'recommended_for_approval' | 'recommends_revision';

export type QuantityReviewDecision = 'pending' | 'approved' | 'feedback';

export type QuantityReviewNotificationType = 'task_assigned' | 'evaluation_submitted';

export interface QuantityReviewTask {
  id: string;
  jobId: string;
  designWorkReference: string;
  telegramScreenshot: string;
  description: string;
  designerName: string;
  submissionDate: string;
  budgetExpectationReference?: string;
  submissionHistory: string[];
  status: QuantityReviewStatus;
  createdBy: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  evaluationId?: string;
}

export interface QuantityReviewEvaluation {
  id: string;
  taskId: string;
  jobId: string;
  surveyorId: string;
  surveyorName: string;
  costValue: number;
  budgetExpectationReference?: string;
  evaluationNotes: string;
  recommendation: QuantityReviewRecommendation;
  submittedAt: string;
  decisionStatus: QuantityReviewDecision;
  decisionNotes?: string;
  decidedBy?: string;
  decidedByName?: string;
  decidedAt?: string;
}

export interface QuantityReviewNotification {
  id: string;
  type: QuantityReviewNotificationType;
  taskId: string;
  evaluationId?: string;
  jobId: string;
  message: string;
  description: string;
  telegramScreenshot?: string;
  createdAt: string;
  targetRoles: UserRole[];
  readByRoles: UserRole[];
}

export const QUANTITY_REVIEW_TASKS_STORAGE_KEY = 'quantity-surveyor-review-tasks';
export const QUANTITY_REVIEW_EVALUATIONS_STORAGE_KEY = 'quantity-surveyor-evaluations';
export const QUANTITY_REVIEW_NOTIFICATIONS_STORAGE_KEY = 'quantity-surveyor-notifications';

const seedQuantityReviewTasks: QuantityReviewTask[] = [
  {
    id: 'qs-review-1',
    jobId: 'JOB-2048',
    designWorkReference: 'DW-2048-A',
    telegramScreenshot: 'https://placehold.co/240x160/0f172a/f8fafc?text=Telegram+Screenshot',
    description: 'Ceiling plan and finish set forwarded for cost validation after GM review.',
    designerName: 'Emily Chen',
    submissionDate: '2026-05-18T09:30:00Z',
    budgetExpectationReference: 'BUD-2026-18',
    submissionHistory: [
      'Designer submission received in Telegram.',
      'General Manager forwarded the submission for quantity review.',
    ],
    status: 'pending_review',
    createdBy: '2',
    assignedTo: '11',
    createdAt: '2026-05-18T09:35:00Z',
    updatedAt: '2026-05-18T09:35:00Z',
  },
  {
    id: 'qs-review-2',
    jobId: 'JOB-2061',
    designWorkReference: 'DW-2061-B',
    telegramScreenshot: 'https://placehold.co/240x160/1e293b/e2e8f0?text=Submission+Preview',
    description: 'Lobby redesign package requiring a budget comparison before client presentation.',
    designerName: 'Michael Brown',
    submissionDate: '2026-05-17T14:10:00Z',
    budgetExpectationReference: 'BUD-2026-12',
    submissionHistory: [
      'CEO escalated the submission after a scope change.',
      'Budget reference attached for final cost validation.',
    ],
    status: 'record_submitted',
    createdBy: '0',
    assignedTo: '11',
    createdAt: '2026-05-17T14:15:00Z',
    updatedAt: '2026-05-18T10:05:00Z',
    evaluationId: 'qs-eval-2',
  },
  {
    id: 'qs-review-3',
    jobId: 'JOB-2074',
    designWorkReference: 'DW-2074-C',
    telegramScreenshot: 'https://placehold.co/240x160/111827/d1d5db?text=Evidence',
    description: 'Warehouse fit-out submission with a completed review note from the surveyor.',
    designerName: 'Sophia Ahmed',
    submissionDate: '2026-05-16T11:45:00Z',
    budgetExpectationReference: 'BUD-2026-09',
    submissionHistory: [
      'Submission forwarded after preliminary design signoff.',
      'Quantity review record already submitted for approval.',
    ],
    status: 'record_submitted',
    createdBy: '2',
    assignedTo: '11',
    createdAt: '2026-05-16T11:50:00Z',
    updatedAt: '2026-05-18T12:05:00Z',
    evaluationId: 'qs-eval-3',
  },
];

const seedQuantityReviewEvaluations: QuantityReviewEvaluation[] = [
  {
    id: 'qs-eval-1',
    taskId: 'qs-review-1',
    jobId: 'JOB-2048',
    surveyorId: '11',
    surveyorName: 'Oliver Grant',
    costValue: 148500,
    budgetExpectationReference: 'BUD-2026-18',
    evaluationNotes: 'Cost is within the expected envelope. Finishes are aligned with the approved scope.',
    recommendation: 'recommended_for_approval',
    submittedAt: '2026-05-18T11:25:00Z',
    decisionStatus: 'pending',
  },
  {
    id: 'qs-eval-2',
    taskId: 'qs-review-2',
    jobId: 'JOB-2061',
    surveyorId: '11',
    surveyorName: 'Oliver Grant',
    costValue: 193000,
    budgetExpectationReference: 'BUD-2026-12',
    evaluationNotes: 'Cost exceeds the original expectation because the lobby scope expanded after CEO review.',
    recommendation: 'recommends_revision',
    submittedAt: '2026-05-18T10:00:00Z',
    decisionStatus: 'approved',
    decisionNotes: 'Approved by the General Manager after confirming the revised budget envelope.',
    decidedBy: '2',
    decidedByName: 'John Smith',
    decidedAt: '2026-05-18T13:00:00Z',
  },
  {
    id: 'qs-eval-3',
    taskId: 'qs-review-3',
    jobId: 'JOB-2074',
    surveyorId: '11',
    surveyorName: 'Oliver Grant',
    costValue: 72000,
    budgetExpectationReference: 'BUD-2026-09',
    evaluationNotes: 'Review record was strong, but the ceiling allowance should be tightened before sign-off.',
    recommendation: 'recommends_revision',
    submittedAt: '2026-05-17T16:10:00Z',
    decisionStatus: 'feedback',
    decisionNotes: 'Return with a tighter ceiling allowance and line-by-line cost backup.',
    decidedBy: '0',
    decidedByName: 'Ava Reynolds',
    decidedAt: '2026-05-18T09:05:00Z',
  },
];

const seedQuantityReviewNotifications: QuantityReviewNotification[] = [
  {
    id: 'qs-notify-1',
    type: 'task_assigned',
    taskId: 'qs-review-1',
    jobId: 'JOB-2048',
    message: 'A new design submission is ready for quality review.',
    description: 'Ceiling plan and finish set forwarded for cost validation after GM review.',
    telegramScreenshot: 'https://placehold.co/240x160/0f172a/f8fafc?text=Telegram+Screenshot',
    createdAt: '2026-05-18T09:35:00Z',
    targetRoles: ['quantity_surveyor'],
    readByRoles: [],
  },
  {
    id: 'qs-notify-2',
    type: 'evaluation_submitted',
    taskId: 'qs-review-1',
    evaluationId: 'qs-eval-1',
    jobId: 'JOB-2048',
    message: 'Quantity review evaluation submitted and ready for leadership review.',
    description: 'Cost evaluation record was submitted by Quantity Surveyor and requires GM/CEO visibility.',
    createdAt: '2026-05-18T11:25:00Z',
    targetRoles: ['general_manager', 'ceo'],
    readByRoles: ['ceo'],
  },
];

function mergeById<T extends { id: string }>(savedItems: T[], seedItems: T[]): T[] {
  return [
    ...savedItems.map((item) => {
      const seedItem = seedItems.find((candidate) => candidate.id === item.id);
      return seedItem ? { ...seedItem, ...item } : item;
    }),
    ...seedItems.filter((seedItem) => !savedItems.some((item) => item.id === seedItem.id)),
  ];
}

function loadFromStorage<T>(storageKey: string, seedItems: T[]): T[] {
  const savedItems = localStorage.getItem(storageKey);
  if (!savedItems) {
    localStorage.setItem(storageKey, JSON.stringify(seedItems));
    return seedItems;
  }

  const parsedItems = JSON.parse(savedItems) as T[];
  const mergedItems = mergeById(parsedItems, seedItems);
  localStorage.setItem(storageKey, JSON.stringify(mergedItems));
  return mergedItems;
}

export function loadQuantityReviewTasks(): QuantityReviewTask[] {
  return loadFromStorage(QUANTITY_REVIEW_TASKS_STORAGE_KEY, seedQuantityReviewTasks);
}

export function saveQuantityReviewTasks(tasks: QuantityReviewTask[]): void {
  localStorage.setItem(QUANTITY_REVIEW_TASKS_STORAGE_KEY, JSON.stringify(tasks));
}

export function loadQuantityReviewEvaluations(): QuantityReviewEvaluation[] {
  return loadFromStorage(QUANTITY_REVIEW_EVALUATIONS_STORAGE_KEY, seedQuantityReviewEvaluations);
}

export function saveQuantityReviewEvaluations(evaluations: QuantityReviewEvaluation[]): void {
  localStorage.setItem(QUANTITY_REVIEW_EVALUATIONS_STORAGE_KEY, JSON.stringify(evaluations));
}

export function loadQuantityReviewNotifications(): QuantityReviewNotification[] {
  return loadFromStorage(QUANTITY_REVIEW_NOTIFICATIONS_STORAGE_KEY, seedQuantityReviewNotifications);
}

export function saveQuantityReviewNotifications(notifications: QuantityReviewNotification[]): void {
  localStorage.setItem(QUANTITY_REVIEW_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
}

export function createQuantityReviewTaskId(): string {
  return `qs-review-${Date.now()}`;
}

export function createQuantityReviewEvaluationId(): string {
  return `qs-eval-${Date.now()}`;
}

export function createQuantityReviewNotificationId(): string {
  return `qs-notify-${Date.now()}`;
}

export function getQuantityReviewNotificationCount(tasks: QuantityReviewTask[]): number {
  return tasks.filter((task) => task.status === 'pending_review').length;
}

export function getQuantityReviewApprovalCount(evaluations: QuantityReviewEvaluation[]): number {
  return evaluations.filter((evaluation) => evaluation.decisionStatus === 'approved').length;
}

export function getQuantityReviewFeedbackCount(evaluations: QuantityReviewEvaluation[]): number {
  return evaluations.filter((evaluation) => evaluation.decisionStatus === 'feedback').length;
}

export function getQuantityReviewPendingDecisionCount(evaluations: QuantityReviewEvaluation[]): number {
  return evaluations.filter((evaluation) => evaluation.decisionStatus === 'pending').length;
}

export function getRoleNotificationCount(
  notifications: QuantityReviewNotification[],
  role: UserRole,
  type?: QuantityReviewNotificationType
): number {
  return notifications.filter((notification) => {
    const matchesRole = notification.targetRoles.includes(role);
    const matchesType = type ? notification.type === type : true;
    const isUnread = !notification.readByRoles.includes(role);
    return matchesRole && matchesType && isUnread;
  }).length;
}

export function markRoleNotificationsRead(
  notifications: QuantityReviewNotification[],
  role: UserRole,
  type?: QuantityReviewNotificationType
): QuantityReviewNotification[] {
  return notifications.map((notification) => {
    const matchesRole = notification.targetRoles.includes(role);
    const matchesType = type ? notification.type === type : true;

    if (!matchesRole || !matchesType || notification.readByRoles.includes(role)) {
      return notification;
    }

    return {
      ...notification,
      readByRoles: [...notification.readByRoles, role],
    };
  });
}

export function createTaskAssignedNotification(task: QuantityReviewTask): QuantityReviewNotification {
  return {
    id: createQuantityReviewNotificationId(),
    type: 'task_assigned',
    taskId: task.id,
    jobId: task.jobId,
    message: 'A new design submission is ready for quality review.',
    description: task.description,
    telegramScreenshot: task.telegramScreenshot,
    createdAt: new Date().toISOString(),
    targetRoles: ['quantity_surveyor'],
    readByRoles: [],
  };
}

export function createEvaluationSubmittedNotification(
  task: QuantityReviewTask,
  evaluation: QuantityReviewEvaluation
): QuantityReviewNotification {
  return {
    id: createQuantityReviewNotificationId(),
    type: 'evaluation_submitted',
    taskId: task.id,
    evaluationId: evaluation.id,
    jobId: task.jobId,
    message: 'Quantity review evaluation submitted and ready for leadership review.',
    description: task.description,
    createdAt: new Date().toISOString(),
    targetRoles: ['general_manager', 'ceo'],
    readByRoles: [],
  };
}

export function getQuantityReviewerName(role: UserRole): string {
  if (role === 'ceo') {
    return 'CEO';
  }

  if (role === 'general_manager') {
    return 'General Manager';
  }

  return 'Quantity Surveyor';
}