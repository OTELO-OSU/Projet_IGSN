import { z } from "zod";

// A sample's safety hazards. Every part is independent and optional, even at
// publication; `sample.security` as a whole is nullable. Each hazard is a
// yes/no flag with an optional free-text explanation, following the
// `oriented`/`orientationExplanation` seam in description/model.ts.
const freeText = z.string().trim().min(1);

// Each hazard flag and its explanation, so the refinement below is one loop.
const HAZARDS = [
  { flag: "radioactivity", explanation: "radioactivityExplanation" },
  { flag: "asbestosRich", explanation: "asbestosExplanation" },
  { flag: "chemicalRisk", explanation: "chemicalRiskExplanation" },
] as const;

export const securitySchema = z
  .object({
    radioactivity: z.boolean().nullish(),
    radioactivityExplanation: freeText.nullish(),
    asbestosRich: z.boolean().nullish(),
    asbestosExplanation: freeText.nullish(),
    chemicalRisk: z.boolean().nullish(),
    chemicalRiskExplanation: freeText.nullish(),
  })
  .superRefine((security, ctx) => {
    // An explanation documents a declared hazard, so it is meaningless unless
    // its flag was answered yes. params.code lets the admin form translate the
    // issue without matching on the message text.
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
