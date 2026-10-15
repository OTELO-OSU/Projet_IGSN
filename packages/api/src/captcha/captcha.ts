import { deriveKey } from "altcha-lib/algorithms/pbkdf2";
import { CappedMap, create, randomInt } from "altcha-lib/frameworks/hono";

export const DEFAULT_CAPTCHA_COST = 1_000;
export const CAPTCHA_SECRET_MIN_LENGTH = 32;
const COUNTER_MIN = 1_000;
const COUNTER_MAX = 2_000;
const CHALLENGE_TTL_MS = 10 * 60_000;
const REPLAY_STORE_SIZE = 1_000;

export type CaptchaConfig = { secret: string; cost: number };

export function createCaptcha({
  secret,
  cost,
}: CaptchaConfig): ReturnType<typeof create> {
  return create({
    hmacSignatureSecret: secret,
    createChallengeParameters: () => ({
      algorithm: "PBKDF2/SHA-256",
      cost,
      counter: randomInt(COUNTER_MIN, COUNTER_MAX),
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    }),
    deriveKey,
    setCookie: { name: "altcha", path: "/" },
    // ponytail: the replay store is per process, share it (e.g. in Postgres) once the api runs more than one replica.
    store: new CappedMap<string, boolean>({ maxSize: REPLAY_STORE_SIZE }),
  });
}
