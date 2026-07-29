import { type Me, meSchema } from "@projet-igsn/domain/user/me";

import { API_URL } from "./api-url.ts";
import { HttpError } from "./http-error.ts";
import { withAuthToken, withSessionRenewal } from "./use-api-client.ts";

export async function fetchMe(token: string): Promise<Me> {
  const apiFetch = withSessionRenewal(withAuthToken(fetch, token));
  const res = await apiFetch(`${API_URL}/admin/me`);
  if (!res.ok) {
    throw HttpError.fromResponse(res, `API responded ${res.status}`);
  }
  return meSchema.parse(await res.json());
}
