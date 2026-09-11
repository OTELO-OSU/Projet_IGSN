import { z } from "zod";

import { organizationRorSchema } from "../../institutional-group/organization.ts";
import { freeTextSchema } from "../free-text.ts";

export const repositorySchema = z.object({
  currentArchive: organizationRorSchema.nullish(),
  currentArchiveContactFirstname: freeTextSchema.nullish(),
  currentArchiveContactLastname: freeTextSchema.nullish(),
  collectionName: freeTextSchema.nullish(),
  originalArchive: freeTextSchema.nullish(),
  originalArchiveContactFirstname: freeTextSchema.nullish(),
  originalArchiveContactLastname: freeTextSchema.nullish(),
});

export type Repository = z.infer<typeof repositorySchema>;
