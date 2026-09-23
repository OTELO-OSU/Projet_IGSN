import { z } from "zod";

import type { ScientificContext } from "../scientific-context/model.ts";

import { igsnSchema } from "../../igsn/model.ts";
import { freeTextSchema } from "../free-text.ts";
import { materialPathSchema } from "../material/classification.ts";
import { nameSchema } from "../sample.ts";

export const suspectedDuplicateSchema = z
  .object({
    id: z.uuid().meta({
      description: "Internal identifier of the already published sample.",
    }),
    igsn: igsnSchema.meta({
      description:
        "IGSN of the already published sample, with no doi.org or igsn: prefix.",
    }),
    name: z.string().meta({
      description: "Name the already published sample carries.",
    }),
  })
  .meta({
    id: "SuspectedDuplicate",
    description:
      "A published sample carrying the same name, material and collector as the submitted record.",
  });

export type SuspectedDuplicate = z.infer<typeof suspectedDuplicateSchema>;

export const duplicateCriteriaSchema = z.object({
  name: nameSchema,
  material: materialPathSchema,
  collectorUserId: z.uuid().nullable(),
  collectorFirstname: freeTextSchema.nullable(),
  collectorLastname: freeTextSchema.nullable(),
});

export type DuplicateCriteria = z.infer<typeof duplicateCriteriaSchema>;

export type DuplicateCandidate = {
  name?: string | null;
  material?: string | null;
  scientificContext?: Partial<
    Pick<
      ScientificContext,
      "collectorUserId" | "collectorFirstname" | "collectorLastname"
    >
  > | null;
};

export function toDuplicateCriteria(
  sample: DuplicateCandidate,
): DuplicateCriteria | null {
  const material = sample.material ?? null;
  const collectorUserId = sample.scientificContext?.collectorUserId ?? null;
  const collectorFirstname =
    sample.scientificContext?.collectorFirstname ?? null;
  const collectorLastname = sample.scientificContext?.collectorLastname ?? null;
  const name = sample.name ?? "";
  if (name.trim() === "" || material == null) return null;
  return {
    name,
    material,
    collectorUserId,
    collectorFirstname,
    collectorLastname,
  };
}

const sameDuplicateCriteria = (a: DuplicateCandidate, b: DuplicateCandidate) =>
  JSON.stringify(toDuplicateCriteria(a)) ===
  JSON.stringify(toDuplicateCriteria(b));

export function duplicateCheckCriteria(
  candidate: DuplicateCandidate,
  {
    previous,
    confirmed,
  }: { previous?: DuplicateCandidate | null; confirmed?: boolean } = {},
): DuplicateCriteria | null {
  if (confirmed === true) return null;
  if (previous != null && sameDuplicateCriteria(candidate, previous))
    return null;
  return toDuplicateCriteria(candidate);
}
