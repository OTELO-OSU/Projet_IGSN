import type { AdminUserResponse } from "@projet-igsn/domain/user/user-validator";

import { useQuery } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useUser(id: string) {
  const apiFetch = useApiClient();
  return useQuery({
    queryKey: ["user", id],
    queryFn: async () => {
      const res = await apiFetch(new URL(`admin/users/${id}`, API_URL));
      if (res.status === 404) return null;
      if (!res.ok) {
        throw HttpError.fromResponse(
          res,
          `Failed to load user (${res.status})`,
        );
      }
      return ((await res.json()) as AdminUserResponse).data;
    },
  });
}
