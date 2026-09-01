import { z } from "zod";

import { freeTextSchema } from "../free-text.ts";
import { countrySchema } from "./country.ts";
import { navigationTypeSchema } from "./navigation-type.ts";
import { oceanSeaSchema } from "./ocean-sea.ts";
import { verticalReferenceSystemSchema } from "./vertical-reference-system.ts";
import { verticalReferenceSchema } from "./vertical-reference.ts";

const longitudeSchema = z.number().min(-180).max(180);
const latitudeSchema = z.number().min(-90).max(90);

// The vertical reference carries the direction, so the position is a distance.
const verticalPositionSchema = z.number().min(0).nullish();
const verticalMetaShape = {
  reference: verticalReferenceSchema.nullish(),
  system: verticalReferenceSystemSchema.nullish(),
};

const positionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("point"),
    longitude: longitudeSchema,
    latitude: latitudeSchema,
    vertical: z
      .object({ position: verticalPositionSchema, ...verticalMetaShape })
      .nullish(),
  }),
  z.object({
    type: z.literal("area"),
    westLongitude: longitudeSchema,
    eastLongitude: longitudeSchema,
    southLatitude: latitudeSchema,
    northLatitude: latitudeSchema,
    vertical: z
      .object({
        min: verticalPositionSchema,
        max: verticalPositionSchema,
        ...verticalMetaShape,
      })
      .nullish(),
  }),
  z.object({
    type: z.literal("line"),
    startLongitude: longitudeSchema,
    startLatitude: latitudeSchema,
    endLongitude: longitudeSchema,
    endLatitude: latitudeSchema,
    vertical: z
      .object({
        start: verticalPositionSchema,
        end: verticalPositionSchema,
        ...verticalMetaShape,
      })
      .nullish(),
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
    if (!position) return;
    if (position.type === "area") {
      if (position.northLatitude < position.southLatitude) {
        ctx.addIssue({
          code: "custom",
          path: ["position", "northLatitude"],
          message:
            "northLatitude must be greater than or equal to southLatitude",
        });
      }
      const vertical = position.vertical;
      if (
        vertical?.min != null &&
        vertical.max != null &&
        vertical.min > vertical.max
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["position", "vertical", "min"],
          message: "vertical min must be less than or equal to max",
        });
      }
    }
  });

export type Location = z.infer<typeof locationSchema>;
