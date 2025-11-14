import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL ?? "https://api.allentiomolu.com.br";

const api = axios.create({
  baseURL,
});

export default api;
