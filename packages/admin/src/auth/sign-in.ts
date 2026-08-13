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

export function safeReturnPath(urlState: string | undefined): string {
  return urlState?.startsWith("/") &&
    !urlState.startsWith("//") &&
    !urlState.startsWith("/auth/callback")
    ? urlState
    : "/";
}
