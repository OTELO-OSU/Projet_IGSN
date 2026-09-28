import type { ExportSamplesRequest } from "@projet-igsn/domain/sample/export/export-validator";

import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError, apiOk } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";
import { saveBlob } from "#/samples/save-blob.ts";
import { useApiClient } from "#/use-api-client.ts";

const FALLBACK_FILENAME = "igsn-samples-export.xlsx";

const attachmentName = (header: string | null): string =>
  /filename="([^"]+)"/.exec(header ?? "")?.[1] ?? FALLBACK_FILENAME;

export function useExportSamples() {
  const apiFetch = useApiClient();
  return useMutation({
    mutationFn: async (request: ExportSamplesRequest) => {
      const res = await apiOk(
        apiFetch,
        new URL("admin/samples/export", API_URL),
        "Failed to export samples",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(request),
        },
      );
      saveBlob(
        await res.blob(),
        attachmentName(res.headers.get("Content-Disposition")),
      );
    },
    onError: (error) =>
      toast.error(
        error instanceof HttpError && error.status === 422
          ? m.export_samples_too_many()
          : m.export_samples_error(),
      ),
  });
}
