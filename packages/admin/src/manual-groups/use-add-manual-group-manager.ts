import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";
import { invalidateUserAndGroups } from "#/users/invalidate-user-and-groups.ts";

export type ManualGroupManagement = { groupId: string; userId: string };

export function useAddManualGroupManager() {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userId }: ManualGroupManagement) => {
      const res = await apiFetch(
        new URL(`admin/manual-groups/${groupId}/managers`, API_URL),
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ userId }),
        },
      );
      if (!res.ok) {
        throw HttpError.fromResponse(
          res,
          `Failed to add the manager (${res.status})`,
        );
      }
    },
    onSuccess: async (_data, { userId }) => {
      toast.success(m.group_manager_added());
      await invalidateUserAndGroups(queryClient, userId);
    },
    onError: (error) =>
      toast.error(
        error instanceof HttpError && error.status === 422
          ? m.group_manager_not_validated()
          : m.group_manager_add_error(),
      ),
  });
}
