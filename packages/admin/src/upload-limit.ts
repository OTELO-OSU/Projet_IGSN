import { DEFAULT_UPLOAD_LIMIT } from "@projet-igsn/domain/sample/attachment/attachment-validator";

// How many files a sample may carry, baked at build time (Vite) like API_URL.
// Must match the api's UPLOAD_LIMIT; an unset, zero or unparsable value falls
// back to the domain default both sides share.
export const UPLOAD_LIMIT =
  Number(import.meta.env.VITE_UPLOAD_LIMIT) || DEFAULT_UPLOAD_LIMIT;
