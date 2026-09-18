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

const agentIdSchema = z
  .string()
  .min(1)
  .meta({
    description:
      "Identifier of the agent, an ORCID URI for a person and a ROR URI for an organization.",
  })
  .optional();

const coreAgentSchema = z
  .discriminatedUnion("agentType", [
    z.strictObject({
      agentType: z.literal("Person").meta({
        description: "Whether the agent is a person or an organization.",
      }),
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
    }),
    z.strictObject({
      agentType: z.literal("Organization").meta({
        description: "Whether the agent is a person or an organization.",
      }),
      id: agentIdSchema,
      name: freeTextSchema.meta({ description: "Name of the organization." }),
    }),
  ])
  .meta({ description: "Person or organization holding the role." });

const coreAgentRoleSchema = z.strictObject({
  agent: coreAgentSchema,
  roles: z.array(z.enum(CORE_ROLES)).length(1).meta({
    description:
      "The single role the agent holds; only HostingInstitution is held by several agents.",
  }),
});

export type CoreAgentRole = z.infer<typeof coreAgentRoleSchema>;

const coreRecordSchema = z.strictObject({
  recordId: z.string().startsWith("urn:uuid:").meta({
    description: "Internal identifier of the record; emit only.",
  }),
  createdAt: z.iso.datetime().meta({
    description: "When the sample was first created; emit only.",
  }),
  updatedAt: z.iso.datetime().meta({
    description: "When the sample was last updated; emit only.",
  }),
  metadataLanguage: z.array(z.string().min(1)).min(1).meta({
    description: "Languages the metadata is written in; emit only.",
  }),
  metadataVersion: z.string().min(1).meta({
    description: "Version of the metadata record; emit only.",
  }),
  lifecycleEvents: z
    .array(
      z.strictObject({
        eventType: z
          .enum([
            "created",
            "validated",
            "registered",
            "published",
            "updated",
            "withdrawn",
            "tombstone",
          ])
          .meta({
            description:
              "What happened to the sample, only created, published and updated ever being emitted.",
          }),
        timestamp: z.iso
          .datetime()
          .meta({ description: "When that event happened." }),
      }),
    )
    .min(1)
    .meta({
      description: "Dated history of the sample; emit only.",
    }),
});

const coreIdentificationFields = {
  sampleIdentifier: igsnSchema.meta({
    description:
      "IGSN of the sample, minted by the registry; emit only, ignored on input.",
  }),
  doi: z
    .string()
    .meta({
      description:
        "DOI of the sample, minted at publication; emit only, ignored on input.",
    })
    .optional(),
  landingPage: z.url().meta({
    description: "Public page of the sample on the registry; emit only.",
  }),
  titles: z.array(coreTitleSchema).length(1).meta({
    description: "Name of the sample, exactly one title.",
  }),
  localName: nameSchema
    .meta({ description: "Name the sample carries in its own collection." })
    .optional(),
};

const coreIdentificationSchema = z.strictObject(coreIdentificationFields);

const corePublicationSchema = z.strictObject({
  publisher: coreOrganizationSchema.meta({
    description: "Organization publishing the sample, always OTELo.",
  }),
  publicationYear: publicationYearSchema.meta({
    description:
      "Year the sample was published, set when the IGSN is minted; emit only.",
  }),
});

const coreRightsAndAccessSchema = z.strictObject({
  rightsURIs: z.array(z.url()).min(1).meta({
    description: "Licences the metadata is released under; emit only.",
  }),
  metadataVisibility: z.literal("public").meta({
    description: "Who may read the metadata, always everyone; emit only.",
  }),
  sensitiveLocation: z.boolean().meta({
    description:
      "Whether the collection place is withheld, always false; emit only.",
  }),
});

const RESPONSIBILITY_DESCRIPTION =
  "Agents involved with the sample, one role each; the Creator and the Registrant are emit only, since a sample created here belongs to the account's owner.";

const coreSampleFields = {
  schemaVersion: z.literal(CORE_SCHEMA_VERSION).meta({
    description: "Version of IGSN Core the record follows.",
  }),
  record: coreRecordSchema.meta({
    description: "Lifecycle metadata the registry owns; emit only.",
  }),
  identification: coreIdentificationSchema.meta({
    description: "Identifiers and names of the sample.",
  }),
  classification: coreClassificationSchema.meta({
    description: "What the sample is and the scientific context it comes from.",
  }),
  responsibility: z
    .array(coreAgentRoleSchema)
    .min(1)
    .meta({ description: RESPONSIBILITY_DESCRIPTION }),
  publication: corePublicationSchema.meta({
    description: "Who published the sample and when; emit only.",
  }),
  production: coreProductionSchema.meta({
    description: "How, when and where the sample was produced.",
  }),
  physicalDescription: corePhysicalDescriptionSchema
    .meta({ description: "Physical form of the sample." })
    .optional(),
  relations: z
    .array(coreRelationSchema)
    .meta({
      description:
        "Resources the sample relates to, a parent sample riding as an IsDerivedFrom relation, two at most.",
    })
    .optional(),
  curation: coreCurationSchema.meta({
    description: "Who holds the sample and under which conditions.",
  }),
  rightsAndAccess: coreRightsAndAccessSchema.meta({
    description: "Licence and visibility of the metadata; emit only.",
  }),
  manualGroups: z
    .array(coreManualGroupSchema)
    .meta({ description: "Manual groups the sample is attached to." })
    .optional(),
  extensions: coreExtensionsSchema
    .meta({
      description:
        "Metadata IGSN Core has no slot for: geology, safety and synthesis.",
    })
    .optional(),
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
  .superRefine(checkCoreSample)
  .meta({
    id: "CoreSample",
    description: "A published sample as an IGSN Core v0.10.0 record.",
  });

export type CoreSample = z.infer<typeof coreSampleSchema>;

export const coreSampleBodySchema = z
  .strictObject({
    ...coreSampleFields,
    record: coreSampleFields.record.optional(),
    identification: z
      .strictObject({
        ...coreIdentificationFields,
        sampleIdentifier: coreIdentificationFields.sampleIdentifier.optional(),
        landingPage: coreIdentificationFields.landingPage.optional(),
      })
      .meta({ description: "Identifiers and names of the sample." }),
    responsibility: z
      .array(coreAgentRoleSchema)
      .meta({ description: RESPONSIBILITY_DESCRIPTION }),
    publication: coreSampleFields.publication.optional(),
    rightsAndAccess: coreSampleFields.rightsAndAccess.optional(),
  })
  .superRefine(checkCoreSample)
  .meta({
    id: "CoreSampleBody",
    description:
      "An IGSN Core v0.10.0 record submitted to create or update a sample.",
  });

export type CoreSampleBody = z.infer<typeof coreSampleBodySchema>;
