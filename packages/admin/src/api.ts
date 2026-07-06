import { API_URL } from "./api-url.ts";
import { userManager } from "./auth/oidc-config.ts";

export type Me = {
  sub: string;
  username?: string;
  name?: string;
  email?: string;
};

const getMe = (token: string) =>
  fetch(`${API_URL}/me`, { headers: { Authorization: `Bearer ${token}` } });

// Calls the protected /me route with the Keycloak access token. On 401 the
// session is renewed once via the refresh token and the call retried; if the
// renewal fails, fall back to an interactive sign-in (GT-SSO REQ-TOKEN-01).
// Throws on any other non-2xx.
export async function fetchMe(token: string): Promise<Me> {
  let res = await getMe(token);
  if (res.status === 401) {
    const renewed = await userManager.signinSilent().catch(() => null);
    if (!renewed) {
      void userManager.signinRedirect();
      throw new Error("Session expired");
    }
    res = await getMe(renewed.access_token);
  }
  if (!res.ok) throw new Error(`API responded ${res.status}`);
  return res.json() as Promise<Me>;
}
