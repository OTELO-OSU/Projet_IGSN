import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { apiOk, HttpError } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";
import { invalidateUserAndGroups } from "#/users/invalidate-user-and-groups.ts";

export type ManualGroupMembership = { groupId: string; userId: string };

export function useAddManualGroupMember() {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userId }: ManualGroupMembership) => {
      await apiOk(
        apiFetch,
        new URL(`admin/manual-groups/${groupId}/members`, API_URL),
        "Failed to associate the user",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ userId }),
        },
      );
    },
    onSuccess: async (_data, { userId }) => {
      toast.success(m.manual_group_member_added());
      await invalidateUserAndGroups(queryClient, userId);
    },
    onError: (error) =>
      toast.error(
        error instanceof HttpError && error.status === 422
          ? m.manual_group_member_not_validated()
          : m.manual_group_member_add_error(),
      ),
  });
}
