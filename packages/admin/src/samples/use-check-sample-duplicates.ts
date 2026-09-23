import type { CheckDuplicatesBody } from "@projet-igsn/domain/sample/sample-validator";

import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { suspectedDuplicateSchema } from "@projet-igsn/domain/sample/publication/suspected-duplicate";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";

import { API_URL } from "#/api-url.ts";
import { apiJson } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

const responseSchema = z.object({
  data: z.array(suspectedDuplicateSchema),
});

export function useCheckSampleDuplicates() {
  const apiFetch = useApiClient();
  return useMutation({
    mutationFn: async (body: CheckDuplicatesBody) => {
      const { data } = await apiJson(
        apiFetch,
        new URL("admin/samples/duplicates", API_URL),
        responseSchema,
        "Failed to check for duplicate samples",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      return data;
    },
    onError: () => toast.error(m.duplicate_samples_check_error()),
  });
}
