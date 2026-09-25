import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { IMPORT_TEMPLATE_FILENAME } from "@projet-igsn/domain/sample/import/import-validator";
import { useMutation } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { m } from "#/paraglide/messages.js";
import { saveBlob } from "#/samples/save-blob.ts";
import { useApiClient } from "#/use-api-client.ts";

export function useDownloadImportTemplate() {
  const apiFetch = useApiClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch(
        new URL("admin/samples/import-template", API_URL),
      );
      if (!res.ok) {
        throw new Error(`Failed to download import template (${res.status})`);
      }
      saveBlob(await res.blob(), IMPORT_TEMPLATE_FILENAME);
    },
    onError: () => toast.error(m.import_template_download_error()),
  });
}
