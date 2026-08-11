import { z } from "zod";

import { organizationRorSchema } from "../sample/scientific-context/organization.ts";
import { filterLaboratoriesByOrgAndOsu } from "./filter-laboratories-by-org-and-osu.ts";
import { filterOsusByOrg } from "./filter-osus-by-org.ts";
import { laboratoryCodeSchema } from "./laboratory.ts";
import { osuCodeSchema } from "./osu.ts";

export const setInstitutionalGroupsSchema = z
  .strictObject({
    institutionalOrganization: organizationRorSchema,
    institutionalOsu: osuCodeSchema.nullish(),
    institutionalLaboratory: laboratoryCodeSchema,
  })
  .superRefine((groups, ctx) => {
    const { institutionalOrganization: ror, institutionalOsu: osu } = groups;

    if (osu != null && !filterOsusByOrg(ror).some((o) => o.code === osu)) {
      ctx.addIssue({
        code: "custom",
        path: ["institutionalOsu"],
        message: "OSU does not belong to the submitted organization",
      });
      return;
    }

    if (
      !filterLaboratoriesByOrgAndOsu({ organizationRor: ror, osu }).some(
        (laboratory) => laboratory.code === groups.institutionalLaboratory,
      )
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["institutionalLaboratory"],
        message: "laboratory does not belong to the submitted group",
      });
    }
  });

export type SetInstitutionalGroups = z.infer<
  typeof setInstitutionalGroupsSchema
>;
