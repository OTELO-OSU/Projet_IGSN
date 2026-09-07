import type { ServiceAccount } from "@projet-igsn/domain/service-account/model";

import { serviceAccountResponseSchema } from "@projet-igsn/domain/service-account/service-account-validator";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";

export async function getServiceAccountById(
  apiFetch: typeof fetch,
  id: string,
): Promise<ServiceAccount | null> {
  const res = await apiFetch(new URL(`admin/service-accounts/${id}`, API_URL));
  if (res.status === 404) return null;
  if (!res.ok) {
    throw HttpError.fromResponse(
      res,
      `Failed to load the service account (${res.status})`,
    );
  }
  return serviceAccountResponseSchema.parse(await res.json()).data;
}
