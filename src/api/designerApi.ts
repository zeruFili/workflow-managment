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
  taskNotification: {
    hasNotification: boolean;
    notificationId: string | null;
  };
  caseStudy: SubmissionItem[];
  designing: SubmissionItem[];
  rendering: SubmissionItem[];
  finalStage: SubmissionItem[];
}

export interface TaskReviewData {
  id: string;
  reviewerName: string;
  reviewer_user: SafeUserOutput;
  reviewText: string;
  ratings: {
    creativity: number;
    timeliness: number;
    rendering: number;
    clientUnderstanding: number;
  };
  submittedAt: string;
  updatedAt: string | null;
  hasNotification: boolean;
  notificationId: string | null;
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
  pause_reason: string | null;
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
  taskReview: TaskReviewData | null;
  taskNotification: {
    hasNotification: boolean;
    notificationId: string | null;
  } | null;
  hasNestedNotification: boolean;
  applied?: boolean;
  coverNote?: string | null;
  applicationId?: string | null;
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
  is_withdrawn?: boolean;
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

// ── Designer Performance ──

export interface DesignerPerformanceDesigner {
  id: string;
  full_name: string;
  email: string;
  initials: string;
}

export interface DesignerPerformanceKPIs {
  totalTasks: number;
  completed: number;
  rejected: number;
  inReview: number;
  paused: number;
  totalSp: number;
  completedSp: number;
  rejectedSp: number;
  pendingSp: number;
  avgCreativity: number | null;
  avgTimeliness: number | null;
  avgClientUnderstanding: number | null;
  avgRenderingQuality: number | null;
  deadlinePercent: number;
  ratingAvg: number | null;
}

export interface DesignerPerformanceTrend {
  label: string;
  rating: number | null;
  storyPoints: number;
  compliancePercent: number | null;
}

export interface DesignerAssignedTask {
  id: string;
  title: string;
  status: string | null;
  storyPoint: number;
  assignedAt: string | null;
}

export interface DesignerRatedTask {
  id: string;
  title: string;
  storyPoint: number;
  ratings: {
    creativity: number;
    timeliness: number;
    renderingQuality: number;
    clientUnderstanding: number;
  };
  reviewedAt: string | null;
}

export interface DesignerPerformanceData {
  designers: DesignerPerformanceDesigner[];
  selected: DesignerPerformanceDesigner | null;
  periodLabel: string;
  periodRange: { start: string; end: string } | null;
  kpis: DesignerPerformanceKPIs | null;
  ratingBreakdown: {
    creativity: number | null;
    timeliness: number | null;
    clientUnderstanding: number | null;
    renderingQuality: number | null;
  } | null;
  storyPointBreakdown: {
    completed: number;
    pending: number;
    rejected: number;
    total: number;
  } | null;
  previousPeriodLabel: string;
  previousKpis: DesignerPerformanceKPIs | null;
  previousRatingBreakdown: {
    creativity: number | null;
    timeliness: number | null;
    clientUnderstanding: number | null;
    renderingQuality: number | null;
  } | null;
  previousStoryPointBreakdown: {
    completed: number;
    pending: number;
    rejected: number;
    total: number;
  } | null;
  trend: DesignerPerformanceTrend[];
  assignedTasks: DesignerAssignedTask[];
  ratedTasks: DesignerRatedTask[];
}

export interface DesignerPerformanceResponse {
  success: boolean;
  data: DesignerPerformanceData;
}

export interface DesignerPerformanceParams {
  userId?: string;
  mode: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  year: number;
  periodValue: number;
}

const designerApi = {
  getDesignerTasks: async (
    params: TaskListParams = {}
  ): Promise<DesignerTaskListResponse> => {
    console.log('[PAGINATION] API: GET /designer-tasks with params:', JSON.stringify(params));
    const response = await api.get<DesignerTaskListResponse>(
      "/designer-tasks",
      { params }
    );
    console.log('[PAGINATION] API: GET /designer-tasks response — success:', response.data.success, 'data.length:', response.data.data?.length, 'meta:', JSON.stringify(response.data.meta));
    return response.data;
  },

  getDesignerTaskById: async (
    taskId: string
  ): Promise<CreateDesignerTaskResponse> => {
    const response = await api.get<CreateDesignerTaskResponse>(
      `/designer-tasks/${taskId}`
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
    data: { description: string; review_outcome: string; task_state: string; submission_id: string; task_id: string }
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

  withdrawApplication: async (
    taskId: string
  ): Promise<{ success: boolean; data?: any; message?: string }> => {
    const response = await api.delete<{ success: boolean; data?: any; message?: string }>(
      `/designer-tasks/${taskId}/apply`
    );
    return response.data;
  },

  updateApplication: async (
    taskId: string,
    data: { cover_note: string }
  ): Promise<{ success: boolean; data?: any; message?: string }> => {
    const response = await api.patch<{ success: boolean; data?: any; message?: string }>(
      `/designer-tasks/${taskId}/apply`,
      data
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

  updateDesignerTask: async (
    taskId: string,
    data: FormData | Record<string, unknown>
  ): Promise<CreateDesignerTaskResponse> => {
    const response = await api.patch<CreateDesignerTaskResponse>(
      `/designer-tasks/${taskId}`,
      data
    );
    return response.data;
  },

  pauseTask: async (
    taskId: string,
    data: { reason: string }
  ): Promise<{ success: boolean; data?: DesignerTaskItem; message?: string }> => {
    const response = await api.post<{ success: boolean; data?: DesignerTaskItem; message?: string }>(
      `/designer-tasks/${taskId}/pause`,
      data
    );
    return response.data;
  },

  resumeTask: async (
    taskId: string
  ): Promise<{ success: boolean; data?: DesignerTaskItem; message?: string }> => {
    const response = await api.post<{ success: boolean; data?: DesignerTaskItem; message?: string }>(
      `/designer-tasks/${taskId}/resume`
    );
    return response.data;
  },

  deleteDesignerTask: async (
    taskId: string
  ): Promise<{ success: boolean; message?: string }> => {
    const response = await api.delete<{ success: boolean; message?: string }>(
      `/designer-tasks/${taskId}`
    );
    return response.data;
  },

  createTaskReview: async (
    taskId: string,
    data: { Creativity: number; Timeliness: number; Rendering_quality: number; Client_understanding: number; description?: string }
  ): Promise<{ success: boolean; data?: TaskReviewData; message?: string }> => {
    const response = await api.post<{ success: boolean; data?: TaskReviewData; message?: string }>(
      `/designer-tasks/${taskId}/review`,
      data
    );
    return response.data;
  },

  updateTaskReview: async (
    reviewId: string,
    data: { Creativity?: number; Timeliness?: number; Rendering_quality?: number; Client_understanding?: number; description?: string }
  ): Promise<{ success: boolean; data?: TaskReviewData; message?: string }> => {
    const response = await api.patch<{ success: boolean; data?: TaskReviewData; message?: string }>(
      `/designer-task-reviews/${reviewId}`,
      data
    );
    return response.data;
  },

  deactivateTask: async (
    taskId: string
  ): Promise<{ success: boolean; data?: DesignerTaskItem; message?: string }> => {
    const response = await api.post<{ success: boolean; data?: DesignerTaskItem; message?: string }>(
      `/designer-tasks/${taskId}/deactivate`
    );
    return response.data;
  },

  reactivateTask: async (
    taskId: string
  ): Promise<{ success: boolean; data?: DesignerTaskItem; message?: string }> => {
    const response = await api.post<{ success: boolean; data?: DesignerTaskItem; message?: string }>(
      `/designer-tasks/${taskId}/reactivate`
    );
    return response.data;
  },

  getDesignerPerformance: async (
    params: DesignerPerformanceParams
  ): Promise<DesignerPerformanceResponse> => {
    const response = await api.get<DesignerPerformanceResponse>(
      '/designer-performance',
      { params: { ...params, _t: Date.now() } }
    );
    return response.data;
  },
};

export default designerApi;
