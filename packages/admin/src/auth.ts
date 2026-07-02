import type { AuthProviderProps } from "react-oidc-context";

// Defaults target the local dev Keycloak (see readme "Auth"). Override per
// environment with VITE_OIDC_AUTHORITY / VITE_OIDC_CLIENT_ID.
export const oidcConfig: AuthProviderProps = {
  authority:
    import.meta.env.VITE_OIDC_AUTHORITY ?? "http://localhost:8080/realms/igsn",
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID ?? "igsn-admin",
  // profile/email so the access token carries name + email for the api to read.
  scope: "openid profile email",
  redirect_uri: window.location.origin + "/",
  post_logout_redirect_uri: window.location.origin + "/",
  // Strip ?code&state from the URL after Keycloak redirects back.
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};
