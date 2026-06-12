import Cookies from "js-cookie";
import loginApi, { LoginPayload } from "../api/loginApi";
import { User, UserRole } from "../app/types";

function mapBackendRoleToFrontend(backendRole: string): UserRole {
  const roleMap: Record<string, UserRole> = {
    ceo: "ceo",
    general_manager: "general_manager",
    marketing: "marketing_lead",
    finance: "finance_officer",
    designer: "designer",
    quantity_surveyor: "quantity_surveyor",
    data_collector: "data_collector",
  };
  return roleMap[backendRole] ?? (backendRole as UserRole);
}

export interface LoginResult {
  success: boolean;
  user?: User;
  message?: string;
  errors?: string[];
}

export async function loginUser(
  email: string,
  password: string
): Promise<LoginResult> {
  const data: LoginPayload = { email, password };

  try {
    const response = await loginApi.login(data);

    if (response.success && response.data) {
      const { accessToken, user: apiUser } = response.data;

      const user: User = {
        id: apiUser.id,
        full_name: apiUser.full_name,
        role: mapBackendRoleToFrontend(apiUser.role),
      };

      Cookies.set("token", accessToken);
      Cookies.set("user", JSON.stringify(user));

      return { success: true, user };
    }

    return {
      success: false,
      message: response.message || "Login failed",
      errors: response.errors,
    };
  } catch (e: unknown) {
    if (
      e &&
      typeof e === "object" &&
      "response" in e &&
      e.response &&
      typeof e.response === "object" &&
      "data" in e.response
    ) {
      const errData = (e as { response: { data: { success?: boolean; message?: string; errors?: string[] } } }).response.data;
      return {
        success: false,
        message: errData?.message || "Invalid email or password",
        errors: errData?.errors,
      };
    }

    return {
      success: false,
      message: "Unable to connect to the server. Please check your connection.",
    };
  }
}
