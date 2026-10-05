import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { importDuplicateSchema } from "@projet-igsn/domain/sample/import/import-report";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";

import { API_URL } from "#/api-url.ts";
import { apiJson } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

const responseSchema = z.object({
  data: z.array(importDuplicateSchema),
});

export function useCheckImportDuplicates() {
  const apiFetch = useApiClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData();
      body.append("file", file);
      const { data } = await apiJson(
        apiFetch,
        new URL("admin/samples/import/duplicates", API_URL),
        responseSchema,
        "Failed to check the import for duplicate samples",
        { method: "POST", body },
      );
      return data;
    },
    onError: () => toast.error(m.duplicate_samples_check_error()),
  });
}
