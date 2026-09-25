import { z } from "zod";

import {
  coreIdentifierType,
  coreRelationType,
  coreTargetResourceType,
} from "../core/core-relation-schema.ts";

export const DATACITE_MEDIA_TYPE = "application/vnd.otelo.datacite+json";

export const DATACITE_SCHEMA_VERSION = "http://datacite.org/schema/kernel-4";

export const RESOURCE_TYPE_GENERAL = "PhysicalObject";

export const ORCID_SCHEME_URI = "https://orcid.org";

export const ROR_SCHEME_URI = "https://ror.org";

const CONTRIBUTOR_TYPES = [
  "DataCollector",
  "ProjectLeader",
  "HostingInstitution",
  "Researcher",
  "ProjectManager",
  "ProjectMember",
  "DataManager",
  "RightsHolder",
] as const;

export type DataCiteContributorType = (typeof CONTRIBUTOR_TYPES)[number];

const DATE_TYPES = [
  "Created",
  "Valid",
  "Issued",
  "Available",
  "Updated",
  "Withdrawn",
  "Collected",
] as const;

const identifierSchemeSchema = z.enum(["ORCID", "ROR"]).meta({
  description: "Registry the identifier belongs to.",
});

const schemeUriSchema = z.url().meta({ description: "Home of that registry." });

const nameIdentifierSchema = z.object({
  nameIdentifier: z.string().meta({
    description: "Identifier of the agent, an ORCID URI or a ROR URI.",
  }),
  nameIdentifierScheme: identifierSchemeSchema,
  schemeUri: schemeUriSchema,
});

const affiliationSchema = z.object({
  name: z.string().meta({ description: "Name of the organization." }),
  affiliationIdentifier: z
    .string()
    .meta({
      description:
        "ROR URI of the organization, absent for an OSU or a laboratory, which hold no ROR.",
    })
    .optional(),
  affiliationIdentifierScheme: identifierSchemeSchema.optional(),
  schemeUri: schemeUriSchema.optional(),
});

const agentShape = {
  name: z.string().meta({ description: "Full name of the agent." }),
  nameType: z.enum(["Personal", "Organizational"]).meta({
    description: "Whether the agent is a person or an organization.",
  }),
  nameIdentifiers: z
    .array(nameIdentifierSchema)
    .meta({
      description:
        "Registry identifiers of the agent, absent when it has none.",
    })
    .optional(),
  affiliation: z
    .array(affiliationSchema)
    .meta({ description: "Organizations the agent belongs to." })
    .optional(),
};

const creatorSchema = z.object(agentShape);

export type DataCiteCreator = z.infer<typeof creatorSchema>;

const contributorSchema = z.object({
  ...agentShape,
  contributorType: z.enum(CONTRIBUTOR_TYPES).meta({
    description: "Part the agent took, mapped from its IGSN Core role.",
  }),
});

export type DataCiteContributor = z.infer<typeof contributorSchema>;

const geoLocationSchema = z.object({
  geoLocationPlace: z
    .string()
    .meta({ description: "Name of the collection place." })
    .optional(),
  geoLocationPoint: z
    .object({
      pointLongitude: z
        .number()
        .meta({ description: "Longitude in decimal degrees." }),
      pointLatitude: z
        .number()
        .meta({ description: "Latitude in decimal degrees." }),
    })
    .meta({ description: "Point the sample was collected at." })
    .optional(),
  geoLocationBox: z
    .object({
      westBoundLongitude: z
        .number()
        .meta({ description: "Western edge in decimal degrees." }),
      eastBoundLongitude: z
        .number()
        .meta({ description: "Eastern edge in decimal degrees." }),
      southBoundLatitude: z
        .number()
        .meta({ description: "Southern edge in decimal degrees." }),
      northBoundLatitude: z
        .number()
        .meta({ description: "Northern edge in decimal degrees." }),
    })
    .meta({
      description:
        "Area the sample was collected over, also carrying a collection track.",
    })
    .optional(),
});

export type DataCiteGeoLocation = z.infer<typeof geoLocationSchema>;

const fundingReferenceSchema = z.object({
  funderName: z
    .string()
    .meta({ description: "Name of the research programme funded." })
    .optional(),
  funderIdentifier: z.string().meta({ description: "ROR URI of the funder." }),
  funderIdentifierType: z
    .literal("ROR")
    .meta({ description: "Registry that identifier belongs to." }),
  awardNumber: z
    .string()
    .meta({ description: "How the research programme is funded." })
    .optional(),
});

export type DataCiteFundingReference = z.infer<typeof fundingReferenceSchema>;

