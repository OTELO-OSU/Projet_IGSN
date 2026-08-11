import { z } from "zod";

import { freeTextSchema } from "../free-text.ts";
import { countrySchema } from "./country.ts";
import { elevationUnitSchema } from "./elevation-unit.ts";
import { navigationTypeSchema } from "./navigation-type.ts";
import { oceanSeaSchema } from "./ocean-sea.ts";
import { verticalDatumSchema } from "./vertical-datum.ts";

const longitudeSchema = z.number().min(-180).max(180);
const latitudeSchema = z.number().min(-90).max(90);

// Signed elevation range: positive above the datum (elevation),
// negative below (bathymetry).
const elevationSchema = z.object({
  min: z.number().nullish(),
  max: z.number().nullish(),
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

const regionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("continent"), country: countrySchema.nullish() }),
  z.object({ kind: z.literal("ocean"), oceanSea: oceanSeaSchema.nullish() }),
]);

export const locationSchema = z
  .object({
    position: positionSchema.nullish(),
    region: regionSchema.nullish(),
    navigationType: navigationTypeSchema.nullish(),
    localityName: freeTextSchema.nullish(),
    localityDescription: freeTextSchema.nullish(),
  })
  // Longitude ordering is intentionally unchecked: west > east is a valid
  // dateline-crossing area (ADR 0014).
  .superRefine((location, ctx) => {
    const { position } = location;
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
