import { API_URL } from "./api-url.ts";
import { withAuthToken, withSessionRenewal } from "./use-api-client.ts";

export type Me = {
  sub: string;
  username?: string;
  name?: string;
  email?: string;
};

// Calls the protected /admin/me route with the Keycloak access token through
// the shared authed client, so a 401 renews the session and retries (or falls
// back to interactive sign-in) exactly like every other authed call. Throws on
// any other non-2xx.
export async function fetchMe(token: string): Promise<Me> {
  const apiFetch = withSessionRenewal(withAuthToken(fetch, token));
  const res = await apiFetch(`${API_URL}/admin/me`);
  if (!res.ok) throw new Error(`API responded ${res.status}`);
  return res.json() as Promise<Me>;
}
