import api from "./baseApi";

// ── Backend response types (match backend exactly) ──

export interface SafeUserOutput {
  id: string;
  full_name: string;
  role: string;
}

export interface DataCollectorSubmissionReview {
  id: string;
  data_collector_submission_id: string;
  reviewer_user_id: string;
  reviewer_user: SafeUserOutput;
  review_outcome: string;
  description: string;
  created_at: string;
  updated_at: string | null;
  hasNotification: boolean;
  notificationId: string | null;
}

export interface DataCollectorSubmissionRaw {
  id: string;
  data_collector_task_id: string;
  description: string;
  attachment_urls: string[] | null;
  created_at: string;
  updated_at: string | null;
  reviews: DataCollectorSubmissionReview[];
}

export interface DataCollectorSubmissionWrapper {
  submissionId: string;
  hasNotification: boolean;
  notificationId: string | null;
  submission: DataCollectorSubmissionRaw;
}

export interface DataCollectorSubmissionsWithReviews {
  submissions: DataCollectorSubmissionWrapper[];
  latestActivityTs: number;
}

export interface DataCollectorTaskItem {
  id: string;
  assigned_to_user_id: string | null;
  assigned_by_user_id: string;
  title: string;
  description: string;
  status: string | null;
  task_state: string;
  due_date: string | null;
  attachment_urls: string[] | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string | null;
  assigned_by_user: SafeUserOutput;
  assigned_to_user: SafeUserOutput | null;
  updated_by_user: SafeUserOutput | null;
  submissionsWithReviews: DataCollectorSubmissionsWithReviews;
  taskNotification: {
    hasNotification: boolean;
    notificationId: string | null;
  };
  hasNestedNotification: boolean;
}

export interface DataCollectorTaskListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DataCollectorTaskListResponse {
  success: boolean;
  data: DataCollectorTaskItem[];
  meta: DataCollectorTaskListMeta;
  message?: string;
}

// ── Create Task ──

export interface CreateDataCollectorTaskResponse {
  success: boolean;
  data?: DataCollectorTaskItem;
  message?: string;
}

// ── Create Submission ──

export interface CreatedSubmission {
  id: string;
  data_collector_task_id: string;
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

// ── Create / Update Review ──

export interface CreateReviewPayload {
  description: string;
  review_outcome: string;
  task_state: string;
}

export interface ReviewResponse {
  success: boolean;
  data?: DataCollectorSubmissionReview;
  message?: string;
}

// ── Query params ──

export interface TaskListParams {
  page?: number;
  limit?: number;
  status?: string;
  assignedTo?: string;
  search?: string;
}

// ── API functions ──

const dataCollectorApi = {
  getDataCollectorTasks: async (
    params: TaskListParams = {}
  ): Promise<DataCollectorTaskListResponse> => {
    const response = await api.get<DataCollectorTaskListResponse>(
      "/data-collector-tasks",
      { params }
    );
    return response.data;
  },

  createDataCollectorTask: async (
    data: FormData
  ): Promise<CreateDataCollectorTaskResponse> => {
    const response = await api.post<CreateDataCollectorTaskResponse>(
      "/data-collector-tasks",
      data
    );
    return response.data;
  },

  createSubmission: async (
    taskId: string,
    data: FormData
  ): Promise<CreateSubmissionResponse> => {
    const response = await api.post<CreateSubmissionResponse>(
      `/data-collector-tasks/${taskId}/submissions`,
      data
    );
    return response.data;
  },

  createReview: async (
    submissionId: string,
    data: CreateReviewPayload
  ): Promise<ReviewResponse> => {
    const response = await api.post<ReviewResponse>(
      `/data-collector-submissions/${submissionId}/review`,
      data
    );
    return response.data;
  },

  updateReview: async (
    reviewId: string,
    data: CreateReviewPayload
  ): Promise<ReviewResponse> => {
    const response = await api.patch<ReviewResponse>(
      `/data-collector-reviews/${reviewId}`,
      data
    );
    return response.data;
  },

  updateSubmission: async (
    submissionId: string,
    data: FormData
  ): Promise<CreateSubmissionResponse> => {
    const response = await api.patch<CreateSubmissionResponse>(
      `/data-collector-tasks/submit/${submissionId}`,
      data
    );
    return response.data;
  },
};

export default dataCollectorApi;
