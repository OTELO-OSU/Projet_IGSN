import { z } from "zod";

import { organizationRorSchema } from "../../institutional-group/organization.ts";
import { freeTextSchema } from "../free-text.ts";

export const repositorySchema = z.object({
  currentArchive: organizationRorSchema.nullish(),
  currentArchiveContact: freeTextSchema.nullish(),
  collectionName: freeTextSchema.nullish(),
  originalArchive: freeTextSchema.nullish(),
  originalArchiveContact: freeTextSchema.nullish(),
});

export type Repository = z.infer<typeof repositorySchema>;
