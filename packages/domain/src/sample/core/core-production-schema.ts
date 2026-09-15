import { z } from "zod";

import { timeZoneSchema } from "../../date/time-zone.ts";
import { organizationRorSchema } from "../../institutional-group/organization.ts";
import { collectionMethodSchema } from "../collection-method/vocabulary.ts";
import { localDateTimeSchema } from "../date-range.ts";
import { freeTextSchema } from "../free-text.ts";
import { countrySchema } from "../location/country.ts";
import { navigationTypeSchema } from "../location/navigation-type.ts";
import { oceanSeaSchema } from "../location/ocean-sea.ts";
import { VERTICAL_REFERENCES } from "../location/vertical-reference.ts";
import { experimentTypeSchema } from "../synthetic-details/experiment-type.ts";
import { conceptSchema } from "./concept.ts";
import { coreEnum, toCamelCase } from "./core-enum.ts";

export const CRS84 = "http://www.opengis.net/def/crs/OGC/1.3/CRS84";

export const coreVerticalReference = coreEnum(VERTICAL_REFERENCES, toCamelCase);

const corePositionSchema = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);

type CorePosition = z.infer<typeof corePositionSchema>;

// A ring drawn from an area is [[w,s],[e,s],[e,n],[w,n],[w,s]].
const isClosedRectangle = (ring: CorePosition[]): boolean => {
  const longitudes = ring.map(([longitude]) => longitude);
  const latitudes = ring.map(([, latitude]) => latitude);
  return (
    longitudes[0] === longitudes[3] &&
    longitudes[0] === longitudes[4] &&
    longitudes[1] === longitudes[2] &&
    latitudes[0] === latitudes[1] &&
    latitudes[0] === latitudes[4] &&
    latitudes[2] === latitudes[3]
  );
};

const geometryTypeDescription = "Shape the sample was collected over.";

const coreGeometrySchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("Point").meta({ description: geometryTypeDescription }),
    coordinates: corePositionSchema.meta({
      description:
        "Longitude then latitude of the collection point, in decimal degrees.",
    }),
  }),
  z.strictObject({
    type: z
      .literal("LineString")
      .meta({ description: geometryTypeDescription }),
    coordinates: z.array(corePositionSchema).length(2).meta({
      description:
        "Both ends of the collection track, each longitude then latitude in decimal degrees.",
    }),
  }),
  z.strictObject({
    type: z.literal("Polygon").meta({ description: geometryTypeDescription }),
    coordinates: z
      .array(z.array(corePositionSchema).length(5))
      .length(1)
      .refine((rings) => rings[0] != null && isClosedRectangle(rings[0]), {
        error: "a polygon ring must be a closed rectangle",
      })
      .meta({
        description:
          "One rectangular ring of five positions closing on its first, a west beyond its east crossing the dateline.",
      }),
  }),
]);

const coreVerticalCoordinateSchema = z.strictObject({
  value: z
    .number()
    .meta({ description: "Vertical coordinate of the sample, in metres." }),
  unitCode: z
    .literal("m")
    .meta({ description: "Unit of that coordinate, always the metre." }),
  reference: coreVerticalReference.schema.meta({
    description:
      "What the coordinate is measured from, an elevation or one of our depth references.",
  }),
  verticalDatum: z
    .string()
    .min(1)
    .meta({
      description:
        "Vertical reference system of the coordinate, an EPSG code when the system has one.",
    })
    .optional(),
  positiveDirection: z
    .enum(["up", "down"])
    .meta({
      description:
        "Which way the coordinate grows, up for an elevation and down for a depth.",
    })
    .optional(),
});

export const coreLocationSchema = z
  .strictObject({
    geometry: coreGeometrySchema
      .meta({
        description:
          "Where the sample was collected, as a point, a track or an area.",
      })
      .optional(),
    crs: z
      .literal(CRS84)
      .meta({
        description:
          "Coordinate reference system of the geometry, always CRS84.",
      })
      .optional(),
    verticalExtent: z
      .strictObject({
        minimum: coreVerticalCoordinateSchema
          .meta({
            description:
              "Lower vertical coordinate of the collection, and the only one a point carries.",
          })
          .optional(),
        maximum: coreVerticalCoordinateSchema
          .meta({
            description:
              "Upper vertical coordinate of the collection, refused on a point.",
          })
          .optional(),
      })
      .meta({ description: "Vertical extent the sample was collected over." })
      .optional(),
    placeNames: z
      .array(freeTextSchema)
      .length(1)
      .meta({
        description: "Locality the sample was collected at, exactly one name.",
      })
      .optional(),
    countryCodes: z
      .array(countrySchema)
      .length(1)
      .meta({
        description:
          "Country the sample was collected in, exactly one code and never together with oceanOrSea.",
      })
      .optional(),
    oceanOrSea: conceptSchema("ocean-sea", oceanSeaSchema)
      .meta({
        description:
          "Ocean or sea the sample was collected in, never together with countryCodes.",
      })
      .optional(),
    navigationMethod: conceptSchema("navigation-type", navigationTypeSchema)
      .meta({
        description:
          "How the position was determined, which requires a geometry.",
      })
      .optional(),
    locationDescription: freeTextSchema
      .meta({ description: "Free-text description of the collection place." })
      .optional(),
  })
  .superRefine((location, ctx) => {
    if (location.countryCodes != null && location.oceanOrSea != null) {
      ctx.addIssue({
        code: "custom",
        path: ["oceanOrSea"],
        message: "a sample sits on land or at sea, never both",
      });
    }
    if (
      location.geometry?.type === "Point" &&
      location.verticalExtent?.maximum != null
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["verticalExtent", "maximum"],
        message: "a point carries a single vertical coordinate",
      });
    }
  });

