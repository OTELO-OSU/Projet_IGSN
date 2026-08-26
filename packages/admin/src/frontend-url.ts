export const FRONTEND_URL =
  import.meta.env.VITE_FRONTEND_URL ?? "http://localhost:3000";

export const frontendSearchUrl = (filters: Record<string, string>) =>
  `${FRONTEND_URL}/search?${new URLSearchParams(filters)}`;
