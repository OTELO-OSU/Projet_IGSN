import { UserManager } from "oidc-client-ts";

const callbackUrl =
  window.location.origin + import.meta.env.BASE_URL + "auth/callback";

export const userManager = new UserManager({
  authority:
    import.meta.env.VITE_OIDC_AUTHORITY ?? "http://localhost:8080/realms/igsn",
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID ?? "igsn-admin",
  scope: "openid profile email",
  redirect_uri: callbackUrl,
  post_logout_redirect_uri: callbackUrl,
  revokeTokensOnSignout: true,
  revokeTokenTypes: ["access_token"],
});

export const onSigninCallback = (): void => {
  window.history.replaceState({}, document.title, window.location.pathname);
};
