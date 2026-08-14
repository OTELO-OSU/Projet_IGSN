import { z } from "zod";

export const orcidSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/, { message: "invalid ORCID iD" });
