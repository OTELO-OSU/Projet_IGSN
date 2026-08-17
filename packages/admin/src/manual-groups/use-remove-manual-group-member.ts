import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export function useRemoveManualGroupMember(groupId: string) {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
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
    onSuccess: () => {
      toast.success(m.manual_group_member_removed());
      return queryClient.invalidateQueries({ queryKey: ["manual-groups"] });
    },
    onError: () => toast.error(m.manual_group_member_remove_error()),
  });
}
