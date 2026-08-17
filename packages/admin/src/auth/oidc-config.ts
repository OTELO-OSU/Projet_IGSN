import { UserManager } from "oidc-client-ts";

export const userManager = new UserManager({
  authority:
    import.meta.env.VITE_OIDC_AUTHORITY ?? "http://localhost:8080/realms/igsn",
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID ?? "igsn-admin",
  scope: "openid profile email",
  redirect_uri: window.location.origin + "/auth/callback",
  post_logout_redirect_uri: window.location.origin + "/auth/callback",
  revokeTokensOnSignout: true,
  revokeTokenTypes: ["access_token"],
});

export const onSigninCallback = (): void => {
  window.history.replaceState({}, document.title, window.location.pathname);
};
