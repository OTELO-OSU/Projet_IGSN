import { getClientIp } from "./client-ip.ts";

// The browser reaches the api at its public URL (VITE_API_URL, baked at build);
// during SSR the frontend server reaches it on the internal network (API_URL,
// read at runtime). In docker dev these differ: localhost:3002 vs api:3002.
export const apiUrl =
  (import.meta.env.SSR ? process.env.API_URL : import.meta.env.VITE_API_URL) ??
  "http://localhost:3002";

export const baseApiUrl = apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`;

// On SSR every api call would otherwise come from the frontend container's own
// address, so all readers would share one per-IP rate-limit budget. Forward the
// visitor address the server entry stored for this request instead.
export const apiFetch: typeof fetch = async (input, init) => {
  const ip = import.meta.env.SSR ? await getClientIp() : undefined;
  if (!ip) return fetch(input, init);

  const headers = new Headers(init?.headers);
  headers.set("X-Real-IP", ip);
  return fetch(input, { ...init, headers });
};
