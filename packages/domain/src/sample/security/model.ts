import { z } from "zod";

import { freeTextSchema } from "../free-text.ts";

const HAZARDS = [
  { flag: "radioactivity", explanation: "radioactivityExplanation" },
  { flag: "asbestosRich", explanation: "asbestosExplanation" },
  { flag: "chemicalRisk", explanation: "chemicalRiskExplanation" },
] as const;

export const securitySchema = z
  .object({
    radioactivity: z.boolean().nullish(),
    radioactivityExplanation: freeTextSchema.nullish(),
    asbestosRich: z.boolean().nullish(),
    asbestosExplanation: freeTextSchema.nullish(),
    chemicalRisk: z.boolean().nullish(),
    chemicalRiskExplanation: freeTextSchema.nullish(),
  })
  .superRefine((security, ctx) => {
    for (const { flag, explanation } of HAZARDS) {
      if (security[explanation] != null && security[flag] !== true) {
        ctx.addIssue({
          code: "custom",
          path: [explanation],
          message: `${explanation} requires ${flag} to be true`,
          params: { code: `${flag}_explanation_requires_flag` },
        });
      }
    }
  });

export type Security = z.infer<typeof securitySchema>;
