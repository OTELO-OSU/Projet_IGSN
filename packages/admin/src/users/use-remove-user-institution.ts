import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";
import { invalidateUserAndGroups } from "#/users/invalidate-user-and-groups.ts";

export function useRemoveUserInstitution() {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiFetch(
        new URL(`admin/users/${userId}/institutional-groups`, API_URL),
        { method: "DELETE" },
      );
      if (!res.ok) {
        throw HttpError.fromResponse(
          res,
          `Failed to remove the institution (${res.status})`,
        );
      }
    },
    onSuccess: async (_data, userId) => {
      toast.success(m.user_remove_institution_success());
      await invalidateUserAndGroups(queryClient, userId);
    },
    onError: () => toast.error(m.user_remove_institution_error()),
  });
}
