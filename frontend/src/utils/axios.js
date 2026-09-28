import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL,
  withCredentials: true,
  timeout: 90000, // 90s — Render free tier can take 50s+ to cold-start
});

export default api;