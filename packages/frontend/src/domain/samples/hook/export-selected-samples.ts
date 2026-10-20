import type { SearchSelectionExport } from "@projet-igsn/domain/sample/search/search-export-validator";

import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { saveBlob } from "@projet-igsn/design-system/lib/save-blob";
import { useMutation } from "@tanstack/react-query";

import { exportSelectedSamples } from "#/domain/samples/client/export-selected-samples.ts";
import { m } from "#/paraglide/messages.js";

export function useExportSelectedSamples() {
  return useMutation({
    mutationFn: async (body: SearchSelectionExport) => {
      const { blob, filename } = await exportSelectedSamples(body);
      saveBlob(blob, filename);
    },
    onError: () => toast.error(m.export_selected_samples_error()),
  });
}
