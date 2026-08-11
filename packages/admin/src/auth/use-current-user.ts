import { currentUserSchema } from "@projet-igsn/domain/user/current-user";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";

import { API_URL } from "../api-url.ts";
import { HttpError } from "../http-error.ts";
import { useApiClient } from "../use-api-client.ts";

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
        throw HttpError.fromResponse(res, `API responded ${res.status}`);
      }
      return currentUserSchema.parse(await res.json());
    },
    enabled: Boolean(token),
    staleTime: Infinity,
  });
}
