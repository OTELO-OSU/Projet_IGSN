import { getClientIp } from "./client-ip.ts";

export const apiUrl =
  (import.meta.env.SSR ? process.env.API_URL : import.meta.env.VITE_API_URL) ??
  "http://localhost:3002";

export const baseApiUrl = apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`;

export const apiFetch: typeof fetch = async (input, init) => {
  const ip = import.meta.env.SSR ? await getClientIp() : undefined;
  if (!ip) return fetch(input, init);

  const headers = new Headers(init?.headers);
  headers.set("X-Real-IP", ip);
  return fetch(input, { ...init, headers });
};
