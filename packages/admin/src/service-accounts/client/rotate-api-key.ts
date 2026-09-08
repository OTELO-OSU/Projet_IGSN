import type { ApiKeyResponse } from "@projet-igsn/domain/service-account/service-account-validator";

import { apiKeyResponseSchema } from "@projet-igsn/domain/service-account/service-account-validator";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";

export async function rotateApiKey(
  apiFetch: typeof fetch,
  id: string,
): Promise<ApiKeyResponse> {
  const res = await apiFetch(
    new URL(`admin/currentUser/service-accounts/${id}/api-key`, API_URL),
    { method: "POST" },
  );
  if (!res.ok) {
    throw HttpError.fromResponse(
      res,
      `Failed to generate the API key (${res.status})`,
    );
  }
  return apiKeyResponseSchema.parse(await res.json());
}
