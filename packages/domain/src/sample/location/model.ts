import { z } from "zod";

import { countrySchema } from "./country.ts";
import { elevationUnitSchema } from "./elevation-unit.ts";
import { navigationTypeSchema } from "./navigation-type.ts";
import { oceanSeaSchema } from "./ocean-sea.ts";
import { verticalDatumSchema } from "./vertical-datum.ts";

// A sample's geographic location (ADR 0014). Every part is independent and
// optional: `position` (a point or an area) governs only the coordinate block,
// while region, navigation type and locality stand alone (a locality-only
// location is valid). `sample.location` as a whole is nullable.
//
// nameSchema is not imported from sample.ts: sample.ts imports this module, so
// the dependency must not run the other way.
const freeText = z.string().trim().min(1);
const longitudeSchema = z.number().min(-180).max(180);
const latitudeSchema = z.number().min(-90).max(90);

// Signed elevation range in whole units: positive above the datum (elevation),
// negative below (bathymetry). A point is the degenerate range where
// min === max (ADR 0014). Completeness (both bounds, a shared unit and datum) is
// required to publish, not to save a draft, so every part is nullish here and
// the missing pieces surface as publish blockers (like age; ADR 0014). Only the
// data-validity invariants stay in the schema: whole numbers and min <= max.
const elevationSchema = z.object({
  min: z.number().int().nullish(),
  max: z.number().int().nullish(),
  unit: elevationUnitSchema.nullish(),
  datum: verticalDatumSchema.nullish(),
});

const positionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("point"),
    longitude: longitudeSchema,
    latitude: latitudeSchema,
    elevation: elevationSchema.nullish(),
  }),
  z.object({
    type: z.literal("area"),
    westLongitude: longitudeSchema,
    eastLongitude: longitudeSchema,
    southLatitude: latitudeSchema,
    northLatitude: latitudeSchema,
    elevation: elevationSchema.nullish(),
  }),
]);

// The leaf is optional: a region kind alone (e.g. "ocean, unknown which") is
// valid data, in draft and published alike.
const regionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("continent"), country: countrySchema.nullish() }),
  z.object({ kind: z.literal("ocean"), oceanSea: oceanSeaSchema.nullish() }),
]);

export const locationSchema = z
  .object({
    position: positionSchema.nullish(),
    region: regionSchema.nullish(),
    navigationType: navigationTypeSchema.nullish(),
    localityName: freeText.nullish(),
    localityDescription: freeText.nullish(),
  })
  // Longitude ordering is intentionally unchecked: west > east is a valid
  // dateline-crossing area (ADR 0014). Latitude ordering and the elevation range
  // are real invariants.
  .superRefine((location, ctx) => {
    const { position } = location;
    // Navigation type records how the coordinates were fixed, so it is
    // meaningless without a position (ADR 0014). The discriminated unions
    // already bind coordinates to their type and country/ocean to the region
    // kind, so those pairings cannot come apart.
    if (location.navigationType != null && !position) {
      ctx.addIssue({
        code: "custom",
        path: ["navigationType"],
        message: "navigationType requires a position",
      });
    }
    if (!position) return;
    if (
      position.type === "area" &&
      position.northLatitude < position.southLatitude
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["position", "northLatitude"],
        message: "northLatitude must be greater than or equal to southLatitude",
      });
    }
    const elevation = position.elevation;
    if (
      elevation?.min != null &&
      elevation.max != null &&
      elevation.min > elevation.max
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["position", "elevation", "min"],
        message: "elevation min must be less than or equal to max",
      });
    }
  });

export type Location = z.infer<typeof locationSchema>;
