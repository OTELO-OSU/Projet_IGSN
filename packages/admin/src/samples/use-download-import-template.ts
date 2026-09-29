import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import {
  IMPORT_TEMPLATE_FILENAME,
  type ReserveInternalIds,
} from "@projet-igsn/domain/sample/import/import-validator";
import { useMutation } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { m } from "#/paraglide/messages.js";
import { saveBlob } from "#/samples/save-blob.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useDownloadImportTemplate() {
  const apiFetch = useApiClient();
  return useMutation({
    mutationFn: async (count?: number) => {
      const res = await (count === undefined
        ? apiFetch(new URL("admin/samples/import-template", API_URL))
        : apiFetch(
            new URL("admin/samples/import-template/reservation", API_URL),
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ count } satisfies ReserveInternalIds),
            },
          ));
      if (!res.ok) {
        throw new Error(`Failed to download import template (${res.status})`);
      }
      saveBlob(await res.blob(), IMPORT_TEMPLATE_FILENAME);
    },
    onError: () => toast.error(m.import_template_download_error()),
  });
}
