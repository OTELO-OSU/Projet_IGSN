import type { ManualGroupNameBody } from "@projet-igsn/domain/manual-group/manual-group-validator";

import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

import { isNameTaken } from "./is-name-taken.ts";

export function useCreateManualGroup() {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: ManualGroupNameBody) => {
      const res = await apiFetch(new URL("admin/manual-groups", API_URL), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw HttpError.fromResponse(
          res,
          `Failed to create the manual group (${res.status})`,
        );
      }
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
