export function oidcSettings({
  authority,
  clientId,
  callbackUrl,
}: {
  authority: string | undefined;
  clientId: string | undefined;
  callbackUrl: string;
}) {
  return {
    authority: authority ?? "http://localhost:8080/realms/igsn",
    client_id: clientId ?? "igsn-admin",
    scope: "openid profile email",
    redirect_uri: callbackUrl,
    post_logout_redirect_uri: callbackUrl,
    revokeTokensOnSignout: true,
    revokeTokenTypes: ["access_token" as const],
  };
}

export const onSigninCallback = (): void => {
  window.history.replaceState({}, document.title, window.location.pathname);
};
