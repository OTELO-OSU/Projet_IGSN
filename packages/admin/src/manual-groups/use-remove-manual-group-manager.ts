import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";
import { invalidateUserAndGroups } from "#/users/invalidate-user-and-groups.ts";

import { type ManualGroupManagement } from "./use-add-manual-group-manager.ts";

export function useRemoveManualGroupManager() {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userId }: ManualGroupManagement) => {
      const res = await apiFetch(
        new URL(`admin/manual-groups/${groupId}/managers/${userId}`, API_URL),
        { method: "DELETE" },
      );
      if (!res.ok) {
        throw HttpError.fromResponse(
          res,
          `Failed to remove the manager (${res.status})`,
        );
      }
    },
    onSuccess: async (_data, { userId }) => {
      toast.success(m.group_manager_removed());
      await invalidateUserAndGroups(queryClient, userId);
    },
    onError: () => toast.error(m.group_manager_remove_error()),
  });
}
