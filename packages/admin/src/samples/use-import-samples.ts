import type { ImportIssue } from "@projet-igsn/domain/sample/import/import-report";
import type { ImportSamples } from "@projet-igsn/domain/sample/import/import-validator";

import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import {
  importAcceptedSchema,
  invalidImportSchema,
} from "@projet-igsn/domain/sample/import/import-report";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export function useImportSamples() {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
    }: ImportSamples): Promise<{ issues: ImportIssue[]; count: number }> => {
      const body = new FormData();
      body.append("file", file);
      const res = await apiFetch(new URL("admin/samples/import", API_URL), {
        method: "POST",
        body,
      });
      if (res.status === 422) {
        return {
          issues: invalidImportSchema.parse(await res.json()).issues,
          count: 0,
        };
      }
      if (!res.ok) {
        throw HttpError.fromResponse(
          res,
          `Failed to import samples (${res.status})`,
        );
      }
      return { issues: [], ...importAcceptedSchema.parse(await res.json()) };
    },
    onSuccess: ({ issues, count }) => {
      if (issues.length > 0) return;
      toast.success(m.import_samples_success({ count }));
      return queryClient.invalidateQueries({ queryKey: ["samples"] });
    },
    onError: (error) =>
      toast.error(
        error instanceof HttpError && error.status === 503
          ? m.import_samples_datacite_down()
          : m.import_samples_error(),
      ),
  });
}