export type CoreLocation = z.infer<typeof coreLocationSchema>;

const coreProjectSchema = z.strictObject({
  name: freeTextSchema
    .meta({
      description:
        "Name of the research programme the sample was collected for.",
    })
    .optional(),
  fundingReferences: z
    .array(
      z.strictObject({
        value: z.string().min(1).meta({
          description: "ROR identifier of the funding organization.",
        }),
        identifierType: z
          .literal("ROR")
          .meta({ description: "Kind of identifier, always a ROR." }),
      }),
    )
    .min(1)
    .meta({ description: "Organizations funding that programme." })
    .optional(),
  funding: freeTextSchema
    .meta({ description: "Free text about how the programme is funded." })
    .optional(),
  description: freeTextSchema
    .meta({ description: "Free-text description of the programme." })
    .optional(),
  campaign: freeTextSchema
    .meta({
      description: "Field campaign the sample was collected during.",
    })
    .optional(),
});

const coreTimestampSchema = z.union([z.iso.date(), localDateTimeSchema]);

const hourPrecisionHasTimeZone = (
  ctx: z.RefinementCtx,
  precision: string | undefined,
  timeZone: string | undefined,
  path: string,
): void => {
  if ((precision === "hour") !== (timeZone != null)) {
    ctx.addIssue({
      code: "custom",
      path: [path],
      message: "an hour precision date carries its time zone, a day does not",
    });
  }
};

export const coreProcessStepSchema = z
  .strictObject({
    stepType: z.literal("Synthesis").meta({
      description: "Kind of step, always the synthesis of a synthetic sample.",
    }),
    description: freeTextSchema
      .meta({ description: "Experimental protocol the synthesis followed." })
      .optional(),
    timestampStart: coreTimestampSchema
      .meta({
        description: "Start of the synthesis, at the precision below.",
      })
      .optional(),
    timestampEnd: coreTimestampSchema
      .meta({ description: "End of the synthesis, at the precision below." })
      .optional(),
    timestampPrecision: z
      .enum(["day", "hour"])
      .meta({
        description: "Precision both synthesis timestamps are written at.",
      })
      .optional(),
    timestampTimeZone: timeZoneSchema
      .meta({
        description:
          "IANA time zone of the synthesis timestamps, present exactly when the precision is the hour.",
      })
      .optional(),
    method: conceptSchema("experiment-type", experimentTypeSchema)
      .meta({
        description:
          "Type of experiment the sample was synthesized by, which must match extensions.experiment.experimentType.",
      })
      .optional(),
  })
  .superRefine((step, ctx) => {
    if ((step.timestampPrecision != null) !== (step.timestampStart != null)) {
      ctx.addIssue({
        code: "custom",
        path: ["timestampPrecision"],
        message: "a step timestamp carries its precision",
      });
    }
    hourPrecisionHasTimeZone(
      ctx,
      step.timestampPrecision,
      step.timestampTimeZone,
      "timestampTimeZone",
    );
  });

export type CoreProcessStep = z.infer<typeof coreProcessStepSchema>;

const ROR_PREFIX = "https://ror.org/";

export const toRorUri = (ror: string): string => `${ROR_PREFIX}${ror}`;

export const fromRorUri = (uri: string): string =>
  organizationRorSchema.safeParse(uri.replace(ROR_PREFIX, "")).data ?? uri;

export const coreProductionSchema = z
  .strictObject({
    collection_date_start: z.string().min(1).meta({
      description:
        "Start of the collection, at the precision below; required on a published sample.",
    }),
    collection_date_end: z.string().min(1).meta({
      description:
        "End of the collection, equal to the start for a one-off collection; required on a published sample.",
    }),
    collectionDatePrecision: z.enum(["day", "hour"]).meta({
      description:
        "Precision both collection dates are written at; required on a published sample.",
    }),
    collectionDateTimeZone: timeZoneSchema
      .meta({
        description:
          "IANA time zone of the collection dates, present exactly when the precision is the hour.",
      })
      .optional(),
    collectionMethod: conceptSchema(
      "sample_description",
      collectionMethodSchema,
    )
      .meta({ description: "How the sample was collected." })
      .optional(),
    collectionMethodDescription: freeTextSchema
      .meta({ description: "Free text about how the sample was collected." })
      .optional(),
    samplingPurpose: freeTextSchema
      .meta({
        description:
          "Mission the sample was collected for, on a field sample alone.",
      })
      .optional(),
    samplingSite_name: freeTextSchema
      .meta({
        description:
          "Name of the field the sample was collected on, on a field sample alone.",
      })
      .optional(),
    projects: z
      .array(coreProjectSchema)
      .length(1)
      .meta({
        description:
          "Research programme the sample was collected under, exactly one when any of its fields is set.",
      })
      .optional(),
    processSteps: z
      .array(coreProcessStepSchema)
      .length(1)
      .meta({
        description:
          "Synthesis the sample was produced by, exactly one step on a synthetic sample.",
      })
      .optional(),
    location: coreLocationSchema
      .meta({
        description:
          "Where the sample was collected, refused on a sub-sample since it inherits its parent's location.",
      })
      .optional(),
  })
  .superRefine((production, ctx) => {
    hourPrecisionHasTimeZone(
      ctx,
      production.collectionDatePrecision,
      production.collectionDateTimeZone,
      "collectionDateTimeZone",
    );
  });

export type CoreProduction = z.infer<typeof coreProductionSchema>;
