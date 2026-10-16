import type { MailKind } from "@projet-igsn/domain/user/mail-kind";

import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { API_URL } from "#/api-url.ts";
import { apiOk } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";
import { useApiClient } from "#/use-api-client.ts";

export function useSetMailOptOut() {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, optOut }: { kind: MailKind; optOut: boolean }) =>
      apiOk(
        apiFetch,
        new URL(`admin/currentUser/mail-opt-outs/${kind}`, API_URL),
        "Failed to save the mail preference",
        { method: optOut ? "PUT" : "DELETE" },
      ),
    onSuccess: () => {
      toast.success(m.settings_emails_saved());
      return queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
    onError: () => toast.error(m.settings_emails_error()),
  });
}
