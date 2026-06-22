import api from "./baseApi";

// ── Backend response types (match backend exactly) ──

export interface SafeUserOutput {
  id: string;
  full_name: string;
  role: string;
}

export interface MarketingReviewRaw {
  id: string;
  marketing_submission_id: string;
  reviewer_user_id: string;
  reviewer_user: SafeUserOutput;
  review_outcome: string;
  description: string;
  created_at: string;
  updated_at: string | null;
  hasNotification: boolean;
  notificationId: string | null;
}

export interface MarketingSubmissionRaw {
  id: string;
  marketing_task_id: string;
  description: string;
  attachment_urls: string[] | null;
  created_at: string;
  updated_at: string | null;
  reviews: MarketingReviewRaw[];
}

export interface MarketingSubmissionWrapper {
  submissionId: string;
  hasNotification: boolean;
  notificationId: string | null;
  submission: MarketingSubmissionRaw;
}

export interface MarketingSubmissionsWithReviews {
  submissions: MarketingSubmissionWrapper[];
  latestActivityTs: number;
}

export interface MarketingTaskItem {
  id: string;
  marketing_user_id: string;
  title: string;
  description: string;
  status: string | null;
  task_state: string;
  due_date: string | null;
  attachment_urls: string[] | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string | null;
  marketing_user: SafeUserOutput;
  updated_by_user: SafeUserOutput | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_address: string;
  category: string;
  service_description: string;
  preferred_start_date: string | null;
  budget: number | null;
  notes: string | null;
  submissionsWithReviews: MarketingSubmissionsWithReviews;
  taskNotification: {
    hasNotification: boolean;
    notificationId: string | null;
  };
  hasNestedNotification: boolean;
}

export interface MarketingTaskListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MarketingTaskListResponse {
  success: boolean;
  data: MarketingTaskItem[];
  meta: MarketingTaskListMeta;
  message?: string;
}

// ── Create Task ──

export interface CreateMarketingTaskResponse {
  success: boolean;
  data?: MarketingTaskItem;
  message?: string;
}

// ── Create Submission ──

export interface CreatedMarketingSubmission {
  id: string;
  marketing_task_id: string;
  description: string;
  attachment_urls: string[] | null;
  created_at: string;
  updated_at: string | null;
}

export interface CreateMarketingSubmissionResponse {
  success: boolean;
  data?: CreatedMarketingSubmission;
  message?: string;
}

// ── Create / Update Review ──

export interface CreateMarketingReviewPayload {
  description: string;
  review_outcome: string;
}

export interface UpdateMarketingReviewPayload {
  description?: string;
  review_outcome?: string;
}

export interface MarketingReviewResponse {
  success: boolean;
  data?: MarketingReviewRaw;
  message?: string;
}

// ── Query params ──

export interface MarketingTaskListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

// ── API functions ──

const marketingApi = {
  getMarketingTasks: async (
    params: MarketingTaskListParams = {}
  ): Promise<MarketingTaskListResponse> => {
    const response = await api.get<MarketingTaskListResponse>(
      "/marketing-tasks",
      { params }
    );
    return response.data;
  },

  createMarketingTask: async (
    data: FormData
  ): Promise<CreateMarketingTaskResponse> => {
    const response = await api.post<CreateMarketingTaskResponse>(
      "/marketing-tasks",
      data
    );
    return response.data;
  },

  getMarketingTaskById: async (
    taskId: string
  ): Promise<{ success: boolean; data: MarketingTaskItem; message?: string }> => {
    const response = await api.get<{ success: boolean; data: MarketingTaskItem; message?: string }>(
      `/marketing-tasks/${taskId}`
    );
    return response.data;
  },

  updateMarketingTask: async (
    taskId: string,
    data: FormData | Record<string, unknown>
  ): Promise<CreateMarketingTaskResponse> => {
    const response = await api.patch<CreateMarketingTaskResponse>(
      `/marketing-tasks/${taskId}`,
      data
    );
    return response.data;
  },

  deleteMarketingTask: async (
    taskId: string
  ): Promise<{ success: boolean; message?: string }> => {
    const response = await api.delete<{ success: boolean; message?: string }>(
      `/marketing-tasks/${taskId}`
    );
    return response.data;
  },

  createSubmission: async (
    taskId: string,
    data: FormData
  ): Promise<CreateMarketingSubmissionResponse> => {
    const response = await api.post<CreateMarketingSubmissionResponse>(
      `/marketing-tasks/${taskId}/submissions`,
      data
    );
    return response.data;
  },

  updateSubmission: async (
    submissionId: string,
    data: FormData
  ): Promise<CreateMarketingSubmissionResponse> => {
    const response = await api.patch<CreateMarketingSubmissionResponse>(
      `/marketing-tasks/submit/${submissionId}`,
      data
    );
    return response.data;
  },

  getSubmissions: async (
    taskId: string
  ): Promise<{ success: boolean; data: MarketingSubmissionRaw[]; message?: string }> => {
    const response = await api.get<{ success: boolean; data: MarketingSubmissionRaw[]; message?: string }>(
      `/marketing-tasks/${taskId}/submissions`
    );
    return response.data;
  },

  getReviews: async (
    submissionId: string
  ): Promise<{ success: boolean; data: MarketingReviewRaw[]; message?: string }> => {
    const response = await api.get<{ success: boolean; data: MarketingReviewRaw[]; message?: string }>(
      `/marketing-submissions/${submissionId}/reviews`
    );
    return response.data;
  },

  createReview: async (
    submissionId: string,
    data: CreateMarketingReviewPayload
  ): Promise<MarketingReviewResponse> => {
    const response = await api.post<MarketingReviewResponse>(
      `/marketing-submissions/${submissionId}/review`,
      data
    );
    return response.data;
  },

  updateReview: async (
    reviewId: string,
    data: UpdateMarketingReviewPayload
  ): Promise<MarketingReviewResponse> => {
    const response = await api.patch<MarketingReviewResponse>(
      `/marketing-reviews/${reviewId}`,
      data
    );
    return response.data;
  },
};

export default marketingApi;
