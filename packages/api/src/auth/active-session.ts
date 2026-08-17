import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

const issuer = process.env.OIDC_ISSUER ?? "http://localhost:8080/realms/igsn";
const userinfoUri =
  process.env.OIDC_USERINFO_URI ?? `${issuer}/protocol/openid-connect/userinfo`;

export const requireActiveSession = createMiddleware(async (c, next) => {
  const authorization = c.req.header("Authorization");
  if (!authorization) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  const res = await fetch(userinfoUri, {
    headers: { Authorization: authorization },
  }).catch((error: unknown) => {
    console.error("userinfo request failed", { userinfoUri, error });
    return null;
  });
  if (!res?.ok) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  await next();
});
