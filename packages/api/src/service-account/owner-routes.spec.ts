import type { ServiceAccountRequest } from "@projet-igsn/domain/service-account/service-account-validator";
import type { UserStatus } from "@projet-igsn/domain/user/model";
import type { Kysely } from "kysely";

import {
  apiKeyResponseSchema,
  myServiceAccountsResponseSchema,
} from "@projet-igsn/domain/service-account/service-account-validator";
import { NO_MANAGED_GROUPS } from "@projet-igsn/domain/user/managed-groups";
import { testClient } from "hono/testing";
import { describe, expect, vi } from "vitest";

import type { DB } from "../db.ts";
import type { SendMail } from "../mail/send-mail.ts";

import { createApp } from "../app.ts";
import { insertServiceAccount } from "../tests/insert-service-account.ts";
import { insertUser } from "../tests/insert-user.ts";
import { moderateManualGroup } from "../tests/moderate-manual-group.ts";
import { pgTest } from "../tests/pg-test.ts";
import { tokenEmail } from "../tests/provision-user.ts";

type Db = Kysely<DB>;

const ADMIN_URL = "http://localhost:3001/admin/";
const FRONTEND_URL = "http://localhost:3000";
const ORGANIZATION = "04vfs2w97";
const OSU = "OTELo";
const LABORATORY = "UMR7358";
const GROUP = { id: "01890a5d-ac96-774b-bcce-b302099a9001", name: "OZCAR-RI" };
const NAME = "GeoPortal harvester";
const CREATE_LINK = `${ADMIN_URL}service-accounts/create?request=`;

const authHeader = { Authorization: "Bearer test-token" };

const requestBody = (
  overrides: Partial<ServiceAccountRequest> = {},
): ServiceAccountRequest => ({
  name: NAME,
  managedGroups: { ...NO_MANAGED_GROUPS, manualGroupIds: [GROUP.id] },
  ...overrides,
});

const insertRequester = (db: Db, status: UserStatus = "accepted") =>
  insertUser(db, tokenEmail("test-token"), {
    status,
    institutionalOrganization: ORGANIZATION,
    institutionalOsu: OSU,
    institutionalLaboratory: LABORATORY,
  });

function arrangeApp(db: Db) {
  const sendMail = vi.fn<SendMail>().mockResolvedValue(undefined);
  const { app } = createApp(db, {
    mail: { sendMail, adminUrl: ADMIN_URL, frontendUrl: FRONTEND_URL },
  });
  return { app, sendMail, client: testClient(app) };
}

type Client = ReturnType<typeof arrangeApp>["client"];

const askForAccount = (client: Client, json: ServiceAccountRequest) =>
  client.admin.currentUser["service-accounts"].requests.$post(
    { json },
    { headers: authHeader },
  );

const listMine = (client: Client) =>
  client.admin.currentUser["service-accounts"].$get(undefined, {
    headers: authHeader,
  });

const generateKey = (client: Client, id: string) =>
  client.admin.currentUser["service-accounts"][":id"]["api-key"].$post(
    { param: { id } },
    { headers: authHeader },
  );

const ping = (app: ReturnType<typeof arrangeApp>["app"], key: string) =>
  app.request("/service/ping", {
    headers: { Authorization: `Bearer ${key}` },
  });

