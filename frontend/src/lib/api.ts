import axios from "axios";

const apiHost = import.meta.env.VITE_API_URL ?? "https://api.allentiomolu.com.br";
const baseURL = apiHost.replace(/\/+$/, "") + "/api";

const api = axios.create({
  baseURL,
});

export default api;
