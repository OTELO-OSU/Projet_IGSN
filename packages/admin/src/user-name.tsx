import { m } from "#/paraglide/messages.js";

import { useCurrentUser } from "./auth/use-current-user.ts";

export function UserName() {
  const { data, isError } = useCurrentUser();

  if (isError) return <p role="alert">{m.user_name_error()}</p>;
  if (!data) return null;
  return <p>{data.name ?? data.username ?? data.sub}</p>;
}
