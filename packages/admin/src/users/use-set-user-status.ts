import type { UserDecision } from "@projet-igsn/domain/user/repository";

import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { userResponseSchema } from "@projet-igsn/domain/user/user-validator";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export function useSetUserStatus(id: string) {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (status: UserDecision) => {
      const res = await apiFetch(new URL(`admin/users/${id}/status`, API_URL), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        throw new Error(`Failed to update the account (${res.status})`);
      }
      return userResponseSchema.parse(await res.json()).data;
    },
    onSuccess: async () => {
      toast.success(m.user_status_success());
      // Never ["currentUser"]: the moderator's own identity is session-scoped,
      // and a moderated user only sees their new status on their next connection.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["users"] }),
        queryClient.invalidateQueries({ queryKey: ["user", id] }),
      ]);
    },
    onError: () => toast.error(m.user_status_error()),
  });
}
