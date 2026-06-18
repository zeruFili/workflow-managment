import api from "./baseApi";

export interface SafeUserOutput {
  id: string;
  full_name: string;
  role: string;
}

export interface QuantitySurveyorSubmissionReview {
  id: string;
  quantity_surveyor_submission_id: string;
  reviewer_user_id: string;
  reviewer_user: SafeUserOutput;
  review_outcome: string;
  description: string;
  created_at: string;
  updated_at: string | null;
  hasNotification: boolean;
  notificationId: string | null;
}

export interface QuantitySurveyorSubmissionRaw {
  id: string;
  quantity_surveyor_task_id: string;
  description: string;
  attachment_urls: string[] | null;
  created_at: string;
  updated_at: string | null;
  review_status?: string;
  reviews: QuantitySurveyorSubmissionReview[];
}

export interface QuantitySurveyorSubmissionWrapper {
  submissionId: string;
  hasNotification: boolean;
  notificationId: string | null;
  submission: QuantitySurveyorSubmissionRaw;
}

export interface QuantitySurveyorSubmissionsWithReviews {
  submissions: QuantitySurveyorSubmissionWrapper[];
  latestActivityTs: number;
}

export interface QuantitySurveyorTaskItem {
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
  submissionsWithReviews: QuantitySurveyorSubmissionsWithReviews;
  taskNotification: {
    hasNotification: boolean;
    notificationId: string | null;
  };
  hasNestedNotification: boolean;
}

export interface QuantitySurveyorTaskListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QuantitySurveyorTaskListResponse {
  success: boolean;
  data: QuantitySurveyorTaskItem[];
  meta: QuantitySurveyorTaskListMeta;
  message?: string;
}

export interface CreateQuantitySurveyorTaskResponse {
  success: boolean;
  data?: QuantitySurveyorTaskItem;
  message?: string;
}

export interface CreatedSubmission {
  id: string;
  quantity_surveyor_task_id: string;
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

export interface CreateReviewPayload {
  description: string;
  review_outcome: string;
  task_state?: string;
}

export interface ReviewResponse {
  success: boolean;
  data?: QuantitySurveyorSubmissionReview;
  message?: string;
}

export interface TaskListParams {
  page?: number;
  limit?: number;
  status?: string;
  assignedTo?: string;
  search?: string;
}

const quantitySurveyorApi = {
  getTasks: async (
    params: TaskListParams = {}
  ): Promise<QuantitySurveyorTaskListResponse> => {
    const response = await api.get<QuantitySurveyorTaskListResponse>(
      "/qs-tasks",
      { params }
    );
    return response.data;
  },

  createTask: async (
    data: FormData
  ): Promise<CreateQuantitySurveyorTaskResponse> => {
    const response = await api.post<CreateQuantitySurveyorTaskResponse>(
      "/qs-tasks",
      data
    );
    return response.data;
  },

  createSubmission: async (
    taskId: string,
    data: FormData
  ): Promise<CreateSubmissionResponse> => {
    const response = await api.post<CreateSubmissionResponse>(
      `/qs-tasks/${taskId}/submissions`,
      data
    );
    return response.data;
  },

  createReview: async (
    submissionId: string,
    data: CreateReviewPayload
  ): Promise<ReviewResponse> => {
    const response = await api.post<ReviewResponse>(
      `/qs-submissions/${submissionId}/review`,
      data
    );
    return response.data;
  },

  updateReview: async (
    reviewId: string,
    data: CreateReviewPayload
  ): Promise<ReviewResponse> => {
    const response = await api.patch<ReviewResponse>(
      `/qs-reviews/${reviewId}`,
      data
    );
    return response.data;
  },

  updateSubmission: async (
    submissionId: string,
    data: FormData
  ): Promise<CreateSubmissionResponse> => {
    const response = await api.patch<CreateSubmissionResponse>(
      `/qs-tasks/submit/${submissionId}`,
      data
    );
    return response.data;
  },

  updateTask: async (
    taskId: string,
    data: FormData | Record<string, unknown>
  ): Promise<CreateQuantitySurveyorTaskResponse> => {
    const response = await api.patch<CreateQuantitySurveyorTaskResponse>(
      `/qs-tasks/${taskId}`,
      data
    );
    return response.data;
  },
};

export default quantitySurveyorApi;
