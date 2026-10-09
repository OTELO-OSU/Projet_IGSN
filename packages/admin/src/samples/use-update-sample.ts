import type { CreateSample } from "@projet-igsn/domain/sample/sample";
import type { SampleConflict } from "@projet-igsn/domain/sample/sample-validator";

import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import {
  sampleConflictSchema,
  sampleResponseSchema,
} from "@projet-igsn/domain/sample/sample-validator";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";
import { sampleQueryOptions } from "#/samples/use-sample.ts";
import { useApiClient } from "#/use-api-client.ts";

export class SampleConflictError extends HttpError {
  constructor(readonly reason: SampleConflict["reason"]) {
    super(409, `Sample update refused (${reason})`);
  }
}

export function useUpdateSample(id: string) {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSample) => {
      const expectedUpdatedAt = queryClient.getQueryData(
        sampleQueryOptions(apiFetch, id).queryKey,
      )?.updatedAt;
      const res = await apiFetch(new URL(`admin/samples/${id}`, API_URL), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...input, expectedUpdatedAt }),
      });
      if (!res.ok) {
        const conflict = sampleConflictSchema.safeParse(
          res.status === 409 ? await res.json() : null,
        );
        throw conflict.success
          ? new SampleConflictError(conflict.data.reason)
          : HttpError.fromResponse(
              res,
              `Failed to update sample (${res.status})`,
            );
      }
      return sampleResponseSchema.parse(await res.json()).data;
    },
    onSuccess: () => {
      toast.success(m.edit_sample_success());
      return queryClient.invalidateQueries({ queryKey: ["samples"] });
    },
    onError: (error) =>
      toast.error(
        error instanceof SampleConflictError
          ? {
              stale: m.edit_sample_stale(),
              locked: m.edit_sample_locked(),
              unpublishable: m.edit_sample_error(),
            }[error.reason]
          : m.edit_sample_error(),
      ),
  });
}
