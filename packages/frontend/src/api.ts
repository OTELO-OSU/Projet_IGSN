import { getClientIp } from "./client-ip.ts";

const DEFAULT_API_URL = "http://localhost:3000/api";

const withSlash = (url: string) => (url.endsWith("/") ? url : `${url}/`);

export const baseBrowserApiUrl = withSlash(
  import.meta.env.VITE_API_URL || DEFAULT_API_URL,
);

export const baseApiUrl = import.meta.env.SSR
  ? withSlash(process.env.API_URL || DEFAULT_API_URL)
  : baseBrowserApiUrl;

export const apiFetch: typeof fetch = async (input, init) => {
  const ip = import.meta.env.SSR ? await getClientIp() : undefined;
  if (!ip) return fetch(input, init);

  const headers = new Headers(init?.headers);
  headers.set("X-Real-IP", ip);
  return fetch(input, { ...init, headers });
};
