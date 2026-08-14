import { useAuth } from "react-oidc-context";

import { userManager } from "./auth/oidc-config.ts";
import { signIn } from "./auth/sign-in.ts";

export function withAuthToken(
  fetchFn: typeof fetch,
  token: string | undefined,
): typeof fetch {
  return (input, init) => {
    const headers = new Headers(init?.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetchFn(input, { ...init, headers });
  };
}

export function withSessionRenewal(fetchFn: typeof fetch): typeof fetch {
  return async (input, init) => {
    const res = await fetchFn(input, init);
    if (res.status !== 401) return res;

    const renewed = await userManager.signinSilent().catch(() => null);
    if (renewed) {
      const retry = await withAuthToken(fetch, renewed.access_token)(
        input,
        init,
      );
      if (retry.status !== 401) return retry;
    }

    signIn(userManager);
    throw new Error("Session expired");
  };
}

export function useApiClient(): typeof fetch {
  const token = useAuth().user?.access_token;
  return withSessionRenewal(withAuthToken(fetch, token));
}
