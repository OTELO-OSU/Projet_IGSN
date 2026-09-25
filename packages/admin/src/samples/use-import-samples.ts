import type { ImportSamples } from "@projet-igsn/domain/sample/import/import-validator";

import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export function useImportSamples() {
  const apiFetch = useApiClient();
  return useMutation({
    mutationFn: async ({ file }: ImportSamples) => {
      const body = new FormData();
      body.append("file", file);
      const res = await apiFetch(new URL("admin/samples/import", API_URL), {
        method: "POST",
        body,
      });
      if (!res.ok) {
        throw new Error(`Failed to import samples (${res.status})`);
      }
    },
    onSuccess: () => toast.success(m.import_samples_success()),
    onError: () => toast.error(m.import_samples_error()),
  });
}
