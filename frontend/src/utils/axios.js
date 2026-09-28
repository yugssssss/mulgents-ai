import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL,
  withCredentials: true,
  timeout: 130000, // 130s: 120s proxy timeout + 10s buffer for Render cold-starts
});

export default api;