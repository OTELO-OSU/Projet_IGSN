import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";

import { fetchMe } from "./api.ts";

// Calls the protected api /me with the Keycloak access token and shows who the
// api verified you as — proof the token round-trips to the backend, not just
// through the SPA.
export function ApiGreeting() {
  const auth = useAuth();
  const token = auth.user?.access_token;
  const [name, setName] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    fetchMe(token)
      .then((me) => {
        if (active) setName(me.name ?? me.username ?? me.sub);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [token]);

  if (failed) return <p role="alert">Could not reach the API.</p>;
  if (!name) return null;
  return <p>{`API verified you as ${name}`}</p>;
}
