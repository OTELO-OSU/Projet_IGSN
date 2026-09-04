import type { ServiceAccountBody } from "@projet-igsn/domain/service-account/service-account-validator";
import type { Kysely } from "kysely";

import {
  listServiceAccountsResponseSchema,
  serviceAccountResponseSchema,
} from "@projet-igsn/domain/service-account/service-account-validator";
import { testClient } from "hono/testing";
import { describe, expect, vi } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { requireActiveSession } from "../auth/active-session.ts";
import { pgTest } from "../tests/pg-test.ts";
import { provisionUser } from "../tests/provision-user.ts";

const ORGANIZATION = "04vfs2w97";
const OSU = "OTELo";
const LABORATORY = "UMR7358";
const OTHER_ORGANIZATION = "014zrew76";
const OTHER_OSU = "OSUC";
const OTHER_LABORATORY = "UMR7327";
const GROUP = { id: "01890a5d-ac96-774b-bcce-b302099a9001", name: "OZCAR-RI" };
const UNKNOWN_ID = "01890a5d-ac96-774b-bcce-b302099a9099";

const authHeader = { Authorization: "Bearer moderator" };

type Db = Kysely<DB>;

const accountBody = (
  overrides: Partial<ServiceAccountBody> = {},
): ServiceAccountBody => ({
  name: "GeoPortal harvester",
  institutionalOrganization: ORGANIZATION,
  institutionalOsu: OSU,
  institutionalLaboratory: LABORATORY,
  managedGroups: {
    organizations: [],
    osus: [],
    laboratories: [LABORATORY],
    manualGroupIds: [],
  },
  ...overrides,
});

const asSuperAdmin = async (db: Db) => {
  await provisionUser(db, "moderator", {
    status: "accepted",
    superAdmin: true,
  });
  return testClient(createApp(db).app);
};

type Client = Awaited<ReturnType<typeof asSuperAdmin>>;

const createAccount = (client: Client, json: ServiceAccountBody) =>
  client.admin["service-accounts"].$post({ json }, { headers: authHeader });

const getAccount = (client: Client, id: string) =>
  client.admin["service-accounts"][":id"].$get(
    { param: { id } },
    { headers: authHeader },
  );

const updateAccount = (client: Client, id: string, json: ServiceAccountBody) =>
  client.admin["service-accounts"][":id"].$put(
    { param: { id }, json },
    { headers: authHeader },
  );

const deleteAccount = (client: Client, id: string) =>
  client.admin["service-accounts"][":id"].$delete(
    { param: { id } },
    { headers: authHeader },
  );

const listAccounts = async (client: Client, page: string) => {
  const res = await client.admin["service-accounts"].$get(
    { query: { page, perPage: "10" } },
    { headers: authHeader },
  );
  expect(res.status).toBe(200);
  return listServiceAccountsResponseSchema.parse(await res.json());
};

const createdId = async (client: Client, json: ServiceAccountBody) => {
  const res = await createAccount(client, json);
  expect(res.status).toBe(201);
  return serviceAccountResponseSchema.parse(await res.json()).data.id;
};

