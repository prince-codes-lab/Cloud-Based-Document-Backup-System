import axios from "axios";

// In production, set VITE_API_URL to your deployed backend, e.g.
// https://your-backend.onrender.com/api
// In local dev this falls back to "/api", which Vite proxies to localhost:5000.
const baseURL = import.meta.env.VITE_API_URL || "/api";

const client = axios.create({ baseURL });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default client;
