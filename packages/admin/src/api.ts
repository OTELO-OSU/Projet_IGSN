import {
  type CurrentUser,
  currentUserSchema,
} from "@projet-igsn/domain/user/current-user";

import { API_URL } from "./api-url.ts";
import { HttpError } from "./http-error.ts";
import { withAuthToken, withSessionRenewal } from "./use-api-client.ts";

export async function fetchCurrentUser(token: string): Promise<CurrentUser> {
  const apiFetch = withSessionRenewal(withAuthToken(fetch, token));
  const res = await apiFetch(`${API_URL}/admin/currentUser`);
  if (!res.ok) {
    throw HttpError.fromResponse(res, `API responded ${res.status}`);
  }
  return currentUserSchema.parse(await res.json());
}
