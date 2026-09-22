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

export const agentIdSchema = z
  .string()
  .min(1)
  .meta({
    description:
      "Identifier of the agent, an ORCID URI for a person and a ROR URI for an organization.",
  })
  .optional();

export const corePersonFields = {
  id: agentIdSchema,
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
