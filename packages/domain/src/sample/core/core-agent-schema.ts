import { z } from "zod";

import { freeTextSchema } from "../free-text.ts";

export const coreOrganizationSchema = z.strictObject({
  id: z
    .string()
    .min(1)
    .meta({
      description:
        "Identifier of the organization, a ROR URI or one of our urn:otelo: URNs for an OSU or a laboratory.",
    })
    .optional(),
  name: freeTextSchema.meta({ description: "Name of the organization." }),
});

export const organizationIdSchema = z
  .string()
  .min(1)
  .meta({
    description: "ROR URI of the organization.",
  })
  .optional();

export const corePersonFields = {
  id: z
    .string()
    .min(1)
    .meta({
      description:
        "ORCID URI of the person, resolved from their linked registry account; emit only, ignored on input.",
    })
    .optional(),
  firstname: freeTextSchema
    .meta({ description: "First name of the person." })
    .optional(),
  lastname: freeTextSchema
    .meta({ description: "Last name of the person." })
    .optional(),
  affiliations: z
    .array(coreOrganizationSchema)
    .min(1)
    .meta({
      description:
        "Organizations the person belongs to, the institutional trio of the creator or the research structures of a researcher.",
    })
    .optional(),
};

export const corePersonSchema = z.strictObject(corePersonFields);
