import { z } from "zod";

// ponytail: MOCK data, the real laboratory list lands later with a generator script the way scripts/sync-organizations.ts regenerates organization.ts
export type Laboratory = {
  code: string;
  acronym: string;
  name: string;
  osu: string | null;
  organizationRors: readonly string[];
};

export const LABORATORIES: readonly Laboratory[] = [
  {
    code: "CRPG",
    acronym: "CRPG",
    name: "Centre de Recherches Pétrographiques et Géochimiques",
    osu: "OTELo",
    organizationRors: ["04vfs2w97", "04kdfz702"],
  },
  {
    code: "GEORESSOURCES",
    acronym: "GeoRessources",
    name: "Laboratoire GeoRessources",
    osu: "OTELo",
    organizationRors: ["04vfs2w97"],
  },
  {
    code: "ISTERRE",
    acronym: "ISTerre",
    name: "Institut des Sciences de la Terre",
    osu: "OSUG",
    organizationRors: ["04kdfz702"],
  },
  {
    code: "GEOSCIENCES-RENNES",
    acronym: "Géosciences Rennes",
    name: "Laboratoire Géosciences Rennes",
    osu: "OSUR",
    organizationRors: ["04kdfz702"],
  },
  {
    code: "LAB-BRGM",
    acronym: "BRGM Labo",
    name: "Laboratoires d'analyse du BRGM",
    osu: null,
    organizationRors: ["05hnb7x64"],
  },
];

// ponytail: format only like osuCodeSchema, membership enforced by the cascade validator
export const laboratoryCodeSchema = z.string().trim().min(1);
