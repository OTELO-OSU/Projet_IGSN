import { z } from "zod";

import { igsnSchema } from "../../igsn/model.ts";
import { freeTextSchema } from "../free-text.ts";
import {
  MAX_SAMPLE_PARENTS,
  nameSchema,
  publicationYearSchema,
} from "../sample.ts";
import { coreClassificationSchema } from "./core-classification-schema.ts";
import { coreCurationSchema } from "./core-curation-schema.ts";
import { corePhysicalDescriptionSchema } from "./core-curation-schema.ts";
import { coreExtensionsSchema } from "./core-extensions-schema.ts";
import { coreProductionSchema } from "./core-production-schema.ts";
import {
  type CoreRelation,
  coreManualGroupSchema,
  coreRelationSchema,
  coreTitleSchema,
  parentIgsnOf,
} from "./core-relation-schema.ts";

export const CORE_SCHEMA_VERSION = "0.10.0";

export const OTELO_ROR_URI = "https://ror.org/02cyw3861";

export const ORCID_PREFIX = "https://orcid.org/";

export const toOrcidUri = (orcid: string): string => `${ORCID_PREFIX}${orcid}`;

export const CORE_LICENCE_URI = "https://creativecommons.org/licenses/by/4.0/";

const CORE_ROLES = [
  "Creator",
  "Registrant",
  "Collector",
  "ChiefScientist",
  "HostingInstitution",
  "Curator",
  "Researcher",
] as const;

export type CoreRole = (typeof CORE_ROLES)[number];

// One agent holds a role, except HostingInstitution which lists every host.
const REPEATABLE_ROLES: readonly CoreRole[] = ["HostingInstitution"];

const coreOrganizationSchema = z.strictObject({
  id: z.string().min(1).optional(),
  name: freeTextSchema,
});

export const coreAgentRoleSchema = z.strictObject({
  agent: z.strictObject({
    id: z.string().min(1).optional(),
    name: freeTextSchema,
    agentType: z.enum(["Person", "Organization"]),
    affiliations: z.array(coreOrganizationSchema).min(1).optional(),
  }),
  roles: z.array(z.enum(CORE_ROLES)).length(1),
});

export type CoreAgentRole = z.infer<typeof coreAgentRoleSchema>;

const coreRecordSchema = z.strictObject({
  recordId: z.string().startsWith("urn:uuid:"),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  metadataLanguage: z.array(z.string().min(1)).min(1),
  metadataVersion: z.string().min(1),
  lifecycleEvents: z
    .array(
      z.strictObject({
        eventType: z.enum([
          "created",
          "validated",
          "registered",
          "published",
          "updated",
          "withdrawn",
          "tombstone",
        ]),
        timestamp: z.iso.datetime(),
      }),
    )
    .min(1),
});

const coreIdentificationFields = {
  sampleIdentifier: igsnSchema,
  landingPage: z.url(),
  titles: z.array(coreTitleSchema).length(1),
  localName: nameSchema.optional(),
};

const coreIdentificationSchema = z.strictObject(coreIdentificationFields);

const corePublicationSchema = z.strictObject({
  publisher: coreOrganizationSchema,
  publicationYear: publicationYearSchema,
});

const coreRightsAndAccessSchema = z.strictObject({
  rightsURIs: z.array(z.url()).min(1),
  metadataVisibility: z.literal("public"),
  sensitiveLocation: z.boolean(),
});

const coreSampleFields = {
  schemaVersion: z.literal(CORE_SCHEMA_VERSION),
  record: coreRecordSchema,
  identification: coreIdentificationSchema,
  classification: coreClassificationSchema,
  responsibility: z.array(coreAgentRoleSchema).min(1),
  publication: corePublicationSchema,
  production: coreProductionSchema,
  physicalDescription: corePhysicalDescriptionSchema.optional(),
  relations: z.array(coreRelationSchema).optional(),
  curation: coreCurationSchema,
  rightsAndAccess: coreRightsAndAccessSchema,
  manualGroups: z.array(coreManualGroupSchema).optional(),
  extensions: coreExtensionsSchema.optional(),
};

type CoreSampleCheck = {
  responsibility: CoreAgentRole[];
  relations?: CoreRelation[];
};

const checkCoreSample = (value: CoreSampleCheck, ctx: z.RefinementCtx) => {
  const held = new Set<string>();
  for (const [index, agentRole] of value.responsibility.entries()) {
    const role = agentRole.roles[0];
    if (role == null) continue;
    if (held.has(role) && !REPEATABLE_ROLES.includes(role)) {
      ctx.addIssue({
        code: "custom",
        path: ["responsibility", index],
        message: `${role} is held by a single agent`,
      });
    }
    held.add(role);
  }

  const parents = (value.relations ?? []).flatMap((relation, index) =>
    parentIgsnOf(relation) == null ? [] : [index],
  );
  const extra = parents[MAX_SAMPLE_PARENTS];
  if (extra != null) {
    ctx.addIssue({
      code: "custom",
      path: ["relations", extra],
      message: `a sample is derived from ${MAX_SAMPLE_PARENTS} parents at most`,
    });
  }
};

export const coreSampleSchema = z
  .strictObject(coreSampleFields)
  .superRefine(checkCoreSample);

export type CoreSample = z.infer<typeof coreSampleSchema>;

export const coreSampleBodySchema = z
  .strictObject({
    ...coreSampleFields,
    record: coreRecordSchema.optional(),
    identification: z.strictObject({
      ...coreIdentificationFields,
      sampleIdentifier: igsnSchema.optional(),
      landingPage: z.url().optional(),
    }),
    responsibility: z.array(coreAgentRoleSchema),
    publication: corePublicationSchema.optional(),
    rightsAndAccess: coreRightsAndAccessSchema.optional(),
  })
  .superRefine(checkCoreSample);

export type CoreSampleBody = z.infer<typeof coreSampleBodySchema>;
