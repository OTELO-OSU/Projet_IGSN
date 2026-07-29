import { m } from "#/paraglide/messages.js";

import { useGetMe } from "./use-get-me.ts";

// Shows the signed-in user's name in the header, resolved from the api /me
// endpoint with the Keycloak access token.
export function UserName() {
  const { data, isError } = useGetMe();

  if (isError) return <p role="alert">{m.user_name_error()}</p>;
  if (!data) return null;
  return <p>{data.name ?? data.username ?? data.sub}</p>;
}
