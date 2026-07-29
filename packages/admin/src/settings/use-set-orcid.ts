import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { orcidSchema } from "@projet-igsn/domain/user/orcid";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

const setOrcidResponseSchema = z.object({ orcid: orcidSchema.nullable() });

export function useSetOrcid() {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orcid: string | null) => {
      const res = await apiFetch(new URL("admin/me/orcid", API_URL), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orcid }),
      });
      if (!res.ok) {
        throw new HttpError(res.status, `Failed to set ORCID (${res.status})`);
      }
      return setOrcidResponseSchema.parse(await res.json()).orcid;
    },
    onSuccess: () => {
      toast.success(m.settings_orcid_saved());
      return queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (error) =>
      toast.error(
        error instanceof HttpError && error.status === 409
          ? m.settings_orcid_conflict()
          : m.settings_orcid_error(),
      ),
  });
}
