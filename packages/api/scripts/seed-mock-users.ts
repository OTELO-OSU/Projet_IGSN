import type { Kysely } from "kysely";

import { laboratoryIdOf } from "@projet-igsn/domain/institutional-group/laboratory-id-of";

import type { DB } from "../src/db.ts";
import type { ResearcherKey } from "./seed-mock-researchers.ts";

import {
  institutionIdOf,
  storedInstitutions,
} from "../src/institutional-group/stored-institution.ts";
import {
  MOCK_RESEARCHERS,
  researcherKeySchema,
} from "./seed-mock-researchers.ts";

const MOCK_MANUAL_GROUPS = [
  { id: "01980e2d-6f9b-7000-9000-000000000001", name: "ANR CritMet" },
  { id: "01980e2d-6f9b-7000-9000-000000000002", name: "ProfilLoire 2024" },
  { id: "01980e2d-6f9b-7000-9000-000000000003", name: "OZCAR-RI" },
  { id: "01980e2d-6f9b-7000-9000-000000000004", name: "ERC DeepTime" },
  { id: "01980e2d-6f9b-7000-9000-000000000005", name: "ChronoAlpes" },
  { id: "01980e2d-6f9b-7000-9000-000000000006", name: "MISTRALS PaleoMex" },
  { id: "01980e2d-6f9b-7000-9000-000000000007", name: "TelluS SYSTER 2025" },
  { id: "01980e2d-6f9b-7000-9000-000000000008", name: "GeoRift" },
  { id: "01980e2d-6f9b-7000-9000-000000000009", name: "CarbOcean" },
  { id: "01980e2d-6f9b-7000-9000-00000000000a", name: "Thesis Girard 2023" },
];

async function seedManagedGroups(
  db: Kysely<DB>,
  ownerIds: Record<ResearcherKey, string>,
): Promise<void> {
  await db.deleteFrom("user_managed_institutional_group").execute();
  await db.deleteFrom("user_managed_manual_group").execute();
  await db
    .insertInto("user_managed_institutional_group")
    .values(
      [
        { user_id: ownerIds.marie, kind: "osu" as const, code: "OTELo" },
        {
          user_id: ownerIds.sophie,
          kind: "organization" as const,
          code: "04vfs2w97",
        },
        {
          user_id: ownerIds.sophie,
          kind: "laboratory" as const,
          code: "UMR7327",
        },
        { user_id: ownerIds.camille, kind: "osu" as const, code: "OSUC" },
      ].map((grant) => ({
        ...grant,
        code: institutionIdOf(grant.kind, grant.code),
      })),
    )
    .onConflict((oc) => oc.doNothing())
    .execute();
  await db
    .insertInto("user_managed_manual_group")
    .values([
      ...MOCK_MANUAL_GROUPS.slice(0, 2).map(({ id }) => ({
        user_id: ownerIds.pierre,
        group_id: id,
      })),
      ...MOCK_MANUAL_GROUPS.filter(({ name }) =>
        ["OZCAR-RI", "GeoRift"].includes(name),
      ).map(({ id }) => ({ user_id: ownerIds.marie, group_id: id })),
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();
}

const MOCK_SERVICE_ACCOUNT = {
  id: "01980e2d-6f9b-7000-a000-000000000001",
  name: "GeoPortal harvester",
};

async function seedServiceAccounts(
  db: Kysely<DB>,
  ownerIds: Record<ResearcherKey, string>,
): Promise<void> {
  await db
    .insertInto("service_account")
    .values({
      ...MOCK_SERVICE_ACCOUNT,
      owner_id: ownerIds.jean,
      sample_owner_id: ownerIds.jean,
    })
    .onConflict((oc) => oc.column("id").doNothing())
    .execute();
  await db
    .insertInto("service_account_managed_institutional_group")
    .values({
      service_account_id: MOCK_SERVICE_ACCOUNT.id,
      kind: "laboratory",
      code: laboratoryIdOf("UMR7358"),
    })
    .onConflict((oc) => oc.doNothing())
    .execute();
  await db
    .insertInto("service_account_managed_manual_group")
    .values({
      service_account_id: MOCK_SERVICE_ACCOUNT.id,
      group_id: MOCK_MANUAL_GROUPS[0]!.id,
    })
    .onConflict((oc) => oc.doNothing())
    .execute();
}

async function seedManualGroups(
  db: Kysely<DB>,
  ownerIds: Record<ResearcherKey, string>,
): Promise<void> {
  await db
    .insertInto("manual_group")
    .values(MOCK_MANUAL_GROUPS)
    .onConflict((oc) => oc.doNothing())
    .execute();
  await db
    .insertInto("manual_group_member")
    .values(
      researcherKeySchema.options.flatMap((researcher) =>
        MOCK_RESEARCHERS[researcher].manualGroups.map((group_id) => ({
          group_id,
          user_id: ownerIds[researcher],
        })),
      ),
    )
    .onConflict((oc) => oc.doNothing())
    .execute();
}

export async function seedMockUsers(
  db: Kysely<DB>,
): Promise<Record<ResearcherKey, string>> {
  const ownerIds = await seedOwners(db);
  await seedManualGroups(db, ownerIds);
  await seedManagedGroups(db, ownerIds);
  await seedServiceAccounts(db, ownerIds);
  return ownerIds;
}

async function seedOwners(
  db: Kysely<DB>,
): Promise<Record<ResearcherKey, string>> {
  const owners = Object.values(MOCK_RESEARCHERS);
  await db
    .insertInto("user")
    .values(
      owners.map(
        ({
          superAdmin,
          institutionalOrganization,
          institutionalOsu,
          institutionalLaboratory,
          manualGroups: _manualGroups,
          hasAcceptedCharter = true,
          ...owner
        }) => {
          const stored = storedInstitutions({
            institutionalOsu,
            institutionalLaboratory,
          });
          return {
            ...owner,
            super_admin: superAdmin,
            charter_accepted_at: hasAcceptedCharter ? new Date() : null,
            institutional_organization: institutionalOrganization,
            institutional_osu: stored.institutionalOsu,
            institutional_laboratory: stored.institutionalLaboratory,
          };
        },
      ),
    )
    .onConflict((oc) =>
      oc.column("email").doUpdateSet((eb) => ({
        status: eb.ref("excluded.status"),
        super_admin: eb.ref("excluded.super_admin"),
        institutional_organization: eb.ref(
          "excluded.institutional_organization",
        ),
        institutional_osu: eb.ref("excluded.institutional_osu"),
        institutional_laboratory: eb.ref("excluded.institutional_laboratory"),
        charter_accepted_at: eb.ref("excluded.charter_accepted_at"),
      })),
    )
    .execute();
  const rows = await db
    .selectFrom("user")
    .select(["id", "email"])
    .where(
      "email",
      "in",
      owners.map((owner) => owner.email),
    )
    .execute();
  const idByEmail = new Map(rows.map((row) => [row.email, row.id]));
  return Object.fromEntries(
    researcherKeySchema.options.map((key) => {
      const id = idByEmail.get(MOCK_RESEARCHERS[key].email);
      if (!id) throw new Error(`owner ${key} missing after upsert`);
      return [key, id];
    }),
  ) as Record<ResearcherKey, string>;
}
