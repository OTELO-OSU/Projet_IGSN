import type { ProvenanceStatus } from "@projet-igsn/domain/sample/scientific-context/provenance-status";

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

export type ImportTemplateCustomization = {
  provenanceStatus: ProvenanceStatus;
  materialPath?: string;
  manualGroupId?: string;
  subSamples: boolean;
};

function customizedTemplateUrl(
  customization: ImportTemplateCustomization | undefined,
): URL {
  const url = new URL("admin/samples/import-template", API_URL);
  if (!customization) return url;
  url.searchParams.set("provenanceStatus", customization.provenanceStatus);
  if (customization.materialPath) {
    url.searchParams.set("materialPath", customization.materialPath);
  }
  if (customization.manualGroupId) {
    url.searchParams.set("manualGroupId", customization.manualGroupId);
  }
  if (customization.subSamples) url.searchParams.set("subSamples", "true");
  return url;
}

export function useDownloadImportTemplate() {
  const apiFetch = useApiClient();
  return useMutation({
    mutationFn: async (
      request?:
        | (ReserveInternalIds & Partial<ImportTemplateCustomization>)
        | ImportTemplateCustomization,
    ) => {
      const res = await (request && "count" in request
        ? apiFetch(
            new URL("admin/samples/import-template/reservation", API_URL),
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(request),
            },
          )
        : apiFetch(customizedTemplateUrl(request)));
      if (!res.ok) {
        throw new Error(`Failed to download import template (${res.status})`);
      }
      saveBlob(await res.blob(), IMPORT_TEMPLATE_FILENAME);
    },
    onError: () => toast.error(m.import_template_download_error()),
  });
}
