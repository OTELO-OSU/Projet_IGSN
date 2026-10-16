import { solveChallenge } from "altcha-lib";
import { deriveKey } from "altcha-lib/algorithms/pbkdf2";
import { testClient } from "hono/testing";

import type { createApp } from "../app.ts";

export async function solvedCaptchaCookie(
  app: ReturnType<typeof createApp>["app"],
): Promise<string> {
  const { parameters, signature } = await (
    await testClient(app).captcha.challenge.$get()
  ).json();
  const challenge = { parameters, signature };
  const solution = await solveChallenge({ challenge, deriveKey });
  return `altcha=${encodeURIComponent(
    btoa(JSON.stringify({ challenge, solution })),
  )}`;
}
