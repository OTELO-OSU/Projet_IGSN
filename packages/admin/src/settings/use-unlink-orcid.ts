import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { apiOk } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export function useUnlinkOrcid() {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiOk(
        apiFetch,
        new URL("admin/currentUser/orcid", API_URL),
        "Failed to unlink ORCID",
        { method: "DELETE" },
      ),
    onSuccess: () => {
      toast.success(m.settings_orcid_unlinked());
      return queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
    onError: () => toast.error(m.settings_orcid_unlink_error()),
  });
}
