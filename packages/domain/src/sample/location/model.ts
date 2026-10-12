import { z } from "zod";

import { freeTextSchema } from "../free-text.ts";
import { countrySchema } from "./country.ts";
import { navigationTypeSchema } from "./navigation-type.ts";
import { oceanSeaSchema } from "./ocean-sea.ts";
import { verticalReferenceSystemSchema } from "./vertical-reference-system.ts";
import {
  VERTICAL_REFERENCES,
  verticalReferenceSchema,
} from "./vertical-reference.ts";

const longitudeSchema = z.number().min(-180).max(180);
const latitudeSchema = z.number().min(-90).max(90);

export const positionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("point"),
    longitude: longitudeSchema,
    latitude: latitudeSchema,
  }),
  z.object({
    type: z.literal("area"),
    westLongitude: longitudeSchema,
    eastLongitude: longitudeSchema,
    southLatitude: latitudeSchema,
    northLatitude: latitudeSchema,
  }),
  z.object({
    type: z.literal("line"),
    startLongitude: longitudeSchema,
    startLatitude: latitudeSchema,
    endLongitude: longitudeSchema,
    endLatitude: latitudeSchema,
  }),
]);

// The vertical reference carries the direction, so a value is a distance.
const verticalValueSchema = z.number().min(0).nullish();

export const verticalPositionSchema = z.object({
  reference: verticalReferenceSchema.nullish(),
  system: verticalReferenceSystemSchema.nullish(),
  start: verticalValueSchema,
  end: verticalValueSchema,
});

export type VerticalPosition = z.infer<typeof verticalPositionSchema>;

const regionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("country"), country: countrySchema.nullish() }),
  z.object({ kind: z.literal("ocean"), oceanSea: oceanSeaSchema.nullish() }),
]);

export const locationSchema = z
  .object({
    position: positionSchema.nullish(),
    region: regionSchema.nullish(),
    navigationType: navigationTypeSchema.nullish(),
    localityName: freeTextSchema.nullish(),
    localityDescription: freeTextSchema.nullish(),
    verticalPositions: z
      .array(verticalPositionSchema)
      .max(VERTICAL_REFERENCES.length, { abort: true })
      .optional(),
  })
  // West > east is a valid dateline-crossing area (ADR 0014).
  .superRefine((location, ctx) => {
    const { position } = location;
    if (location.navigationType != null && !position) {
      ctx.addIssue({
        code: "custom",
        path: ["navigationType"],
        message: "navigationType requires a position",
      });
    }
    location.verticalPositions?.forEach((entry, index, entries) => {
      if (!position) {
        ctx.addIssue({
          code: "custom",
          path: ["verticalPositions", index],
          message: "a vertical position requires a position",
        });
      }
      if (
        entry.reference != null &&
        entries
          .slice(0, index)
          .some(({ reference }) => reference === entry.reference)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["verticalPositions", index, "reference"],
          message: "a vertical reference appears at most once",
        });
      }
      if (
        (position?.type === "point" || position?.type === "area") &&
        entry.start != null &&
        entry.end != null &&
        entry.start > entry.end
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["verticalPositions", index, "start"],
          message: "vertical start must be less than or equal to end",
        });
      }
    });
    if (
      position?.type === "area" &&
      position.northLatitude < position.southLatitude
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["position", "northLatitude"],
        message: "northLatitude must be greater than or equal to southLatitude",
      });
    }
  });

export type Location = z.infer<typeof locationSchema>;
