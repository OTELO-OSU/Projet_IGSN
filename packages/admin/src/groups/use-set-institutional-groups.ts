import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { type SetInstitutionalGroups } from "@projet-igsn/domain/institutional-group/institutional-groups-validator";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export function useSetInstitutionalGroups() {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (groups: SetInstitutionalGroups) => {
      const res = await apiFetch(
        new URL("admin/currentUser/institutional-groups", API_URL),
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(groups),
        },
      );
      if (!res.ok) {
        throw new HttpError(
          res.status,
          `Failed to set institutional groups (${res.status})`,
        );
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["currentUser"] }),
    onError: () => toast.error(m.institutional_groups_error()),
  });
}
