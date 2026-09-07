import type { ServiceAccount } from "@projet-igsn/domain/service-account/model";
import type { ServiceAccountBody } from "@projet-igsn/domain/service-account/service-account-validator";

import { serviceAccountResponseSchema } from "@projet-igsn/domain/service-account/service-account-validator";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";

export async function updateServiceAccount(
  apiFetch: typeof fetch,
  id: string,
  body: ServiceAccountBody,
): Promise<ServiceAccount> {
  const res = await apiFetch(new URL(`admin/service-accounts/${id}`, API_URL), {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw HttpError.fromResponse(
      res,
      `Failed to update the service account (${res.status})`,
    );
  }
  return serviceAccountResponseSchema.parse(await res.json()).data;
}
