import type { SigninRedirectArgs } from "oidc-client-ts";

type SignInStarter = {
  signinRedirect: (args: SigninRedirectArgs) => Promise<void>;
};

export function signIn(starter: SignInStarter): void {
  void starter.signinRedirect({
    nonce: crypto.randomUUID(),
    url_state: window.location.pathname + window.location.search,
  });
}

function stripBase(path: string, base: string): string {
  return `${path}/`.startsWith(base) ? `/${path.slice(base.length)}` : path;
}

export function safeReturnPath(
  urlState: string | undefined,
  base: string = import.meta.env.BASE_URL,
): string {
  const path = urlState === undefined ? "" : stripBase(urlState, base);
  return path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.startsWith("/auth/callback")
    ? path
    : "/";
}
