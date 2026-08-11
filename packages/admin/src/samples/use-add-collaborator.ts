import type { CollaboratorRole } from "@projet-igsn/domain/user-sample/user-sample-validator";

import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export function useAddCollaborator(sampleId: string) {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (collaborator: {
      userId: string;
      role: CollaboratorRole;
    }) => {
      const res = await apiFetch(
        new URL(`admin/samples/${sampleId}/collaborators`, API_URL),
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(collaborator),
        },
      );
      if (!res.ok) {
        throw new Error(`Failed to add the collaborator (${res.status})`);
      }
    },
    onSuccess: () => {
      toast.success(m.share_contributor_added());
      queryClient.removeQueries({ queryKey: ["users"] });
      return queryClient.invalidateQueries({
        queryKey: ["samples", sampleId, "collaborators"],
      });
    },
    onError: () => toast.error(m.share_contributor_error()),
  });
}
