import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export function useAcceptCharter() {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch(
        new URL("admin/currentUser/charter-acceptance", API_URL),
        { method: "PUT" },
      );
      if (!res.ok) {
        throw new HttpError(
          res.status,
          `Failed to accept the charter (${res.status})`,
        );
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["currentUser"] }),
    onError: () => toast.error(m.charter_gate_error()),
  });
}
