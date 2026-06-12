import api from "./baseApi";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginUser {
  id: string;
  full_name: string;
  role: string;
}

export interface LoginData {
  accessToken: string;
  user: LoginUser;
}

export interface LoginApiResponse {
  success: boolean;
  message: string;
  data?: LoginData;
  errors?: string[];
}

const loginApi = {
  login: async (data: LoginPayload): Promise<LoginApiResponse> => {
    const response = await api.post<LoginApiResponse>("auth/login", data);
    return response.data;
  },
};

export default loginApi;
