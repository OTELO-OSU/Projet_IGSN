import type { AddManualGroupMemberBody } from "@projet-igsn/domain/manual-group/manual-group-validator";

import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export function useAddManualGroupMember(groupId: string) {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: AddManualGroupMemberBody) => {
      const res = await apiFetch(
        new URL(`admin/manual-groups/${groupId}/members`, API_URL),
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        throw HttpError.fromResponse(
          res,
          `Failed to associate the user (${res.status})`,
        );
      }
    },
    onSuccess: () => {
      toast.success(m.manual_group_member_added());
      return queryClient.invalidateQueries({ queryKey: ["manual-groups"] });
    },
    onError: (error) =>
      toast.error(
        error instanceof HttpError && error.status === 422
          ? m.manual_group_member_not_validated()
          : m.manual_group_member_add_error(),
      ),
  });
}
