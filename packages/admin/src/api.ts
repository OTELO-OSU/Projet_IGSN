import { API_URL } from "./api-url.ts";
import { HttpError } from "./http-error.ts";
import { withAuthToken, withSessionRenewal } from "./use-api-client.ts";

export type Me = {
  sub: string;
  username?: string;
  name?: string;
  email?: string;
};

export async function fetchMe(token: string): Promise<Me> {
  const apiFetch = withSessionRenewal(withAuthToken(fetch, token));
  const res = await apiFetch(`${API_URL}/admin/me`);
  if (!res.ok) throw new HttpError(res.status, `API responded ${res.status}`);
  return res.json() as Promise<Me>;
}
