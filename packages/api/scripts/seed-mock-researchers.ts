import type { UserStatus } from "@projet-igsn/domain/user/model";

import { z } from "zod";

import type { SampleOwner } from "./seed-sample-row.ts";

type SeedUser = SampleOwner & {
  email: string;
  name: string;
  firstname: string;
  status: UserStatus;
  superAdmin: boolean;
  hasAcceptedCharter?: false;
};

export const researcherKeySchema = z.enum([
  "marie",
  "jean",
  "sophie",
  "pierre",
  "camille",
  "luc",
  "nadia",
  "theo",
  "chloe",
  "hugo",
]);
export type ResearcherKey = z.infer<typeof researcherKeySchema>;

export const MOCK_RESEARCHERS: Record<ResearcherKey, SeedUser> = {
  marie: {
    id: "01980e2d-6f9b-7000-8000-000000000001",
    email: "marie.dupont@univ-lorraine.fr",
    name: "Dupont",
    firstname: "Marie",
    status: "accepted",
    superAdmin: false,
    institutionalOrganization: "04vfs2w97",
    institutionalOsu: "OTELo",
    institutionalLaboratory: "UMR7358",
    manualGroups: [
      "01980e2d-6f9b-7000-9000-000000000001",
      "01980e2d-6f9b-7000-9000-000000000003",
    ],
  },
  jean: {
    id: "01980e2d-6f9b-7000-8000-000000000002",
    email: "jean.martin@univ-lorraine.fr",
    name: "Martin",
    firstname: "Jean",
    status: "accepted",
    superAdmin: false,
    institutionalOrganization: "04vfs2w97",
    institutionalOsu: "OTELo",
    institutionalLaboratory: "UMR7359",
    manualGroups: [
      "01980e2d-6f9b-7000-9000-000000000001",
      "01980e2d-6f9b-7000-9000-000000000008",
    ],
  },
  sophie: {
    id: "01980e2d-6f9b-7000-8000-000000000003",
    email: "sophie.bernard@univ-lorraine.fr",
    name: "Bernard",
    firstname: "Sophie",
    status: "accepted",
    superAdmin: false,
    institutionalOrganization: "02rx3b187",
    institutionalOsu: "OSUG",
    institutionalLaboratory: "UMR5275",
    manualGroups: ["01980e2d-6f9b-7000-9000-000000000005"],
  },
  pierre: {
    id: "01980e2d-6f9b-7000-8000-000000000004",
    email: "pierre.durand@univ-lorraine.fr",
    name: "Durand",
    firstname: "Pierre",
    status: "accepted",
    superAdmin: false,
    institutionalOrganization: "04vfs2w97",
    institutionalOsu: "OTELo",
    institutionalLaboratory: "UMR7358",
    manualGroups: [
      "01980e2d-6f9b-7000-9000-000000000002",
      "01980e2d-6f9b-7000-9000-000000000004",
    ],
  },
  camille: {
    id: "01980e2d-6f9b-7000-8000-000000000005",
    email: "camille.petit@univ-lorraine.fr",
    name: "Petit",
    firstname: "Camille",
    status: "accepted",
    superAdmin: false,
    institutionalOrganization: "014zrew76",
    institutionalOsu: "OSUC",
    institutionalLaboratory: "UMR7327",
    manualGroups: ["01980e2d-6f9b-7000-9000-000000000006"],
  },
  luc: {
    id: "01980e2d-6f9b-7000-8000-000000000006",
    email: "luc.moreau@univ-lorraine.fr",
    name: "Moreau",
    firstname: "Luc",
    status: "accepted",
    superAdmin: false,
    institutionalOrganization: "05hnb7x64",
    institutionalOsu: null,
    institutionalLaboratory: "UMR7327",
    manualGroups: [],
  },
  nadia: {
    id: "01980e2d-6f9b-7000-8000-000000000007",
    email: "nadia.leroy@univ-lorraine.fr",
    name: "Leroy",
    firstname: "Nadia",
    status: "accepted",
    superAdmin: true,
    institutionalOrganization: "04vfs2w97",
    institutionalOsu: "OTELo",
    institutionalLaboratory: "UMR7358",
    manualGroups: ["01980e2d-6f9b-7000-9000-000000000003"],
  },
  theo: {
    id: "01980e2d-6f9b-7000-8000-000000000008",
    email: "theo.roux@univ-lorraine.fr",
    name: "Roux",
    firstname: "Theo",
    status: "pending",
    superAdmin: false,
    hasAcceptedCharter: false,
    institutionalOrganization: null,
    institutionalOsu: null,
    institutionalLaboratory: null,
    manualGroups: [],
  },
  chloe: {
    id: "01980e2d-6f9b-7000-8000-000000000009",
    email: "chloe.girard@univ-lorraine.fr",
    name: "Girard",
    firstname: "Chloe",
    status: "rejected",
    superAdmin: false,
    institutionalOrganization: "04vfs2w97",
    institutionalOsu: "OTELo",
    institutionalLaboratory: "UMR7358",
    manualGroups: ["01980e2d-6f9b-7000-9000-00000000000a"],
  },
  hugo: {
    id: "01980e2d-6f9b-7000-8000-00000000000a",
    email: "hugo.fournier@univ-lorraine.fr",
    name: "Fournier",
    firstname: "Hugo",
    status: "pending",
    superAdmin: false,
    institutionalOrganization: "04vfs2w97",
    institutionalOsu: "OTELo",
    institutionalLaboratory: "UMR7359",
    manualGroups: [],
  },
};
