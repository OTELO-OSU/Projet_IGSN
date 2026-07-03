import { useAuth } from "react-oidc-context";

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

export function useApiClient(): typeof fetch {
  const token = useAuth().user?.access_token;
  return withAuthToken(fetch, token);
}
