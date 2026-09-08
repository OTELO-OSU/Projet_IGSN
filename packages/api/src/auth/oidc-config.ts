export const issuer =
  process.env.OIDC_ISSUER ?? "http://localhost:8080/realms/igsn";
export const jwksUri =
  process.env.OIDC_JWKS_URI ?? `${issuer}/protocol/openid-connect/certs`;
export const clientId = process.env.OIDC_CLIENT_ID ?? "igsn-admin";