describe("service account owner routes", () => {
  pgTest(
    "should mail every super admin the requester, the service name and a create link prefilled with the request",
    async ({ db }) => {
      // Arrange
      await db.insertInto("manual_group").values(GROUP).execute();
      await insertUser(db, "root@univ-lorraine.fr", { superAdmin: true });
      await insertUser(db, "boss@univ-lorraine.fr", { superAdmin: true });
      const requester = await insertRequester(db);
      await moderateManualGroup(db, requester.id, [GROUP.id]);
      const { sendMail, client } = arrangeApp(db);
      // Act
      const res = await askForAccount(client, requestBody());
      // Assert
      expect(res.status).toBe(204);
      await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(1));
      const sent = sendMail.mock.lastCall![0];
      expect({ to: sent.to, audience: sent.audience }).toEqual({
        to: ["boss@univ-lorraine.fr", "root@univ-lorraine.fr"],
        audience: "admin",
      });
      expect(sent.text).toContain("Test User");
      expect(sent.text).toContain(NAME);
      expect(sent.text).toContain(CREATE_LINK);
      const link = sent.text
        .split(/\s+/)
        .find((word) => word.startsWith(CREATE_LINK))!;
      expect(JSON.parse(new URL(link).searchParams.get("request")!)).toEqual({
        name: NAME,
        institutionalOrganization: ORGANIZATION,
        institutionalOsu: OSU,
        institutionalLaboratory: LABORATORY,
        managedGroups: { ...NO_MANAGED_GROUPS, manualGroupIds: [GROUP.id] },
        owner: {
          id: requester.id,
          email: tokenEmail("test-token"),
          name: "User",
          firstname: "Test",
          orcid: null,
        },
      });
    },
  );

  pgTest.for([
    {
      rule: "a blank service name",
      json: requestBody({ name: "   " }),
      status: 400,
    },
    {
      rule: "a manual group the requester neither belongs to nor manages",
      json: requestBody(),
      status: 422,
    },
  ])("should answer $status to $rule", async ({ json, status }, { db }) => {
    // Arrange
    await db.insertInto("manual_group").values(GROUP).execute();
    await insertRequester(db);
    const { sendMail, client } = arrangeApp(db);
    // Act
    const res = await askForAccount(client, json);
    // Assert
    expect(res.status).toBe(status);
    expect(sendMail).not.toHaveBeenCalled();
  });

  pgTest(
    "should answer 403 to a requester whose account is not accepted",
    async ({ db }) => {
      // Arrange
      await insertRequester(db, "pending");
      const { sendMail, client } = arrangeApp(db);
      // Act
      const res = await askForAccount(client, requestBody());
      // Assert
      expect(res.status).toBe(403);
      expect(sendMail).not.toHaveBeenCalled();
    },
  );

  pgTest(
    "should answer 401 to an unauthenticated requester",
    async ({ db }) => {
      // Arrange
      const { app } = arrangeApp(db);
      // Act
      const res = await app.request(
        "/admin/currentUser/service-accounts/requests",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(requestBody()),
        },
      );
      // Assert
      expect(res.status).toBe(401);
    },
  );

  pgTest(
    "should list only the caller's service accounts, flagged with whether they hold a key",
    async ({ db }) => {
      // Arrange
      const owner = await insertRequester(db);
      const other = await insertUser(db, "other@univ-lorraine.fr");
      const mine = await insertServiceAccount(db, "Mine", owner.id);
      await insertServiceAccount(db, "Theirs", other.id);
      const { client } = arrangeApp(db);
      // Act
      const before = await listMine(client);
      await generateKey(client, mine.id);
      const after = await listMine(client);
      // Assert
      expect(
        myServiceAccountsResponseSchema.parse(await before.json()),
      ).toEqual({
        data: [{ id: mine.id, name: "Mine", hasApiKey: false }],
      });
      expect(myServiceAccountsResponseSchema.parse(await after.json())).toEqual(
        {
          data: [{ id: mine.id, name: "Mine", hasApiKey: true }],
        },
      );
    },
  );

  pgTest(
    "should answer the owner a new api key that replaces the previous one",
    async ({ db }) => {
      // Arrange
      const owner = await insertRequester(db);
      const account = await insertServiceAccount(db, "Mine", owner.id);
      const { app, client } = arrangeApp(db);
      // Act
      const first = await generateKey(client, account.id);
      const second = await generateKey(client, account.id);
      // Assert
      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      const firstKey = apiKeyResponseSchema.parse(await first.json()).apiKey;
      const secondKey = apiKeyResponseSchema.parse(await second.json()).apiKey;
      expect(firstKey).not.toBe(secondKey);
      expect((await ping(app, firstKey)).status).toBe(403);
      expect((await ping(app, secondKey)).status).toBe(200);
    },
  );

  pgTest(
    "should answer 404 when generating a key for a service account owned by someone else",
    async ({ db }) => {
      // Arrange
      await insertRequester(db);
      const other = await insertUser(db, "other@univ-lorraine.fr");
      const account = await insertServiceAccount(db, "Theirs", other.id);
      const { client } = arrangeApp(db);
      // Act
      const res = await generateKey(client, account.id);
      // Assert
      expect(res.status).toBe(404);
    },
  );
});
