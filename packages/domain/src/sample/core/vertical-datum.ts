import type { VerticalReferenceSystem } from "../location/vertical-reference-system.ts";

import { VERTICAL_REFERENCE_SYSTEMS } from "../location/vertical-reference-system.ts";

const EPSG_BY_VERTICAL_SYSTEM: Partial<
  Record<VerticalReferenceSystem, string>
> = {
  ngf_ign69: "EPSG:5720",
  ngf_ign78: "EPSG:5721",
  evrf2019: "EPSG:9389",
  evrf2019_mean_tide: "EPSG:9390",
  egm2008: "EPSG:3855",
  egm96: "EPSG:5773",
  msl: "EPSG:5714",
  dhhn2016: "EPSG:7837",
  nap: "EPSG:5709",
  odn: "EPSG:5701",
  ln02: "EPSG:5728",
  lhn95: "EPSG:5729",
  navd88: "EPSG:5703",
  ahd: "EPSG:5711",
};

const SYSTEM_BY_DATUM = new Map(
  VERTICAL_REFERENCE_SYSTEMS.map((system) => [
    EPSG_BY_VERTICAL_SYSTEM[system] ?? system,
    system,
  ]),
);

export function toVerticalDatum(system: VerticalReferenceSystem): string {
  return EPSG_BY_VERTICAL_SYSTEM[system] ?? system;
}

export function fromVerticalDatum(
  datum: string,
): VerticalReferenceSystem | null {
  return SYSTEM_BY_DATUM.get(datum) ?? null;
}
