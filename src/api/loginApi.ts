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

export interface ForgotPasswordPayload {
  email: string;
}

export interface ForgotPasswordApiResponse {
  success: boolean;
  message: string;
}

export interface ResetPasswordPayload {
  password: string;
  confirmPassword: string;
}

export interface ResetPasswordApiResponse {
  success: boolean;
  message: string;
  errors?: string[];
}

const loginApi = {
  login: async (data: LoginPayload): Promise<LoginApiResponse> => {
    const response = await api.post<LoginApiResponse>("auth/login", data);
    return response.data;
  },

  forgotPassword: async (data: ForgotPasswordPayload): Promise<ForgotPasswordApiResponse> => {
    const response = await api.post<ForgotPasswordApiResponse>("auth/forgot-password", data);
    return response.data;
  },

  resetPassword: async (token: string, data: ResetPasswordPayload): Promise<ResetPasswordApiResponse> => {
    const response = await api.post<ResetPasswordApiResponse>(`auth/reset-password/${token}`, data);
    return response.data;
  },
};

export default loginApi;
