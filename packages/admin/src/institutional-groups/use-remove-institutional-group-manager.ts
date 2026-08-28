import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";
import { invalidateUserAndGroups } from "#/users/invalidate-user-and-groups.ts";

import { type InstitutionalGroupManagement } from "./use-add-institutional-group-manager.ts";

export function useRemoveInstitutionalGroupManager() {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      kind,
      code,
      userId,
    }: InstitutionalGroupManagement) => {
      const res = await apiFetch(
        new URL(
          `admin/institutional-groups/${kind}/${code}/managers/${userId}`,
          API_URL,
        ),
        { method: "DELETE" },
      );
      if (!res.ok) {
        throw HttpError.fromResponse(
          res,
          `Failed to remove the manager (${res.status})`,
        );
      }
    },
    onSuccess: async (_data, { kind, code, userId }) => {
      toast.success(m.group_manager_removed());
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["institutional-groups", kind, code, "managers"],
        }),
        invalidateUserAndGroups(queryClient, userId),
      ]);
    },
    onError: () => toast.error(m.group_manager_remove_error()),
  });
}
