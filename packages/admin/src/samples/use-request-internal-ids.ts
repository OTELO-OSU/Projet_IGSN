import type { InternalIdRequest } from "@projet-igsn/domain/sample/import/import-validator";

import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export function useRequestInternalIds() {
  const apiFetch = useApiClient();
  return useMutation({
    mutationFn: async (body: InternalIdRequest) => {
      const res = await apiFetch(
        new URL("admin/samples/import/internal-id-request", API_URL),
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        throw new Error(`Failed to request internal IDs (${res.status})`);
      }
    },
    onSuccess: () => toast.success(m.import_report_contact_admin_sent()),
    onError: () => toast.error(m.import_report_contact_admin_error()),
  });
}
