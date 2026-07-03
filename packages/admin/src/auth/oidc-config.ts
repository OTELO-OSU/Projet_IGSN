import { UserManager } from "oidc-client-ts";

// Defaults target the local dev Keycloak (see docs/dev-authentication.md).
// Override per environment with VITE_OIDC_AUTHORITY / VITE_OIDC_CLIENT_ID.
//
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
  redirect_uri: window.location.origin + "/",
  post_logout_redirect_uri: window.location.origin + "/",
  // RFC 7009 revocation on logout (GT-SSO REQ-TOKEN-05).
  revokeTokensOnSignout: true,
});

// Strip ?code&state from the URL after Keycloak redirects back.
export const onSigninCallback = (): void => {
  window.history.replaceState({}, document.title, window.location.pathname);
};
