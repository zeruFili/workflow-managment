export type UserRole =
  | 'marketing_lead'
  | 'general_manager'
  | 'design_team_leader'
  | 'designer'
  | 'site_engineer'
  | 'finance_officer'
  | 'purchasing_team'
  | 'system_administrator';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
}

export type ProjectStage =
  | 'lead'
  | 'design'
  | 'approval'
  | 'execution'
  | 'completed';

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'incomplete'
  | 'rejected';

export interface Project {
  id: string;
  name: string;
  clientName: string;
  description: string;
  stage: ProjectStage;
  createdAt: string;
  deadline?: string;
  createdBy: string;
  assignedTo?: string;
  status: 'active' | 'on_hold' | 'completed';
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assignedTo?: string;
  assignedBy: string;
  status: TaskStatus;
  deadline?: string;
  createdAt: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvalFeedback?: string;
  approvedBy?: string;
  approvedAt?: string;
  attachments?: string[];
}

export interface Document {
  id: string;
  projectId: string;
  name: string;
  type: string;
  uploadedBy: string;
  uploadedAt: string;
  size: string;
  url?: string;
}

export interface Approval {
  id: string;
  projectId: string;
  stage: ProjectStage;
  status: 'pending' | 'approved' | 'rejected';
  requestedBy: string;
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  feedback?: string;
}
