import { z } from "zod";

export const ISAMPLES_MEDIA_TYPE = "application/vnd.otelo.isamples+json";

export const ISAMPLES_SCHEMA_URI = "https://w3id.org/isample/schema/2.0";

const VOCABULARY_BASE = "https://w3id.org/isample/vocabulary/";

export type ISamplesVocabulary = {
  base: string;
  schemeName: string;
  schemeUri: string;
};

const vocabulary = (
  name: string,
  schemeName: string,
  schemeSlug: string,
): ISamplesVocabulary => ({
  base: `${VOCABULARY_BASE}${name}/`,
  schemeName,
  schemeUri: `${VOCABULARY_BASE}${name}/1.0/${schemeSlug}`,
});

export const MATERIAL_VOCABULARY = vocabulary(
  "material",
  "iSamples Materials Vocabulary",
  "materialsvocabulary",
);

export const SAMPLED_FEATURE_VOCABULARY = vocabulary(
  "sampledfeature",
  "iSamples Sampled Feature Type vocabulary",
  "sampledfeaturevocabulary",
);

export const OBJECT_TYPE_VOCABULARY = vocabulary(
  "materialsampleobjecttype",
  "iSamples Material Sample Object Type Vocabulary",
  "materialsampleobjecttype",
);

const agentSchema = z.object({
  name: z.string().meta({ description: "Full name of the agent." }),
  pid: z
    .string()
    .meta({
      description:
        "Identifier of the agent, an ORCID URI for a person and a ROR URI for an organization.",
    })
    .optional(),
  affiliation: z
    .string()
    .meta({ description: "Organizations the agent belongs to, in one line." })
    .optional(),
  role: z.string().meta({
    description: "Part the agent took, mapped from its IGSN Core role.",
  }),
});

export type ISamplesAgent = z.infer<typeof agentSchema>;

const identifiedConceptSchema = z.object({
  label: z.string().meta({ description: "Name of the concept." }),
  pid: z
    .string()
    .meta({ description: "URI of the concept in its vocabulary." })
    .optional(),
  scheme_name: z
    .string()
    .meta({ description: "Vocabulary the concept belongs to." }),
  scheme_uri: z.string().meta({ description: "URI naming that vocabulary." }),
});

export type ISamplesConcept = z.infer<typeof identifiedConceptSchema>;

const samplingSiteSchema = z.object({
  description: z
    .string()
    .meta({ description: "Free-text description of the collection place." })
    .optional(),
  place_name: z.string().array().meta({
    description:
      "Names of the collection place: its locality, then its country or its ocean.",
  }),
});

const geospatialCoordLocationSchema = z.object({
  latitude: z
    .number()
    .meta({ description: "Latitude in decimal degrees." })
    .optional(),
  longitude: z
    .number()
    .meta({ description: "Longitude in decimal degrees." })
    .optional(),
  elevation: z
    .string()
    .meta({
      description:
        "Vertical coordinate of the collection, its unit and what it is measured from.",
    })
    .optional(),
  obfuscated: z.boolean().meta({
    description:
      "Whether the coordinates are withheld because the place is sensitive.",
  }),
});

const samplingEventSchema = z.object({
  label: z
    .string()
    .meta({ description: "Name of the field the sample was collected on." })
    .optional(),
  description: z
    .string()
    .meta({ description: "Mission the sample was collected for." })
    .optional(),
  responsibility: z
    .array(agentSchema)
    .meta({ description: "Agents who collected the sample." }),
  authorized_by: z
    .array(z.string())
    .meta({ description: "Names of the agents who authorized the sampling." }),
  result_time: z
    .string()
    .meta({ description: "When the sample was collected." }),
  project: z
    .string()
    .meta({ description: "Research programme the sample was collected for." })
    .optional(),
  sampling_site: samplingSiteSchema
    .meta({ description: "Named place the sample was collected at." })
    .optional(),
  sample_location: geospatialCoordLocationSchema
    .meta({ description: "Coordinates the sample was collected at." })
    .optional(),
});

const materialSampleCurationSchema = z.object({
  label: z.string().meta({ description: "Whether the sample still exists." }),
  access_constraints: z
    .array(z.string())
    .meta({ description: "Whether the sample can be requested." }),
  curation_location: z
    .string()
    .meta({ description: "Institution and collection holding the sample." })
    .optional(),
  responsibility: z
    .array(agentSchema)
    .meta({ description: "Agents curating the sample." }),
});

const sampleRelationSchema = z.object({
  relationship: z
    .string()
    .meta({ description: "How the sample relates to that resource." }),
  target: z
    .string()
    .meta({ description: "Identifier of the related resource." }),
  label: z.string().meta({ description: "Name of the related resource." }),
  description: z
    .string()
    .meta({ description: "Free-text description of the related resource." })
    .optional(),
});

export const iSamplesSampleSchema = z
  .object({
    pid: z.string().meta({ description: "IGSN of the sample." }),
    sample_identifier: z
      .string()
      .meta({ description: "Public page of the sample." }),
    label: z.string().meta({ description: "Name of the sample." }),
    description: z
      .string()
      .meta({ description: "Physical description of the sample." })
      .optional(),
    alternate_identifiers: z
      .array(z.string())
      .meta({ description: "Other identifiers the sample carries." }),
    keywords: z.array(identifiedConceptSchema).meta({
      description: "Elements the sample is of economic interest for.",
    }),
    dc_rights: z
      .string()
      .meta({ description: "Licence the metadata is released under." }),
    last_modified_time: z
      .string()
      .meta({ description: "When the sample was last updated." }),
    complies_with: z
      .array(z.string())
      .meta({ description: "Schemas the record follows." }),
    has_material_category: z
      .array(identifiedConceptSchema)
      .meta({ description: "Material of the sample, in the iSamples terms." }),
    has_sample_object_type: z.array(identifiedConceptSchema).meta({
      description: "Kind of object the sample is, in the iSamples terms.",
    }),
    has_context_category: z.array(identifiedConceptSchema).meta({
      description: "Environment the sample was taken from.",
    }),
    registrant: agentSchema
      .meta({ description: "Agent who registered the sample." })
      .optional(),
    sampling_purpose: z
      .string()
      .meta({ description: "Mission the sample was collected for." })
      .optional(),
    produced_by: samplingEventSchema.meta({
      description: "How, when and where the sample was collected.",
    }),
    curation: materialSampleCurationSchema.meta({
      description: "Who holds the sample and under which conditions.",
    }),
    related_resource: z
      .array(sampleRelationSchema)
      .meta({ description: "Resources the sample relates to." }),
  })
  .meta({
    id: "ISamplesSample",
    description: "A published sample as an iSamples Core 2.0 record.",
  });

export type ISamplesSample = z.infer<typeof iSamplesSampleSchema>;
