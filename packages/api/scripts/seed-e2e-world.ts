import type { Kysely } from "kysely";

import { generateIgsnSuffix } from "@projet-igsn/domain/igsn/generate-igsn-suffix";
import {
  laboratoryLabel,
  laboratoryShortLabel,
  organizationLabel,
  osuLabel,
} from "@projet-igsn/domain/institutional-group/label";
import { MANAGED_LABORATORY_ITEMS } from "@projet-igsn/domain/institutional-group/managed-group-items";
import { fileURLToPath } from "node:url";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";

import type { DB } from "../src/db.ts";

import { createDb } from "../src/db.ts";
import {
  BASELINE_WORLD,
  type ResearcherKey,
  seed,
  SEED_SAMPLES,
  type SeedWorld,
} from "./seed.ts";

const WORLD_INSTITUTIONS: Record<string, string>[] = [
  {
    "04vfs2w97": "01ahyrz84",
    OTELo: "OMP",
    UMR7358: "UMR5563",
    UMR7359: "UAR831",
    "02rx3b187": "035xkbk20",
    OSUG: "PYTHEAS",
    UMR5275: "UMR7330",
    "014zrew76": "03wkt5x30",
    OSUC: "Ecce Terra",
    UMR7327: "UMR7590",
    "05hnb7x64": "02en5vm52",
  },
  {
    "04vfs2w97": "029nkcm90",
    OTELo: "OBSPM",
    UMR7358: "UMR 8254",
    UMR7359: "UMR 8262",
    "02rx3b187": "05q3vnk25",
    OSUG: "OSU-Externe",
    UMR5275: "FR636",
    "014zrew76": "01a8ajp46",
    OSUC: "OPGC",
    UMR7327: "UMR6524",
    "05hnb7x64": "04yznqr36",
  },
  {
    "04vfs2w97": "004gzqz66",
    OTELo: "IPGP",
    UMR7358: "UMR7154",
    UMR7359: "UAR3454",
    "02rx3b187": "039fj2469",
    OSUG: "OCA",
    UMR5275: "UMR7293",
    "014zrew76": "03x42jk29",
    OSUC: "OSUNA",
    UMR7327: "UAR3281",
    "05hnb7x64": "03gnr7b55",
  },
  {
    "04vfs2w97": "015m7wh34",
    OTELo: "OSERen",
    UMR7358: "UMR6164",
    UMR7359: "UMR6553",
    "02rx3b187": "044jxhp58",
    OSUG: "IUEM",
    UMR5275: "UMR6538",
    "014zrew76": "051escj72",
    OSUC: "OREME",
    UMR7327: "UMR5243",
    "05hnb7x64": "02ryfmr77",
  },
  {
    "04vfs2w97": "03pcc9z86",
    OTELo: "THETA",
    UMR7358: "UMR6213",
    UMR7359: "UMR6249",
    "02rx3b187": "029brtt94",
    OSUG: "OSUL",
    UMR5275: "UAR3721",
    "014zrew76": "05f82e368",
    OSUC: "EFLUVE",
    UMR7327: "UMR7583",
    "05hnb7x64": "05ggc9x40",
  },
  {
    "04vfs2w97": "03xjwb503",
    OTELo: "OSUPS",
    UMR7358: "UMR8148",
    UMR7359: "UMR8617",
    "02rx3b187": "00pg6eq24",
    OSUG: "EOST",
    UMR5275: "UAR830",
    "014zrew76": "00jjx8s55",
    OSUC: "OVSQ",
    UMR7327: "UMR8212",
    "05hnb7x64": "03mkjjy25",
  },
];

export const WORLD_COUNT = WORLD_INSTITUTIONS.length;

export function e2eWorld(index: number): SeedWorld {
  const institutions = WORLD_INSTITUTIONS[index];
  if (!institutions) throw new Error(`no e2e world ${index}`);
  const codeOf = (baseline: string) => {
    const code = institutions[baseline];
    if (!code) throw new Error(`world ${index} maps no code for ${baseline}`);
    return code;
  };
  const optionalCodeOf = (baseline: string | null) =>
    baseline === null ? null : codeOf(baseline);
  const groupIds = new Map(
    BASELINE_WORLD.manualGroups.map(({ id }) => [id, uuidv7()]),
  );
  const groupIdOf = (baseline: string) => {
    const id = groupIds.get(baseline);
    if (!id) throw new Error(`world ${index} has no group ${baseline}`);
    return id;
  };
  const { serviceAccount } = BASELINE_WORLD;
  return {
    researchers: Object.fromEntries(
      Object.entries(BASELINE_WORLD.researchers).map(
        ([key, { orcid: _orcid, ...researcher }]) => [
          key,
          {
            ...researcher,
            id: uuidv7(),
            email: researcher.email.replace("@", `.w${index}@`),
            institutionalOrganization: optionalCodeOf(
              researcher.institutionalOrganization,
            ),
            institutionalOsu: optionalCodeOf(researcher.institutionalOsu),
            institutionalLaboratory: optionalCodeOf(
              researcher.institutionalLaboratory,
            ),
            manualGroups: researcher.manualGroups.map(groupIdOf),
          },
        ],
      ),
    ) as SeedWorld["researchers"],
    manualGroups: BASELINE_WORLD.manualGroups.map(({ id, name }) => ({
      id: groupIdOf(id),
      name: `${name} w${index}`,
    })),
    managedInstitutionalGroups: BASELINE_WORLD.managedInstitutionalGroups.map(
      (group) => ({ ...group, code: codeOf(group.code) }),
    ),
    managedManualGroups: BASELINE_WORLD.managedManualGroups.map((group) => ({
      ...group,
      groupId: groupIdOf(group.groupId),
    })),
    serviceAccount: {
      id: uuidv7(),
      name: `${serviceAccount.name} w${index}`,
      institutional_organization: codeOf(
        serviceAccount.institutional_organization,
      ),
      institutional_osu: codeOf(serviceAccount.institutional_osu),
      institutional_laboratory: codeOf(serviceAccount.institutional_laboratory),
      managedLaboratory: codeOf(serviceAccount.managedLaboratory),
    },
  };
}

