import api from "./baseApi";

export interface BulkMarkReadResponse {
  success: boolean;
  markedCount: number;
  markedIds: string[];
}

const notificationApi = {
  bulkMarkRead: async (ids: string[]): Promise<BulkMarkReadResponse> => {
    const response = await api.patch<BulkMarkReadResponse>(
      "/notifications/bulk-read",
      { ids }
    );
    return response.data;
  },
};

export default notificationApi;
