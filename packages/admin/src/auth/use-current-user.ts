import { currentUserSchema } from "@projet-igsn/domain/user/current-user";
import { UNSUPPORTED_IDENTITY_PROVIDER } from "@projet-igsn/domain/user/unsupported-identity-provider";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";
import { z } from "zod";

import { API_URL } from "../api-url.ts";
import { HttpError } from "../http-error.ts";
import { useApiClient } from "../use-api-client.ts";

export class UnsupportedIdentityProviderError extends HttpError {
  constructor() {
    super(403, "Identity provider not allowed to sign in");
  }
}

const unsupportedProviderSchema = z.object({
  reason: z.literal(UNSUPPORTED_IDENTITY_PROVIDER),
});

// A status change takes effect on the user's next connection (PO decision), so
// the app must not flip a screen out from under them mid-session.
export function useCurrentUser() {
  const token = useAuth().user?.access_token;
  const apiFetch = useApiClient();
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const res = await apiFetch(`${API_URL}/admin/currentUser`);
      if (!res.ok) {
        const body: unknown =
          res.status === 403 ? await res.json().catch(() => null) : null;
        if (unsupportedProviderSchema.safeParse(body).success) {
          throw new UnsupportedIdentityProviderError();
        }
        throw HttpError.fromResponse(res, `API responded ${res.status}`);
      }
      return currentUserSchema.parse(await res.json());
    },
    enabled: Boolean(token),
    staleTime: Infinity,
  });
}
