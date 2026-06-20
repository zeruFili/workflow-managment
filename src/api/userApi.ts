import api from "./baseApi";

export interface UserItem {
  id: string;
  full_name: string;
  email: string;
  role: string;
  phone: string | null;
  last_login_at: string | null;
  is_active: boolean;
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

export interface CreateUserPayload {
  full_name: string;
  email: string;
  password: string;
  role: string;
  phone?: string;
}

export interface UpdateUserPayload {
  full_name?: string;
  email?: string;
  role?: string;
  phone?: string;
  password?: string;
  is_active?: boolean;
}

export interface UserActionResponse {
  success: boolean;
  message: string;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  role?: string;
  is_active?: boolean;
  search?: string;
}

const userApi = {
  getUsers: async (params?: GetUsersParams): Promise<UserListResponse> => {
    const response = await api.get<UserListResponse>("/users", { params });
    return response.data;
  },

  createUser: async (payload: CreateUserPayload): Promise<UserActionResponse> => {
    const response = await api.post<UserActionResponse>("/users", payload);
    return response.data;
  },

  updateUser: async (id: string, payload: UpdateUserPayload): Promise<UserActionResponse> => {
    const response = await api.patch<UserActionResponse>(`/users/${id}`, payload);
    return response.data;
  },

  deleteUser: async (id: string): Promise<UserActionResponse> => {
    const response = await api.delete<UserActionResponse>(`/users/${id}`);
    return response.data;
  },

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
