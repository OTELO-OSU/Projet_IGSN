import { z } from "zod";

import type { InstitutionalGroups } from "./model.ts";

import { filterLaboratoriesByOrgAndOsu } from "./filter-laboratories-by-org-and-osu.ts";
import { filterOsusByOrg } from "./filter-osus-by-org.ts";
import { laboratoryCodeSchema } from "./laboratory.ts";
import { organizationRorSchema } from "./organization.ts";
import { osuCodeSchema } from "./osu.ts";

type DeclaredInstitutionalGroups = {
  institutionalOrganization: string;
  institutionalOsu?: string | null;
  institutionalLaboratory: string;
};

type InstitutionalGroupIssue = {
  path:
    | "institutionalOrganization"
    | "institutionalOsu"
    | "institutionalLaboratory";
  message: string;
};

export function institutionalGroupIssues(
  groups: DeclaredInstitutionalGroups,
): InstitutionalGroupIssue[] {
  const { institutionalOrganization: ror, institutionalOsu: osu } = groups;

  if (osu != null && !filterOsusByOrg(ror).some((o) => o.code === osu)) {
    return [
      {
        path: "institutionalOsu",
        message: "OSU does not belong to the submitted organization",
      },
    ];
  }

  if (
    !filterLaboratoriesByOrgAndOsu({ organizationRor: ror, osu }).some(
      (laboratory) => laboratory.code === groups.institutionalLaboratory,
    )
  ) {
    return [
      {
        path: "institutionalLaboratory",
        message: "laboratory does not belong to the submitted group",
      },
    ];
  }

  return [];
}

// An account either declared no institution yet, or carries a whole organization and laboratory.
export function optionalInstitutionalGroupIssues(
  groups: InstitutionalGroups,
): InstitutionalGroupIssue[] {
  const {
    institutionalOrganization: ror,
    institutionalOsu: osu,
    institutionalLaboratory: laboratory,
  } = groups;

  if (ror === null && osu === null && laboratory === null) {
    return [];
  }
  if (ror === null) {
    return [
      {
        path: "institutionalOrganization",
        message: "organization is required",
      },
    ];
  }
  if (laboratory === null) {
    return [
      { path: "institutionalLaboratory", message: "laboratory is required" },
    ];
  }

  return institutionalGroupIssues({
    institutionalOrganization: ror,
    institutionalOsu: osu,
    institutionalLaboratory: laboratory,
  });
}

export const setInstitutionalGroupsSchema = z
  .strictObject({
    institutionalOrganization: organizationRorSchema,
    institutionalOsu: osuCodeSchema.nullish(),
    institutionalLaboratory: laboratoryCodeSchema,
  })
  .superRefine((groups, ctx) => {
    for (const issue of institutionalGroupIssues(groups)) {
      ctx.addIssue({
        code: "custom",
        path: [issue.path],
        message: issue.message,
      });
    }
  });

export type SetInstitutionalGroups = z.infer<
  typeof setInstitutionalGroupsSchema
>;
