import { oidcSettings } from "@projet-igsn/domain/auth/oidc-settings";
import { safeReturnPath } from "@projet-igsn/domain/auth/safe-return-path";
import { UserManager } from "oidc-client-ts";

export { onSigninCallback } from "@projet-igsn/domain/auth/oidc-settings";

const callbackPath = import.meta.env.BASE_URL + "auth/callback";

export const userManager = new UserManager(
  oidcSettings({
    authority: import.meta.env.VITE_OIDC_AUTHORITY,
    clientId: import.meta.env.VITE_OIDC_CLIENT_ID,
    callbackUrl: window.location.origin + callbackPath,
  }),
);

export function isSignoutCallback({
  pathname,
  search,
}: {
  pathname: string;
  search: string;
}): boolean {
  const params = new URLSearchParams(search);
  return (
    pathname === callbackPath && params.has("state") && !params.has("code")
  );
}

export const matchSignoutCallback = (): boolean =>
  isSignoutCallback(window.location);

export function onSignoutCallback(
  resp: { userState?: unknown } | undefined,
  navigate: (path: string) => void = (path) => window.location.replace(path),
): void {
  if (typeof resp?.userState === "string")
    navigate(safeReturnPath(resp.userState));
}