async function resetWorld(db: Kysely<DB>, world: SeedWorld): Promise<void> {
  const userIds = db
    .selectFrom("user")
    .select("id")
    .where(
      "email",
      "in",
      Object.values(world.researchers).map(({ email }) => email),
    );
  await db
    .deleteFrom("sample")
    .where(
      "id",
      "in",
      db
        .selectFrom("user_sample")
        .select("sample_id")
        .where("role", "=", "owner")
        .where("user_id", "in", userIds),
    )
    .execute();
  await db
    .deleteFrom("manual_group")
    .where((eb) =>
      eb.or([
        eb(
          "name",
          "in",
          world.manualGroups.map(({ name }) => name),
        ),
        eb(
          "id",
          "in",
          eb
            .selectFrom("manual_group_member")
            .select("group_id")
            .where("user_id", "in", userIds),
        ),
        eb(
          "id",
          "in",
          eb
            .selectFrom("user_managed_manual_group")
            .select("group_id")
            .where("user_id", "in", userIds),
        ),
      ]),
    )
    .execute();
  await db
    .deleteFrom("service_account")
    .where("owner_id", "in", userIds)
    .execute();
}

export async function seedE2eWorld(db: Kysely<DB>, index: number) {
  const world = e2eWorld(index);
  await resetWorld(db, world);
  const samples = await seed(
    db,
    SEED_SAMPLES.map((row) => {
      const id = uuidv7();
      return {
        ...row,
        id,
        ...(row.igsn ? { igsn: generateIgsnSuffix(id) } : {}),
      };
    }),
    world,
  );
  const researchers = Object.entries(world.researchers);
  const users = await db
    .selectFrom("user")
    .select(["id", "email"])
    .where(
      "email",
      "in",
      researchers.map(([, { email }]) => email),
    )
    .execute();
  const idByEmail = new Map(users.map(({ id, email }) => [email, id]));
  return {
    index,
    researchers: Object.fromEntries(
      researchers.map(([key, { email, firstname, name }]) => [
        key,
        {
          id: idByEmail.get(email)!,
          email,
          username: email.split("@")[0]!,
          firstname,
          name,
        },
      ]),
    ) as Record<
      ResearcherKey,
      {
        id: string;
        email: string;
        username: string;
        firstname: string;
        name: string;
      }
    >,
    institutions: Object.fromEntries(
      researchers.flatMap(
        ([
          key,
          {
            institutionalOrganization: organization,
            institutionalOsu: osu,
            institutionalLaboratory: laboratory,
          },
        ]) =>
          organization && osu && laboratory
            ? [
                [
                  key,
                  {
                    organizationCode: organization,
                    organization: organizationLabel(organization),
                    osuCode: osu,
                    osu: osuLabel(osu),
                    laboratoryCode: laboratory,
                    laboratory: laboratoryLabel(laboratory),
                    laboratoryAcronym: laboratoryShortLabel(laboratory),
                    managedLaboratory: MANAGED_LABORATORY_ITEMS.find(
                      ({ value }) => value === laboratory,
                    )!.label,
                  },
                ],
              ]
            : [],
      ),
    ),
    manualGroups: Object.fromEntries(
      world.manualGroups.map((group, i) => [
        BASELINE_WORLD.manualGroups[i]!.name,
        group,
      ]),
    ),
    serviceAccount: {
      id: world.serviceAccount.id,
      name: world.serviceAccount.name,
    },
    samples,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const index = z.coerce
    .number()
    .int()
    .min(0)
    .max(WORLD_COUNT - 1)
    .parse(process.argv[2]);
  const db = createDb();
  const world = await db
    .transaction()
    .execute((trx) => seedE2eWorld(trx, index));
  await db.destroy();
  console.log(JSON.stringify(world));
}
