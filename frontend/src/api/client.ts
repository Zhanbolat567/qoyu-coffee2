import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8007",
  withCredentials: true, // обязательно для HttpOnly-cookie
});

export default api;

export function extractError(err: any): string {
  const d = err?.response?.data;
  if (!d) return err?.message || "Ошибка запроса";
  if (typeof d?.detail === "string") return d.detail;
  if (Array.isArray(d?.detail)) return d.detail.map((e: any) => e?.msg || "").join(", ");
  return d?.message || "Ошибка запроса";
}
