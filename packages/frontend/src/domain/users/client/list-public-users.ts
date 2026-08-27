import type { PublicUser } from "@projet-igsn/domain/user/user-validator";

import { publicUsersResponseSchema } from "@projet-igsn/domain/user/user-validator";

import { apiFetch, baseApiUrl } from "#/api.ts";

export async function listPublicUsers(
  include?: string,
  fetchFn: typeof fetch = apiFetch,
): Promise<PublicUser[]> {
  const url = new URL("users", baseApiUrl);
  if (include) {
    url.searchParams.set("include", include);
  }
  const res = await fetchFn(url);
  if (!res.ok) {
    throw new Error(`Failed to load users (${res.status})`);
  }
  const { data } = publicUsersResponseSchema.parse(await res.json());
  return data;
}
