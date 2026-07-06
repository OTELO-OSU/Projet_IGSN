// The api base URL is baked at build time (Vite). Defaults to the dev api; e2e
// and prod override it via VITE_API_URL.
export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3002";
