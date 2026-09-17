import type { UpdateUser } from "@projet-igsn/domain/user/user-validator";

import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { adminUserResponseSchema } from "@projet-igsn/domain/user/user-validator";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { apiJson, HttpError } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";
import { invalidateUserAndGroups } from "#/users/invalidate-user-and-groups.ts";

export function useUpdateUser(id: string) {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (user: UpdateUser) => {
      const { data } = await apiJson(
        apiFetch,
        new URL(`admin/users/${id}`, API_URL),
        adminUserResponseSchema,
        "Failed to update the account",
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(user),
        },
      );
      return data;
    },
    onSuccess: async () => {
      toast.success(m.user_status_success());
      await invalidateUserAndGroups(queryClient, id);
    },
    onError: (error) =>
      toast.error(
        error instanceof HttpError && error.status === 409
          ? m.manual_group_detach_published()
          : m.user_status_error(),
      ),
  });
}
