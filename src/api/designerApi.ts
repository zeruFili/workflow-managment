import api from "./baseApi";

// ── Backend response types (match backend exactly) ──

export interface SafeUserOutput {
  id: string;
  full_name: string;
  role: string;
}

export interface SubmissionReview {
  id: string;
  designer_submission_id: string;
  reviewer_user_id: string;
  reviewer_user: SafeUserOutput;
  review_outcome: string;
  description: string;
  created_at: string;
  updated_at: string | null;
  hasNotification: boolean;
  notificationId: string | null;
}

export interface SubmissionItem {
  id: string;
  designer_task_id: string;
  stage: string;
  description: string;
  attachment_urls: string[] | null;
  created_at: string;
  updated_at: string | null;
  hasNotification: boolean;
  notificationId: string | null;
  reviews: SubmissionReview[];
}

export interface SubmissionsWithReviewsData {
  caseStudy: SubmissionItem[];
  designing: SubmissionItem[];
  rendering: SubmissionItem[];
  finalStage: SubmissionItem[];
}

export interface DesignerTaskItem {
  id: string;
  assigned_to_user_id: string | null;
  assigned_by_user_id: string;
  title: string;
  description: string;
  status: string | null;
  stage: string | null;
  is_paused: boolean | null;
  is_public: boolean | null;
  task_state: string;
  story_point: number;
  due_date: string | null;
  attachment_urls: string[] | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string | null;
  assigned_at: string | null;
  assigned_by_user: SafeUserOutput;
  assigned_to_user: SafeUserOutput | null;
  updated_by_user: SafeUserOutput | null;
  submissionsWithReviews: SubmissionsWithReviewsData;
  taskNotification: {
    hasNotification: boolean;
    notificationId: string | null;
  };
  hasNestedNotification: boolean;
}

export interface DesignerTaskListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DesignerTaskListResponse {
  success: boolean;
  data: DesignerTaskItem[];
  meta: DesignerTaskListMeta;
  message?: string;
}

// ── Create Submission ──

export interface CreatedSubmission {
  id: string;
  designer_task_id: string;
  stage: string;
  description: string;
  attachment_urls: string[] | null;
  created_at: string;
  updated_at: string | null;
}

export interface CreateSubmissionResponse {
  success: boolean;
  data?: CreatedSubmission;
  message?: string;
}

// ── Create Task ──

export interface CreateDesignerTaskResponse {
  success: boolean;
  data?: DesignerTaskItem;
  message?: string;
}

// ── Applications ──

export interface DesignerApplicationItem {
  id: string;
  designer_task_id: string;
  applicant_user_id: string;
  cover_note: string | null;
  created_at: string;
  updated_at: string | null;
  applicant_user: SafeUserOutput;
}

export interface DesignerApplicationListResponse {
  success: boolean;
  data: DesignerApplicationItem[];
  meta: DesignerTaskListMeta;
}

// ── Query params ──

export interface TaskListParams {
  page?: number;
  limit?: number;
  status?: string;
  assignedTo?: string;
  isPublic?: boolean;
  isPaused?: boolean;
  search?: string;
}

// ── API functions ──

const designerApi = {
  getDesignerTasks: async (
    params: TaskListParams = {}
  ): Promise<DesignerTaskListResponse> => {
    const response = await api.get<DesignerTaskListResponse>(
      "/designer-tasks",
      { params }
    );
    return response.data;
  },

  createDesignerTask: async (
    data: FormData | Record<string, unknown>
  ): Promise<CreateDesignerTaskResponse> => {
    const response = await api.post<CreateDesignerTaskResponse>(
      "/designer-tasks",
      data
    );
    return response.data;
  },

  createSubmission: async (
    taskId: string,
    data: FormData
  ): Promise<CreateSubmissionResponse> => {
    const response = await api.post<CreateSubmissionResponse>(
      `/designer-tasks/${taskId}/submissions`,
      data
    );
    return response.data;
  },

  updateSubmission: async (
    submissionId: string,
    data: FormData
  ): Promise<CreateSubmissionResponse> => {
    const response = await api.patch<CreateSubmissionResponse>(
      `/designer-tasks/submit/${submissionId}`,
      data
    );
    return response.data;
  },

  createReview: async (
    submissionId: string,
    data: { description: string; review_outcome: string; task_state: string }
  ): Promise<{ success: boolean; data?: SubmissionReview; message?: string }> => {
    const response = await api.post<{ success: boolean; data?: SubmissionReview; message?: string }>(
      `/designer-submissions/${submissionId}/review`,
      data
    );
    return response.data;
  },

  updateReview: async (
    reviewId: string,
    data: { description: string; review_outcome: string; task_state: string }
  ): Promise<{ success: boolean; data?: SubmissionReview; message?: string }> => {
    const response = await api.patch<{ success: boolean; data?: SubmissionReview; message?: string }>(
      `/designer-submission-reviews/${reviewId}`,
      data
    );
    return response.data;
  },

  apply: async (
    taskId: string,
    data?: { cover_note?: string }
  ): Promise<{ success: boolean; data?: any; message?: string }> => {
    const response = await api.post<{ success: boolean; data?: any; message?: string }>(
      `/designer-tasks/${taskId}/apply`,
      data ?? {}
    );
    return response.data;
  },

  getApplications: async (
    taskId: string,
    params?: { page?: number; limit?: number }
  ): Promise<DesignerApplicationListResponse> => {
    const response = await api.get<DesignerApplicationListResponse>(
      `/designer-tasks/${taskId}/applications`,
      { params }
    );
    return response.data;
  },

  assignDesigner: async (
    taskId: string,
    designerId: string
  ): Promise<{ success: boolean; data?: any; message?: string }> => {
    const response = await api.post<{ success: boolean; data?: any; message?: string }>(
      `/designer-tasks/${taskId}/assign`,
      { designer_id: designerId }
    );
    return response.data;
  },
};

export default designerApi;
