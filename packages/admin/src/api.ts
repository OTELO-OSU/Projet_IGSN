// The api base URL is baked at build time (Vite). Defaults to the dev api; e2e
// and prod override it via VITE_API_URL.
const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3002";

export type Me = {
  sub: string;
  username?: string;
  name?: string;
  email?: string;
};

// Calls the protected /me route with the Keycloak access token; throws on non-2xx.
export async function fetchMe(token: string): Promise<Me> {
  const res = await fetch(`${apiUrl}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`API responded ${res.status}`);
  return res.json() as Promise<Me>;
}
