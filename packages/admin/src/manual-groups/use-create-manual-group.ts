import type { CreateManualGroupBody } from "@projet-igsn/domain/manual-group/manual-group-validator";

import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { apiOk } from "#/http-error.ts";
import { isNameTaken } from "#/is-name-taken.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export function useCreateManualGroup() {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateManualGroupBody) => {
      await apiOk(
        apiFetch,
        new URL("admin/manual-groups", API_URL),
        "Failed to create the manual group",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
    },
    onSuccess: () => {
      toast.success(m.manual_group_created());
      return queryClient.invalidateQueries({ queryKey: ["manual-groups"] });
    },
    onError: (error) => {
      if (!isNameTaken(error)) toast.error(m.manual_group_create_error());
    },
  });
}
