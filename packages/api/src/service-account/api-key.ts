import { createHash, randomBytes } from "node:crypto";

const KEY_BYTES = 32;

export const generateApiKey = (): string =>
  randomBytes(KEY_BYTES).toString("base64url");

export const hashApiKey = (key: string): string =>
  createHash("sha256").update(key).digest("hex");
