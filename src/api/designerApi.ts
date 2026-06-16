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
};

export default designerApi;
