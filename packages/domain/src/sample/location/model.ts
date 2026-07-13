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

// Signed elevation: positive above the datum (elevation), negative below
// (bathymetry). A point carries one value; an area carries a min and a max.
const pointElevationSchema = z.object({
  value: z.number(),
  unit: elevationUnitSchema,
  datum: verticalDatumSchema,
});
const areaElevationSchema = z.object({
  min: z.number(),
  max: z.number(),
  unit: elevationUnitSchema,
  datum: verticalDatumSchema,
});

const positionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("point"),
    longitude: longitudeSchema,
    latitude: latitudeSchema,
    elevation: pointElevationSchema.nullish(),
  }),
  z.object({
    type: z.literal("area"),
    westLongitude: longitudeSchema,
    eastLongitude: longitudeSchema,
    southLatitude: latitudeSchema,
    northLatitude: latitudeSchema,
    elevation: areaElevationSchema.nullish(),
  }),
]);

const regionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("continent"), country: countrySchema }),
  z.object({ kind: z.literal("ocean"), oceanSea: oceanSeaSchema }),
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
    if (position?.type !== "area") return;
    if (position.northLatitude < position.southLatitude) {
      ctx.addIssue({
        code: "custom",
        path: ["position", "northLatitude"],
        message: "northLatitude must be greater than or equal to southLatitude",
      });
    }
    if (position.elevation && position.elevation.min > position.elevation.max) {
      ctx.addIssue({
        code: "custom",
        path: ["position", "elevation", "min"],
        message: "elevation min must be less than or equal to max",
      });
    }
  });

export type Location = z.infer<typeof locationSchema>;