export const dataCiteSampleSchema = z
  .object({
    doi: z.string().meta({
      description: "DOI of the sample, its IGSN when it has none.",
    }),
    url: z.url().meta({ description: "Public page of the sample." }),
    titles: z
      .array(
        z.object({
          title: z.string().meta({ description: "Name of the sample." }),
        }),
      )
      .meta({ description: "Names of the sample." }),
    creators: z
      .array(creatorSchema)
      .meta({ description: "Agents credited with the sample." }),
    contributors: z
      .array(contributorSchema)
      .meta({ description: "Other agents involved with the sample." }),
    publisher: z
      .object({
        name: z
          .string()
          .meta({ description: "Name of the publishing organization." }),
        publisherIdentifier: z
          .string()
          .meta({ description: "ROR URI of that organization." }),
        publisherIdentifierScheme: z
          .literal("ROR")
          .meta({ description: "Registry that identifier belongs to." }),
        schemeUri: schemeUriSchema,
      })
      .meta({ description: "Organization publishing the sample." }),
    publicationYear: z
      .number()
      .int()
      .meta({ description: "Year the sample was published." }),
    types: z
      .object({
        resourceType: z
          .string()
          .meta({ description: "Head material of the sample." })
          .optional(),
        resourceTypeGeneral: z.literal(RESOURCE_TYPE_GENERAL).meta({
          description: "Kind of resource, always a physical object.",
        }),
      })
      .meta({ description: "What the record describes." }),
    subjects: z
      .array(
        z.object({
          subject: z
            .string()
            .meta({ description: "Value of the classification entry." }),
          subjectScheme: z
            .string()
            .meta({ description: "Vocabulary it belongs to." }),
          schemeUri: z
            .string()
            .meta({ description: "URI naming that vocabulary." }),
          valueUri: z
            .string()
            .meta({ description: "Mindat page of a mineral entry." })
            .optional(),
          classificationCode: z
            .string()
            .meta({
              description:
                "Strunz code of a Strunz-Mindat entry, the mineral's own when a mineral is set.",
            })
            .optional(),
        }),
      )
      .meta({
        description:
          "Scientific context of the sample, then its Strunz-Mindat (2026) classifications.",
      }),
    dates: z
      .array(
        z.object({
          date: z.string().meta({
            description:
              "The date itself, two dates joined by a slash for a period.",
          }),
          dateType: z
            .enum(DATE_TYPES)
            .meta({ description: "What happened on that date." }),
        }),
      )
      .meta({ description: "Dated history of the sample." }),
    language: z
      .string()
      .meta({ description: "Language the metadata is written in." }),
    alternateIdentifiers: z
      .array(
        z.object({
          alternateIdentifier: z
            .string()
            .meta({ description: "The identifier itself." }),
          alternateIdentifierType: z
            .literal("UUID")
            .meta({ description: "Kind of identifier." }),
        }),
      )
      .meta({ description: "Other identifiers the sample carries." }),
    relatedIdentifiers: z
      .array(
        z.object({
          relatedIdentifier: z
            .string()
            .meta({ description: "Identifier of the related resource." }),
          relatedIdentifierType: coreIdentifierType.schema.meta({
            description: "Kind of identifier the value is written as.",
          }),
          relationType: coreRelationType.schema.meta({
            description:
              "How the sample relates to that resource, IsDerivedFrom naming a parent sample.",
          }),
          resourceTypeGeneral: coreTargetResourceType.schema.meta({
            description: "Kind of resource the relation points at.",
          }),
        }),
      )
      .meta({ description: "Resources the sample relates to." }),
    sizes: z.array(z.string()).meta({
      description:
        "Measurements of the sample, each a value and its UCUM unit code.",
    }),
    rightsList: z
      .array(
        z.object({
          rights: z.string().meta({ description: "Name of the licence." }),
          rightsUri: z.url().meta({ description: "URI of the licence." }),
          rightsIdentifier: z
            .string()
            .meta({ description: "SPDX code of the licence." }),
          rightsIdentifierScheme: z
            .literal("SPDX")
            .meta({ description: "Registry that code belongs to." }),
        }),
      )
      .meta({ description: "Licences the metadata is released under." }),
    geoLocations: z.array(geoLocationSchema).meta({
      description: "Where the sample was collected.",
    }),
    fundingReferences: z.array(fundingReferenceSchema).meta({
      description: "Organizations funding the research programme.",
    }),
    descriptions: z
      .array(
        z.object({
          description: z.string().meta({ description: "The text itself." }),
          descriptionType: z
            .enum(["Abstract", "Other"])
            .meta({ description: "What the text describes." }),
        }),
      )
      .meta({ description: "Free-text descriptions of the sample." }),
    schemaVersion: z.literal(DATACITE_SCHEMA_VERSION).meta({
      description: "DataCite metadata kernel the record follows.",
    }),
  })
  .meta({
    id: "DataCiteSample",
    description: "A published sample as a DataCite 4.7 record.",
  });

export type DataCiteSample = z.infer<typeof dataCiteSampleSchema>;