describe("admin service account routes", () => {
  pgTest(
    "should read back a created service account whole, managed groups included",
    async ({ db }) => {
      // Arrange
      await db.insertInto("manual_group").values(GROUP).execute();
      const client = await asSuperAdmin(db);
      const body = accountBody({
        managedGroups: {
          organizations: [],
          osus: [OSU],
          laboratories: [LABORATORY],
          manualGroupIds: [GROUP.id],
        },
      });
      // Act
      const id = await createdId(client, body);
      const res = await getAccount(client, id);
      // Assert
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: { id, ...body } });
    },
  );

  pgTest(
    "should list the service accounts ordered by name, paginated with a total",
    async ({ db }) => {
      // Arrange
      const client = await asSuperAdmin(db);
      for (const name of ["Zenith", "Alpha", "Mercure"]) {
        await createdId(client, accountBody({ name }));
      }
      // Act
      const listed = await listAccounts(client, "1");
      const emptyPage = await listAccounts(client, "2");
      // Assert
      expect({
        names: listed.data.map(({ name }) => name),
        meta: listed.meta,
      }).toEqual({
        names: ["Alpha", "Mercure", "Zenith"],
        meta: { total: 3 },
      });
      expect(emptyPage).toEqual({ data: [], meta: { total: 3 } });
    },
  );

  pgTest(
    "should replace the trio and the managed groups on update",
    async ({ db }) => {
      // Arrange
      await db.insertInto("manual_group").values(GROUP).execute();
      const client = await asSuperAdmin(db);
      const id = await createdId(
        client,
        accountBody({
          managedGroups: {
            organizations: [],
            osus: [OSU],
            laboratories: [LABORATORY],
            manualGroupIds: [GROUP.id],
          },
        }),
      );
      const replacement = accountBody({
        name: "GeoPortal reader",
        institutionalOrganization: OTHER_ORGANIZATION,
        institutionalOsu: OTHER_OSU,
        institutionalLaboratory: OTHER_LABORATORY,
        managedGroups: {
          organizations: [OTHER_ORGANIZATION],
          osus: [],
          laboratories: [],
          manualGroupIds: [],
        },
      });
      // Act
      const res = await updateAccount(client, id, replacement);
      // Assert
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: { id, ...replacement } });
    },
  );

  pgTest(
    "should delete a service account and its managed rows",
    async ({ db }) => {
      // Arrange
      await db.insertInto("manual_group").values(GROUP).execute();
      const client = await asSuperAdmin(db);
      const id = await createdId(
        client,
        accountBody({
          managedGroups: {
            organizations: [],
            osus: [],
            laboratories: [LABORATORY],
            manualGroupIds: [GROUP.id],
          },
        }),
      );
      // Act
      const res = await deleteAccount(client, id);
      // Assert
      expect(res.status).toBe(204);
      expect((await getAccount(client, id)).status).toBe(404);
      expect(
        await db
          .selectFrom("service_account_managed_institutional_group")
          .selectAll()
          .execute(),
      ).toEqual([]);
      expect(
        await db
          .selectFrom("service_account_managed_manual_group")
          .selectAll()
          .execute(),
      ).toEqual([]);
    },
  );

  pgTest("should answer 400 to a body without a laboratory", async ({ db }) => {
    // Arrange
    await asSuperAdmin(db);
    const { institutionalLaboratory: _laboratory, ...body } = accountBody();
    // Act
    const res = await createApp(db).app.request("/admin/service-accounts", {
      method: "POST",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    // Assert
    expect(res.status).toBe(400);
  });

  pgTest(
    "should answer 404 to an unknown manual group in the managed groups",
    async ({ db }) => {
      // Arrange
      const client = await asSuperAdmin(db);
      // Act
      const res = await createAccount(
        client,
        accountBody({
          managedGroups: {
            organizations: [],
            osus: [],
            laboratories: [],
            manualGroupIds: [UNKNOWN_ID],
          },
        }),
      );
      // Assert
      expect(res.status).toBe(404);
    },
  );

  pgTest.for(["post", "put"] as const)(
    "should answer 409 to a %s reusing a name in another case",
    async (method, { db }) => {
      // Arrange
      const client = await asSuperAdmin(db);
      await createdId(client, accountBody());
      const other = await createdId(client, accountBody({ name: "Other" }));
      const taken = accountBody({ name: "geoportal HARVESTER" });
      // Act
      const res =
        method === "post"
          ? await createAccount(client, taken)
          : await updateAccount(client, other, taken);
      // Assert
      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({ reason: "name_taken" });
    },
  );

  pgTest.for(["get", "put", "delete"] as const)(
    "should answer 404 to a %s on an unknown service account",
    async (method, { db }) => {
      // Arrange
      const client = await asSuperAdmin(db);
      // Act
      const res =
        method === "get"
          ? await getAccount(client, UNKNOWN_ID)
          : method === "put"
            ? await updateAccount(client, UNKNOWN_ID, accountBody())
            : await deleteAccount(client, UNKNOWN_ID);
      // Assert
      expect(res.status).toBe(404);
    },
  );

  pgTest(
    "should answer 403 to a user who is not super admin",
    async ({ db }) => {
      // Arrange
      await provisionUser(db, "moderator", { status: "accepted" });
      const client = testClient(createApp(db).app);
      // Act
      const res = await client.admin["service-accounts"].$get(
        { query: { page: "1", perPage: "10" } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(403);
    },
  );

  pgTest("should answer 401 to an unauthenticated caller", async ({ db }) => {
    // Act
    const res = await createApp(db).app.request("/admin/service-accounts");
    // Assert
    expect(res.status).toBe(401);
  });

  pgTest.for(["post", "put", "delete"] as const)(
    "should answer 401 to a %s on a revoked session",
    async (method, { db }) => {
      // Arrange
      const client = await asSuperAdmin(db);
      const id = await createdId(client, accountBody());
      vi.mocked(requireActiveSession).mockImplementationOnce(async (c) =>
        c.json({ error: "Unauthorized" }, 401),
      );
      // Act
      const res =
        method === "post"
          ? await createAccount(client, accountBody({ name: "Other" }))
          : method === "put"
            ? await updateAccount(client, id, accountBody())
            : await deleteAccount(client, id);
      // Assert
      expect(res.status).toBe(401);
    },
  );
});
