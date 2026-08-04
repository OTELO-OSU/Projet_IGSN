import { useQuery } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";

import { fetchMe } from "./api.ts";

// The signed-in user's identity and stored ORCID, shared by the header, the
// settings page, and the ORCID access gate (one ["me"] query for all three).
export function useGetMe() {
  const token = useAuth().user?.access_token;
  return useQuery({
    queryKey: ["me"],
    queryFn: () => {
      if (!token) throw new Error("Not authenticated");
      return fetchMe(token);
    },
    enabled: Boolean(token),
  });
}
