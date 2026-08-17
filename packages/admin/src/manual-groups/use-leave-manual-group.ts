import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export function useLeaveManualGroup() {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
      const res = await apiFetch(
        new URL(`admin/currentUser/manual-groups/${groupId}`, API_URL),
        { method: "DELETE" },
      );
      if (!res.ok) {
        throw HttpError.fromResponse(
          res,
          `Failed to leave the manual group (${res.status})`,
        );
      }
    },
    onSuccess: () => {
      toast.success(m.manual_group_left());
      return queryClient.invalidateQueries({
        queryKey: ["currentUser", "manual-groups"],
      });
    },
    onError: (error) =>
      toast.error(
        error instanceof HttpError && error.status === 403
          ? m.manual_group_leave_locked()
          : m.manual_group_leave_error(),
      ),
  });
}
