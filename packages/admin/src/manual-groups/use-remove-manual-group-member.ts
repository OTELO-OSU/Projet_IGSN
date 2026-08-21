import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";
import { invalidateUserAndGroups } from "#/users/invalidate-user-and-groups.ts";

import { type ManualGroupMembership } from "./use-add-manual-group-member.ts";

export function useRemoveManualGroupMember() {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userId }: ManualGroupMembership) => {
      const res = await apiFetch(
        new URL(`admin/manual-groups/${groupId}/members/${userId}`, API_URL),
        { method: "DELETE" },
      );
      if (!res.ok) {
        throw HttpError.fromResponse(
          res,
          `Failed to detach the member (${res.status})`,
        );
      }
    },
    onSuccess: async (_data, { userId }) => {
      toast.success(m.manual_group_member_removed());
      await invalidateUserAndGroups(queryClient, userId);
    },
    onError: (error) =>
      toast.error(
        error instanceof HttpError && error.status === 409
          ? m.manual_group_detach_published()
          : m.manual_group_member_remove_error(),
      ),
  });
}
