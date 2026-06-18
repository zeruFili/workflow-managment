import api from "./baseApi";

export interface UserItem {
  id: string;
  full_name: string;
  email: string;
  role: string;
  phone: string | null;
}

export interface UserListResponse {
  success: boolean;
  data: UserItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const userApi = {
  getDesigners: async (): Promise<UserListResponse> => {
    const response = await api.get<UserListResponse>("/users", {
      params: { role: "designer", is_active: true, limit: 100 },
    });
    return response.data;
  },

  getDataCollectors: async (): Promise<UserListResponse> => {
    const response = await api.get<UserListResponse>("/users", {
      params: { role: "data_collector", is_active: true, limit: 100 },
    });
    return response.data;
  },

  getQuantitySurveyors: async (): Promise<UserListResponse> => {
    const response = await api.get<UserListResponse>("/users", {
      params: { role: "quantity_surveyor", is_active: true, limit: 100 },
    });
    return response.data;
  },
};

export default userApi;
