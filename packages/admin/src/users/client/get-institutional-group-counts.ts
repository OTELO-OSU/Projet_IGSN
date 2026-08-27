import type { InstitutionalGroupCounts } from "@projet-igsn/domain/user/user-validator";

import { institutionalGroupCountsResponseSchema } from "@projet-igsn/domain/user/user-validator";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";

export async function getInstitutionalGroupCounts(
  apiFetch: typeof fetch,
): Promise<InstitutionalGroupCounts> {
  const res = await apiFetch(
    new URL("admin/users/institutional-counts", API_URL),
  );
  if (!res.ok) {
    throw HttpError.fromResponse(
      res,
      `Failed to load the institutional group member counts (${res.status})`,
    );
  }
  const { data } = institutionalGroupCountsResponseSchema.parse(
    await res.json(),
  );
  return data;
}
