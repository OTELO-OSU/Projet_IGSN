const url = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export const API_URL = url.endsWith("/") ? url : `${url}/`;
