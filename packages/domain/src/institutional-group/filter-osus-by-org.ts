import { type Osu, OSUS } from "./osu.ts";

export function filterOsusByOrg(organizationRor: string): Osu[] {
  return OSUS.filter((osu) => osu.organizationRors.includes(organizationRor));
}
