import { serviceAccountResponseSchema } from "@projet-igsn/domain/service-account/service-account-validator";
import { useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useGetServiceAccountById(id: string) {
  const apiFetch = useApiClient();
  return useQuery({
    queryKey: ["service-accounts", "detail", id],
    queryFn: async () => {
      const res = await apiFetch(
        new URL(`admin/service-accounts/${id}`, API_URL),
      );
      if (res.status === 404) return null;
      if (!res.ok) {
        throw HttpError.fromResponse(
          res,
          `Failed to load the service account (${res.status})`,
        );
      }
      return serviceAccountResponseSchema.parse(await res.json()).data;
    },
  });
}
