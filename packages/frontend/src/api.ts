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

// ponytail: the cast claims Date for createdAt/updatedAt where JSON carries a string, safe while the frontend reads neither
export async function apiJson<T>(res: Response, what: string): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to load ${what} (${res.status}): ${body}`);
  }
  return (await res.json()) as T;
}
