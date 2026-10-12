import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLogin = err.config?.url?.includes("/auth/login");
    if (err.response?.status === 401 && !isLogin) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// Turns an API/axios error into one readable string.
export function errorMessage(err) {
  const d = err.response?.data;
  if (!d) return err.message === "Network Error" ? "Cannot reach the server. Is it running?" : err.message;
  if (Array.isArray(d.details) && d.details.length) {
    return d.details.map((x) => `${x.field}: ${x.message}`).join("; ");
  }
  return d.message || "Something went wrong";
}

export default api;