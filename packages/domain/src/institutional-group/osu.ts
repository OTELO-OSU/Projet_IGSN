import { z } from "zod";

// ponytail: MOCK data, the real OSU list lands later with a generator script the way scripts/sync-organizations.ts regenerates organization.ts
export type Osu = {
  code: string;
  name: string;
  organizationRor: string;
};

export const OSUS: readonly Osu[] = [
  {
    code: "OTELo",
    name: "Observatoire Terre et Environnement de Lorraine",
    organizationRor: "04vfs2w97",
  },
  {
    code: "OSUG",
    name: "Observatoire des Sciences de l'Univers de Grenoble",
    organizationRor: "04kdfz702",
  },
  {
    code: "OSUR",
    name: "Observatoire des Sciences de l'Univers de Rennes",
    organizationRor: "04kdfz702",
  },
];

// ponytail: format only, not membership in OSUS, so a stored code survives the real list replacing these rows; the cascade validator owns membership
export const osuCodeSchema = z.string().trim().min(1);
