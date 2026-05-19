export type UserRole =
  | 'marketing_lead'
  | 'general_manager'
  | 'ceo'
  | 'data_collector'
  | 'quantity_surveyor'
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

export type CustomerRequestCategory =
  | 'home_design'
  | 'finishing_work'
  | 'hair_salon_design'
  | 'other';

export type CustomerRequestStatus =
  | 'new'
  | 'in_review'
  | 'scheduled'
  | 'closed';

export interface CustomerRequest {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress: string;
  category: CustomerRequestCategory;
  serviceDescription: string;
  preferredStartDate?: string;
  budget?: string;
  notes?: string;
  status: CustomerRequestStatus;
  createdAt: string;
  createdBy: string;
  createdByName: string;
}

export interface PaymentProof {
  name: string;
  type: string;
  size: string;
  dataUrl: string;
}

export interface PaidCustomer extends CustomerRequest {
  sourceRequestId: string;
  transferredAt: string;
  transferredBy: string;
  transferredByName: string;
  paymentNote?: string;
  proofOfPayment?: PaymentProof;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  instruction: string;
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
  telegramScreenshot?: string;
  submissions?: Submission[];
  feedbacks?: Feedback[];
}

export interface Submission {
  id: string;
  submittedBy: string;
  submittedByName?: string;
  submittedAt: string;
  notes?: string;
  attachments?: string[]; // data URLs or paths
  metadata?: Record<string, any>;
}

export interface Feedback {
  id: string;
  senderId: string;
  senderName?: string;
  sentAt: string;
  body: string; // rich text (HTML)
  version: number;
}

export interface DesignerTask extends Task {
  storyPoints: number;
}

export type DesignerTaskApplicationStatus = 'pending' | 'assigned' | 'rejected';

export interface DesignerTaskApplication {
  id: string;
  taskId: string;
  applicantId: string;
  applicantName: string;
  applicantRole: Extract<UserRole, 'designer'>;
  message: string;
  appliedAt: string;
  status: DesignerTaskApplicationStatus;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNote?: string;
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
