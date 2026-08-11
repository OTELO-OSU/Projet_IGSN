import { type Laboratory, LABORATORIES } from "./laboratory.ts";

export function filterLaboratoriesByOrgAndOsu({
  organizationRor,
  osu,
}: {
  organizationRor: string;
  osu?: string | null;
}): Laboratory[] {
  return LABORATORIES.filter(
    (laboratory) =>
      laboratory.organizationRors.includes(organizationRor) &&
      (osu == null || laboratory.osu === osu),
  );
}
