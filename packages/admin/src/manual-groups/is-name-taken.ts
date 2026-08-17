import { HttpError } from "#/http-error.ts";

export const isNameTaken = (error: unknown): boolean =>
  error instanceof HttpError && error.status === 409;
