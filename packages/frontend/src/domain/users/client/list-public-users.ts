import type {
  PublicUser,
  PublicUsersResponse,
} from "@projet-igsn/domain/user/user-validator";

import { apiFetch, apiJson, baseApiUrl } from "#/api.ts";

export async function listPublicUsers(
  include?: string,
  fetchFn: typeof fetch = apiFetch,
): Promise<PublicUser[]> {
  const url = new URL("users", baseApiUrl);
  if (include) {
    url.searchParams.set("include", include);
  }
  const res = await fetchFn(url);
  const { data } = await apiJson<PublicUsersResponse>(res, "users");
  return data;
}
