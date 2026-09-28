import type { ImportIssue } from "@projet-igsn/domain/sample/import/import-report";
import type { ImportSamples } from "@projet-igsn/domain/sample/import/import-validator";

import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { invalidImportSchema } from "@projet-igsn/domain/sample/import/import-report";
import { useMutation } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export function useImportSamples() {
  const apiFetch = useApiClient();
  return useMutation({
    mutationFn: async ({ file }: ImportSamples): Promise<ImportIssue[]> => {
      const body = new FormData();
      body.append("file", file);
      const res = await apiFetch(new URL("admin/samples/import", API_URL), {
        method: "POST",
        body,
      });
      if (res.status === 422) {
        return invalidImportSchema.parse(await res.json()).issues;
      }
      if (!res.ok) {
        throw new Error(`Failed to import samples (${res.status})`);
      }
      return [];
    },
    onSuccess: (issues) => {
      if (issues.length === 0) toast.success(m.import_samples_success());
    },
    onError: () => toast.error(m.import_samples_error()),
  });
}
