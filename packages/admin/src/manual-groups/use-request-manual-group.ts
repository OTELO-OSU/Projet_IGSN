import type { RequestManualGroupBody } from "@projet-igsn/domain/manual-group/manual-group-validator";

import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { apiOk } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export function useRequestManualGroup() {
  const apiFetch = useApiClient();
  return useMutation({
    mutationFn: async (body: RequestManualGroupBody) => {
      await apiOk(
        apiFetch,
        new URL("admin/manual-groups/requests", API_URL),
        "Failed to request the manual group",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
    },
    onSuccess: (_data, body) => {
      toast.success(m.manual_group_request_sent({ name: body.name }));
    },
    onError: () => toast.error(m.manual_group_request_error()),
  });
}
