import { useQuery } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";

import { m } from "#/paraglide/messages.js";

import { fetchMe } from "./api.ts";

// Shows the signed-in user's name in the header, resolved from the api /me
// endpoint with the Keycloak access token.
export function UserName() {
  const token = useAuth().user?.access_token;
  const { data, isError } = useQuery({
    queryKey: ["me"],
    queryFn: () => {
      if (!token) throw new Error("Not authenticated");
      return fetchMe(token);
    },
    enabled: Boolean(token),
  });

  if (isError) return <p role="alert">{m.user_name_error()}</p>;
  if (!data) return null;
  return <p>{data.name ?? data.username ?? data.sub}</p>;
}
