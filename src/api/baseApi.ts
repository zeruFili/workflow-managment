import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";
import Cookies from "js-cookie";

const BASE_URL = "http://localhost:3001/api/v1/";

const api: AxiosInstance = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (!(config.data instanceof FormData) && config.method !== "delete") {
      config.headers["Content-Type"] = "application/json";
    }

    const token = Cookies.get("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    return config;
  }
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,

  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      Cookies.remove("token");
      Cookies.remove("user");
      window.dispatchEvent(new CustomEvent('auth:session-expired'));
    }

    return Promise.reject(error);
  }
);

export default api;
