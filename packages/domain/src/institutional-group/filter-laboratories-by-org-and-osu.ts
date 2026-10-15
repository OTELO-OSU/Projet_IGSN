import { findOsu } from "./find-osu.ts";
import { type Laboratory, LABORATORIES } from "./laboratory.ts";

export function filterLaboratoriesByOrgAndOsu({
  organizationRor,
  osu,
}: {
  organizationRor?: string;
  osu?: string | null;
}): Laboratory[] {
  const osuCode = osu == null ? osu : (findOsu(osu)?.code ?? osu);
  return LABORATORIES.filter(
    (laboratory) =>
      (organizationRor == null ||
        laboratory.organizationRors.includes(organizationRor)) &&
      (osuCode == null || laboratory.osu === osuCode),
  );
}
