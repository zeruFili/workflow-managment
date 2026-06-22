import api from "./baseApi";

export interface SafeUserOutput {
  id: string;
  full_name: string;
  role: string;
}

export interface CeoTransferItem {
  id: string;
  finance_user_id: string;
  ceo_user_id: string;
  description: string;
  amount: number;
  attachment_urls: string[] | null;
  created_at: string;
  updated_at: string | null;
  finance_user: SafeUserOutput;
  ceo_user: SafeUserOutput;
}

export interface CeoTransferListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CeoTransferListResponse {
  success: boolean;
  data: CeoTransferItem[];
  meta: CeoTransferListMeta;
  message?: string;
}

export interface CeoTransferDetailResponse {
  success: boolean;
  data: CeoTransferItem;
  message?: string;
}

export interface CeoTransferActionResponse {
  success: boolean;
  data?: CeoTransferItem;
  message?: string;
}

export interface CeoTransferListParams {
  page?: number;
  limit?: number;
}

const ceoTransferApi = {
  getCeoTransfers: async (params: CeoTransferListParams = {}): Promise<CeoTransferListResponse> => {
    const response = await api.get<CeoTransferListResponse>("/ceo-transfers", { params });
    return response.data;
  },

  getCeoTransferById: async (id: string): Promise<CeoTransferDetailResponse> => {
    const response = await api.get<CeoTransferDetailResponse>(`/ceo-transfers/${id}`);
    return response.data;
  },

  createCeoTransfer: async (data: FormData): Promise<CeoTransferActionResponse> => {
    const response = await api.post<CeoTransferActionResponse>("/ceo-transfers", data);
    return response.data;
  },

  updateCeoTransfer: async (id: string, data: FormData | Record<string, unknown>): Promise<CeoTransferActionResponse> => {
    const response = await api.patch<CeoTransferActionResponse>(`/ceo-transfers/${id}`, data);
    return response.data;
  },

  deleteCeoTransfer: async (id: string): Promise<CeoTransferActionResponse> => {
    const response = await api.delete<CeoTransferActionResponse>(`/ceo-transfers/${id}`);
    return response.data;
  },
};

export default ceoTransferApi;
