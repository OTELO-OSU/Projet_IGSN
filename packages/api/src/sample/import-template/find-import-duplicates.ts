import type { ImportDuplicate } from "@projet-igsn/domain/sample/import/import-report";
import type { SampleRepository } from "@projet-igsn/domain/sample/repository";

import {
  type DuplicateCriteria,
  duplicateCriteriaSchema,
  toDuplicateCriteria,
} from "@projet-igsn/domain/sample/publication/suspected-duplicate";
import { z } from "zod";

import { queueBuild } from "./build-queue.ts";
import { buildSampleInputs } from "./build-sample-inputs.ts";
import { parseImport } from "./validate-import.ts";

const duplicateCandidateSchema = z.object({
  name: z.string().nullish(),
  material: z.string().nullish(),
  scientificContext: duplicateCriteriaSchema
    .pick({
      collectorUserId: true,
      collectorFirstname: true,
      collectorLastname: true,
    })
    .partial()
    .nullish(),
});

const criteriaOf = (input: unknown): DuplicateCriteria | undefined => {
  const candidate = duplicateCandidateSchema.safeParse(input);
  return candidate.success
    ? duplicateCriteriaSchema.safeParse(toDuplicateCriteria(candidate.data))
        .data
    : undefined;
};

export function findImportDuplicates(
  bytes: ArrayBuffer,
  findDuplicatesOfEach: SampleRepository["findDuplicatesOfEach"],
): Promise<ImportDuplicate[]> {
  return queueBuild(async () => {
    const opened = await parseImport(bytes);
    if ("issues" in opened) return [];
    const checked = buildSampleInputs(opened.parsed).samples.flatMap(
      ({ row, input }) => {
        const criteria = criteriaOf(input);
        return criteria === undefined ? [] : [{ row, criteria }];
      },
    );
    const found = await findDuplicatesOfEach(
      checked.map(({ criteria }) => criteria),
    );
    return checked.flatMap(({ row }, index) => {
      const duplicates = found[index] ?? [];
      return duplicates.length === 0 ? [] : [{ row, duplicates }];
    });
  });
}
