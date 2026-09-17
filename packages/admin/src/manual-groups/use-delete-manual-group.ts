import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { apiOk, HttpError } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export function useDeleteManualGroup(groupId: string) {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiOk(
        apiFetch,
        new URL(`admin/manual-groups/${groupId}`, API_URL),
        "Failed to delete the manual group",
        { method: "DELETE" },
      );
    },
    onSuccess: () => {
      toast.success(m.manual_group_deleted());
      void queryClient.invalidateQueries({ queryKey: ["manual-groups"] });
    },
    onError: (error) =>
      toast.error(
        error instanceof HttpError && error.status === 409
          ? m.manual_group_delete_published()
          : m.manual_group_delete_error(),
      ),
  });
}
