import { orcidSchema } from "@projet-igsn/domain/user/orcid";
import { HTTPException } from "hono/http-exception";
import { decode } from "hono/jwt";
import { z } from "zod";

import { appUrl } from "../app-url.ts";

const TOKEN_TIMEOUT_MS = 10_000;

const tokenResponseSchema = z.object({ id_token: z.string() });

const orcidClient = () => ({
  clientId: process.env.ORCID_LINK_CLIENT_ID || "igsn-broker",
  clientSecret: process.env.ORCID_LINK_CLIENT_SECRET || "mock-orcid-secret",
  authorizationUrl:
    process.env.ORCID_LINK_AUTHORIZATION_URL ||
    "http://localhost:8080/realms/mock-orcid/protocol/openid-connect/auth",
  tokenUrl:
    process.env.ORCID_LINK_TOKEN_URL ||
    "http://localhost:8080/realms/mock-orcid/protocol/openid-connect/token",
  redirectUri: new URL("settings/profile", appUrl("ADMIN_URL")).toString(),
});

const orcidUnavailable = (status?: number) => {
  console.error("ORCID token exchange failed", { status });
  return new HTTPException(502, { message: "ORCID is unavailable" });
};

export function orcidAuthorizationUrl(state: string): string {
  const { clientId, authorizationUrl, redirectUri } = orcidClient();
  const url = new URL(authorizationUrl);
  url.search = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: "openid",
    redirect_uri: redirectUri,
    state,
    prompt: "login",
  }).toString();
  return url.toString();
}

export async function exchangeOrcidCode(code: string): Promise<string> {
  const { clientId, clientSecret, tokenUrl, redirectUri } = orcidClient();
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { accept: "application/json" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
    signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS),
  }).catch(() => {
    throw orcidUnavailable();
  });
  if (res.status === 400) {
    throw new HTTPException(400, {
      message: "ORCID refused the authorization code",
    });
  }
  if (!res.ok) throw orcidUnavailable(res.status);
  const sub = await res
    .json()
    .then(
      (body) => decode(tokenResponseSchema.parse(body).id_token).payload.sub,
    )
    .catch(() => undefined);
  const orcid = orcidSchema.safeParse(sub);
  if (!orcid.success) throw orcidUnavailable(res.status);
  return orcid.data;
}
