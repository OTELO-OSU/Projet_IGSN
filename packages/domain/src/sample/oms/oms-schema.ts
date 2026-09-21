import { z } from "zod";

import {
  coreGeometrySchema,
  coreVerticalExtentSchema,
} from "../core/core-production-schema.ts";

export const OMS_MEDIA_TYPE = "application/vnd.otelo.oms+json";

const SOSA_FEATURES =
  "https://opengeospatial.github.io/ogcapi-sosa/build/annotated/sosa/features/";

export const OMS_SAMPLE_CONTEXT = `${SOSA_FEATURES}sample/context.jsonld`;

export const OMS_SAMPLE_COLLECTION_CONTEXT = `${SOSA_FEATURES}sampleCollection/context.jsonld`;

const conceptSchema = z.object({
  id: z
    .string()
    .meta({ description: "Our code or dot path for this concept." }),
  label: z.string().meta({ description: "Leaf segment of that code." }),
  schemeName: z
    .string()
    .meta({ description: "OTELo vocabulary the concept belongs to." }),
  schemeURI: z
    .string()
    .meta({ description: "Constant URN naming that vocabulary." }),
  notation: z
    .string()
    .meta({
      description:
        "Qualifier telling two concepts of the same vocabulary apart.",
    })
    .optional(),
});

const samplerSchema = z.object({
  "@id": z
    .string()
    .meta({ description: "ORCID URI of the person who collected the sample." })
    .optional(),
  name: z.string().meta({ description: "Full name of that person." }),
});

const samplingSchema = z.object({
  startTime: z
    .string()
    .meta({ description: "Start of the collection, at the precision below." }),
  endTime: z
    .string()
    .meta({ description: "End of the collection, at the precision below." }),
  timePrecision: z
    .string()
    .meta({ description: "Precision both collection times are written at." }),
  timeZone: z
    .string()
    .meta({
      description:
        "IANA time zone of the collection times, present at the hour precision alone.",
    })
    .optional(),
  usedProcedure: conceptSchema
    .meta({ description: "How the sample was collected." })
    .optional(),
  procedureDescription: z
    .string()
    .meta({ description: "Free text about how the sample was collected." })
    .optional(),
  description: z
    .string()
    .meta({ description: "Mission the sample was collected for." })
    .optional(),
  hasFeatureOfInterest: z
    .string()
    .meta({ description: "Name of the field the sample was collected on." })
    .optional(),
  madeBySampler: samplerSchema
    .meta({ description: "Person who collected the sample." })
    .optional(),
});

const preparationStepSchema = z.object({
  stepType: z
    .string()
    .meta({ description: "Kind of step the sample went through." }),
  startTime: z
    .string()
    .meta({ description: "Start of the step, at the precision below." })
    .optional(),
  endTime: z
    .string()
    .meta({ description: "End of the step, at the precision below." })
    .optional(),
  timePrecision: z
    .string()
    .meta({ description: "Precision both step times are written at." })
    .optional(),
  timeZone: z
    .string()
    .meta({
      description:
        "IANA time zone of the step times, present at the hour precision alone.",
    })
    .optional(),
  description: z
    .string()
    .meta({ description: "Free text about the step." })
    .optional(),
});

const omsSamplePropertiesSchema = z.object({
  sampleIdentifier: z.string().meta({ description: "IGSN of the sample." }),
  name: z.string().meta({ description: "Name of the sample." }),
  localName: z
    .string()
    .meta({ description: "Name the sample carries in its own collection." })
    .optional(),
  specimenType: z.array(conceptSchema).meta({
    description: "What the sample physically is and the kind of object it is.",
  }),
  materialCategory: conceptSchema
    .meta({ description: "Head material of the sample." })
    .optional(),
  contextCategory: z
    .array(conceptSchema)
    .meta({ description: "Scientific context of the sample." }),
  placeName: z
    .string()
    .meta({ description: "Locality the sample was collected at." })
    .optional(),
  locationDescription: z
    .string()
    .meta({ description: "Free-text description of the collection place." })
    .optional(),
  verticalExtent: coreVerticalExtentSchema.optional(),
  countryCode: z
    .string()
    .meta({ description: "Country the sample was collected in." })
    .optional(),
  oceanOrSea: conceptSchema
    .meta({ description: "Ocean or sea the sample was collected in." })
    .optional(),
  navigationMethod: conceptSchema
    .meta({ description: "How the position was determined." })
    .optional(),
  isResultOf: samplingSchema.meta({
    description: "Sampling the sample is the result of.",
  }),
  preparationStep: z
    .array(preparationStepSchema)
    .meta({ description: "Steps the sample was produced by, in order." }),
  hasOriginalSample: z.array(z.string()).meta({
    description: "Landing pages of the samples this one was derived from.",
  }),
  rightsURI: z
    .string()
    .meta({ description: "Licence the metadata is released under." })
    .optional(),
});

const omsFeatureSchema = z.object({
  "@id": z.string().meta({ description: "Public page of the sample." }),
  type: z.literal("Feature").meta({ description: "GeoJSON object type." }),
  featureType: z
    .literal("sosa:Sample")
    .meta({ description: "SOSA class the feature carries." }),
  geometry: coreGeometrySchema
    .nullable()
    .meta({ description: "Where the sample was collected." }),
  properties: omsSamplePropertiesSchema.meta({
    description: "SOSA and ISO 19156 terms of the sample.",
  }),
});

export type OmsFeature = z.infer<typeof omsFeatureSchema>;

export const omsSampleSchema = omsFeatureSchema
  .extend({
    "@context": z
      .literal(OMS_SAMPLE_CONTEXT)
      .meta({ description: "JSON-LD context of the SOSA sample feature." }),
  })
  .meta({
    id: "OmsSample",
    description: "A published sample as an OGC-OMS / SOSA GeoJSON feature.",
  });

export type OmsSample = z.infer<typeof omsSampleSchema>;

export const omsSampleCollectionSchema = z
  .object({
    "@context": z.literal(OMS_SAMPLE_COLLECTION_CONTEXT).meta({
      description: "JSON-LD context of the SOSA sample collection feature.",
    }),
    type: z
      .literal("FeatureCollection")
      .meta({ description: "GeoJSON object type." }),
    featureType: z
      .literal("sosa:SampleCollection")
      .meta({ description: "SOSA class the collection carries." }),
    numberMatched: z
      .number()
      .meta({ description: "Samples the query matched in all." }),
    numberReturned: z
      .number()
      .meta({ description: "Samples this page holds." }),
    features: z
      .array(omsFeatureSchema)
      .meta({ description: "Samples of this page, each as a feature." }),
  })
  .meta({
    id: "OmsSampleCollection",
    description:
      "A page of published samples as an OGC-OMS / SOSA GeoJSON feature collection.",
  });

export type OmsSampleCollection = z.infer<typeof omsSampleCollectionSchema>;
