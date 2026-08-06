import { useQuery } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";

import { fetchCurrentUser } from "../api.ts";

// Never invalidated and never polled: a status change takes effect on the
// user's next connection (PO decision), so the app must not flip a screen out
// from under them mid-session.
export function useCurrentUser() {
  const token = useAuth().user?.access_token;
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: () => {
      if (!token) throw new Error("Not authenticated");
      return fetchCurrentUser(token);
    },
    enabled: Boolean(token),
    staleTime: Infinity,
  });
}
