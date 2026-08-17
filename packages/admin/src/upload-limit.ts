import { DEFAULT_UPLOAD_LIMIT } from "@projet-igsn/domain/sample/attachment/attachment-validator";

export const UPLOAD_LIMIT =
  Number(import.meta.env.VITE_UPLOAD_LIMIT) || DEFAULT_UPLOAD_LIMIT;
