import api from "./baseApi";

export interface BulkMarkReadResponse {
  success: boolean;
  markedCount: number;
  markedIds: string[];
}

export interface MarkReadResponse {
  success: boolean;
  data: {
    id: string;
    user_id: string;
    from_user_id: string;
    resource_id: string;
    resource_type: string;
    parent_id: string;
    parent_type: string | null;
    type: string;
    viewed: boolean;
    created_at: string;
    updated_at: string;
  };
}

export interface UnreadCountsResponse {
  marketingTasks: number;
  dataCollectorTasks: number;
  quantitySurveyorTasks: number;
  designerTasks: number;
  designerJobPostings: number;
}

const notificationApi = {
  bulkMarkRead: async (ids: string[]): Promise<BulkMarkReadResponse> => {
    const response = await api.patch<BulkMarkReadResponse>(
      "/notifications/bulk-read",
      { ids }
    );
    return response.data;
  },

  markRead: async (notificationId: string): Promise<MarkReadResponse> => {
    const response = await api.patch<MarkReadResponse>(
      `/notifications/${notificationId}/read`
    );
    return response.data;
  },

  getUnreadCounts: async (parentTypes?: string[]): Promise<UnreadCountsResponse> => {
    const params = parentTypes?.length ? `?parentType=${parentTypes.join(",")}` : "";
    const response = await api.get<UnreadCountsResponse>(`/notifications/unread-counts${params}`);
    return response.data;
  },
};

export default notificationApi;
