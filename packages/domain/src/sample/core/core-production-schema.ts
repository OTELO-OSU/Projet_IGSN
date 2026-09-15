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

const coreGeometrySchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("Point"),
    coordinates: corePositionSchema,
  }),
  z.strictObject({
    type: z.literal("LineString"),
    coordinates: z.array(corePositionSchema).length(2),
  }),
  z.strictObject({
    type: z.literal("Polygon"),
    coordinates: z
      .array(z.array(corePositionSchema).length(5))
      .length(1)
      .refine((rings) => rings[0] != null && isClosedRectangle(rings[0]), {
        error: "a polygon ring must be a closed rectangle",
      }),
  }),
]);

const coreVerticalCoordinateSchema = z.strictObject({
  value: z.number(),
  unitCode: z.literal("m"),
  reference: coreVerticalReference.schema,
  verticalDatum: z.string().min(1).optional(),
  positiveDirection: z.enum(["up", "down"]).optional(),
});

export const coreLocationSchema = z
  .strictObject({
    geometry: coreGeometrySchema.optional(),
    crs: z.literal(CRS84).optional(),
    verticalExtent: z
      .strictObject({
        minimum: coreVerticalCoordinateSchema.optional(),
        maximum: coreVerticalCoordinateSchema.optional(),
      })
      .optional(),
    placeNames: z.array(freeTextSchema).length(1).optional(),
    countryCodes: z.array(countrySchema).length(1).optional(),
    oceanOrSea: conceptSchema("ocean-sea", oceanSeaSchema).optional(),
    navigationMethod: conceptSchema(
      "navigation-type",
      navigationTypeSchema,
    ).optional(),
    locationDescription: freeTextSchema.optional(),
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
  name: freeTextSchema.optional(),
  fundingReferences: z
    .array(
      z.strictObject({
        value: z.string().min(1),
        identifierType: z.literal("ROR"),
      }),
    )
    .min(1)
    .optional(),
  funding: freeTextSchema.optional(),
  description: freeTextSchema.optional(),
  campaign: freeTextSchema.optional(),
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
    stepType: z.literal("Synthesis"),
    description: freeTextSchema.optional(),
    timestampStart: coreTimestampSchema.optional(),
    timestampEnd: coreTimestampSchema.optional(),
    timestampPrecision: z.enum(["day", "hour"]).optional(),
    timestampTimeZone: timeZoneSchema.optional(),
    method: conceptSchema("experiment-type", experimentTypeSchema).optional(),
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
    collection_date_start: z.string().min(1),
    collection_date_end: z.string().min(1),
    collectionDatePrecision: z.enum(["day", "hour"]),
    collectionDateTimeZone: timeZoneSchema.optional(),
    collectionMethod: conceptSchema(
      "sample_description",
      collectionMethodSchema,
    ).optional(),
    collectionMethodDescription: freeTextSchema.optional(),
    samplingPurpose: freeTextSchema.optional(),
    samplingSite_name: freeTextSchema.optional(),
    projects: z.array(coreProjectSchema).length(1).optional(),
    processSteps: z.array(coreProcessStepSchema).length(1).optional(),
    location: coreLocationSchema.optional(),
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
