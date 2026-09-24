import type { Kysely } from "kysely";

import { optionalInstitutionalGroupIssues } from "@projet-igsn/domain/institutional-group/institutional-groups-validator";
import { managedLaboratoryCodes } from "@projet-igsn/domain/user/managed-laboratory-codes";
import { describe, expect, it } from "vitest";

import type { DB } from "../src/db.ts";

import { pgTest } from "../src/tests/pg-test.ts";
import { e2eWorld, seedE2eWorld, WORLD_COUNT } from "./seed-e2e-world.ts";
import {
  BASELINE_WORLD,
  insertSamples,
  seed,
  SEED_SAMPLES,
  type SeedWorld,
} from "./seed.ts";

const WORLD_INDEXES = Array.from({ length: WORLD_COUNT }, (_, index) => index);

const TABLES: (keyof DB)[] = [
  "user",
  "sample",
  "location",
  "user_sample",
  "sample_manual_group",
  "manual_group",
  "manual_group_member",
  "user_managed_institutional_group",
  "user_managed_manual_group",
  "service_account",
  "service_account_managed_institutional_group",
  "service_account_managed_manual_group",
];

async function dump(db: Kysely<DB>) {
  return Object.fromEntries(
    await Promise.all(
      TABLES.map(async (table) => [
        table,
        (await db.selectFrom(table).selectAll().execute()).map((row) =>
          JSON.stringify(row),
        ),
      ]),
    ),
  ) as Record<keyof DB, string[]>;
}

function codesOf(world: SeedWorld): string[] {
  return [
    ...Object.values(world.researchers).flatMap((researcher) => [
      researcher.institutionalOrganization,
      researcher.institutionalOsu,
      researcher.institutionalLaboratory,
    ]),
    ...world.managedInstitutionalGroups.map(({ code }) => code),
  ].filter((code): code is string => code !== null);
}

function laboratoriesOf(world: SeedWorld): string[] {
  return Object.values(world.researchers).flatMap(
    ({ institutionalLaboratory }) =>
      institutionalLaboratory === null ? [] : [institutionalLaboratory],
  );
}

function reachOf(world: SeedWorld): string[] {
  const managed = (kind: string) =>
    world.managedInstitutionalGroups
      .filter((group) => group.kind === kind)
      .map(({ code }) => code);
  return [
    ...managedLaboratoryCodes({
      organizations: managed("organization"),
      osus: managed("osu"),
      laboratories: managed("laboratory"),
      manualGroupIds: [],
    }),
    world.serviceAccount.managedLaboratory,
  ];
}

describe("e2eWorld", () => {
  it.each(WORLD_INDEXES)(
    "should give world %i institution trios the catalog accepts",
    (index) => {
      const world = e2eWorld(index);
      const { institutional_organization, institutional_osu } =
        world.serviceAccount;
      expect(
        [
          ...Object.values(world.researchers),
          {
            institutionalOrganization: institutional_organization,
            institutionalOsu: institutional_osu,
            institutionalLaboratory:
              world.serviceAccount.institutional_laboratory,
          },
        ].flatMap(optionalInstitutionalGroupIssues),
      ).toEqual([]);
    },
  );

  it("should keep every world's codes and manager reach off every other world's, baseline included", () => {
    const worlds = [BASELINE_WORLD, ...WORLD_INDEXES.map(e2eWorld)];
    const overlaps = worlds.flatMap((world, i) =>
      worlds.flatMap((other, j) =>
        i === j
          ? []
          : [
              ...codesOf(world).filter((code) => codesOf(other).includes(code)),
              ...reachOf(world).filter((code) =>
                laboratoriesOf(other).includes(code),
              ),
            ].map((code) => `${i}/${j}: ${code}`),
      ),
    );
    expect(overlaps).toEqual([]);
  });
});

describe("seedE2eWorld", () => {
  pgTest(
    "should seed worlds 0 and 1 as disjoint copies of the baseline",
    async ({ db }) => {
      const first = await seedE2eWorld(db, 0);
      const second = await seedE2eWorld(db, 1);

      expect(first).toMatchObject({
        index: 0,
        researchers: {
          marie: {
            email: "marie.dupont.w0@univ-lorraine.fr",
            username: "marie.dupont.w0",
            firstname: "Marie",
            name: "Dupont",
          },
        },
        manualGroups: { "ANR CritMet": { name: "ANR CritMet w0" } },
        serviceAccount: { name: "GeoPortal harvester w0" },
      });
      expect(first.samples.map(({ name }) => name)).toEqual(
        SEED_SAMPLES.map(({ name }) => name),
      );
      const identities = (world: typeof first) => [
        ...Object.values(world.researchers).flatMap(({ id, email }) => [
          id,
          email,
        ]),
        ...Object.values(world.manualGroups).flatMap(({ id, name }) => [
          id,
          name,
        ]),
        world.serviceAccount.id,
        ...world.samples.flatMap(({ id, igsn }) => [id, igsn ?? id]),
        ...Object.values(world.institutions).flatMap(
          ({ organizationCode, osuCode, laboratoryCode }) => [
            organizationCode,
            osuCode,
            laboratoryCode,
          ],
        ),
      ];
      expect(
        identities(first).filter((value) => identities(second).includes(value)),
      ).toEqual([]);
    },
    30_000,
  );

  pgTest(
    "should reseed world 0 alone, dropping what its users created since",
    async ({ db }) => {
      await seed(db, SEED_SAMPLES);
      const seeded = await seedE2eWorld(db, 0);
      await seedE2eWorld(db, 1);
      const before = await dump(db);
      const { marie, pierre, jean, theo } = seeded.researchers;
      const groupId = "01980e2d-6f9b-7000-9000-0000000000ff";
      await db
        .insertInto("manual_group")
        .values({ id: groupId, name: "Created by a test" })
        .execute();
      await db
        .insertInto("user_managed_manual_group")
        .values({ user_id: pierre.id, group_id: groupId })
        .execute();
      await db
        .insertInto("user_managed_institutional_group")
        .values({ user_id: jean.id, kind: "laboratory", code: "UMR7358" })
        .execute();
      await db
        .updateTable("user")
        .set({ status: "accepted" })
        .where("id", "=", theo.id)
        .execute();
      await insertSamples(db, [
        {
          id: "01980e2d-6f9b-7000-8000-0000000000ff",
          name: "Created by a test",
          nature: "hand_sample",
          owner: {
            id: marie.id,
            institutionalOrganization: null,
            institutionalOsu: null,
            institutionalLaboratory: null,
            manualGroups: [],
          },
        },
      ]);

      const reseeded = await seedE2eWorld(db, 0);
      const after = await dump(db);

      expect(reseeded.researchers).toEqual(seeded.researchers);
      const replaced = [
        ...Object.values(seeded.manualGroups).map(({ id }) => id),
        seeded.serviceAccount.id,
        ...seeded.samples.map(({ id }) => id),
      ];
      for (const table of TABLES) {
        expect(after[table], table).toHaveLength(before[table].length);
        expect(after[table], table).toEqual(
          expect.arrayContaining(
            before[table].filter(
              (row) => !replaced.some((id) => row.includes(id)),
            ),
          ),
        );
      }
    },
    30_000,
  );
});
