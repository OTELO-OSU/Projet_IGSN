import { z } from "zod";

import { filterLaboratoriesByOrgAndOsu } from "../../institutional-group/filter-laboratories-by-org-and-osu.ts";
import { laboratoryCodeSchema } from "../../institutional-group/laboratory.ts";
import { isKnownInstitutionalCode } from "../../institutional-group/model.ts";
import { osuCodeSchema } from "../../institutional-group/osu.ts";
import { freeTextSchema } from "../free-text.ts";
import { uniqueRorArraySchema } from "../scientific-context/model.ts";

export const repositorySchema = z.object({
  currentArchiveOsu: osuCodeSchema.nullish(),
  currentArchiveLaboratory: laboratoryCodeSchema.nullish(),
  currentArchiveContactFirstname: freeTextSchema.nullish(),
  currentArchiveContactLastname: freeTextSchema.nullish(),
  collectionName: freeTextSchema.nullish(),
  rightsHolder: uniqueRorArraySchema("rights_holder_duplicate"),
});

export type Repository = z.infer<typeof repositorySchema>;

export const createRepositorySchema = repositorySchema.superRefine(
  ({ currentArchiveOsu: osu, currentArchiveLaboratory: laboratory }, ctx) => {
    if (osu != null && !isKnownInstitutionalCode("osu", osu)) {
      ctx.addIssue({
        code: "custom",
        path: ["currentArchiveOsu"],
        message: "unknown OSU",
      });
    }
    if (
      laboratory != null &&
      !filterLaboratoriesByOrgAndOsu({ osu }).some(
        (candidate) => candidate.code === laboratory,
      )
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["currentArchiveLaboratory"],
        message: "laboratory does not belong to the archiving OSU",
      });
    }
  },
);
