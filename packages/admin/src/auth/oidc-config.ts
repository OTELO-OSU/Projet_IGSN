import { UserManager } from "oidc-client-ts";

// One module-scope instance, passed to AuthProvider: the UserManager
// constructor starts silent renew, and building it per mount arms duplicate
// renew timers under StrictMode; with single-use refresh tokens the duplicate
// renewal reads as token theft and revokes the session (ADR 0006).
export const userManager = new UserManager({
  authority:
    import.meta.env.VITE_OIDC_AUTHORITY ?? "http://localhost:8080/realms/igsn",
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID ?? "igsn-admin",
  // profile/email so the access token carries name + email for the api to read.
  scope: "openid profile email",
  // The one path registered on the GaiaData client, post-logout included:
  // Keycloak defaults its post-logout URIs to the redirect URIs.
  redirect_uri: window.location.origin + "/auth/callback",
  post_logout_redirect_uri: window.location.origin + "/auth/callback",
  // RFC 7009 revocation on logout (GT-SSO REQ-TOKEN-05). Access token only:
  // revoking the refresh token makes Keycloak drop the session before the
  // end_session redirect arrives, which skips the brokered IdP logout and
  // leaves the IdP SSO session alive. The refresh token dies with the session.
  revokeTokensOnSignout: true,
  revokeTokenTypes: ["access_token"],
});

export const onSigninCallback = (): void => {
  window.history.replaceState({}, document.title, window.location.pathname);
};
