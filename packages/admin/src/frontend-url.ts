// The public frontend base URL is baked at build time (Vite). Defaults to the
// dev frontend; e2e and prod override it via VITE_FRONTEND_URL.
export const FRONTEND_URL =
  import.meta.env.VITE_FRONTEND_URL ?? "http://localhost:3000";
