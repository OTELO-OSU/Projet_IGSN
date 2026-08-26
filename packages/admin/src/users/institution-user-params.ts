import type { ListUsersQuery } from "@projet-igsn/domain/user/user-validator";

import { parseInstitutionFilter } from "@projet-igsn/domain/institutional-group/institution-filter";

type InstitutionUserParams = Pick<
  ListUsersQuery,
  "institutionalOrganization" | "institutionalOsu" | "institutionalLaboratory"
>;

export function institutionUserParams(
  institution: string | undefined,
): InstitutionUserParams {
  const parsed = institution ? parseInstitutionFilter(institution) : null;

  switch (parsed?.kind) {
    case "organization":
      return { institutionalOrganization: parsed.code };
    case "osu":
      return {
        institutionalOrganization: parsed.organizationRor,
        institutionalOsu: parsed.code,
      };
    case "laboratory":
      return { institutionalLaboratory: parsed.code };
    default:
      return {};
  }
}
