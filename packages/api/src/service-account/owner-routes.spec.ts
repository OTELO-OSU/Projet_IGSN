import type { ServiceAccountRequest } from "@projet-igsn/domain/service-account/service-account-validator";
import type { UserStatus } from "@projet-igsn/domain/user/model";
import type { Kysely } from "kysely";

import { laboratoryLabel } from "@projet-igsn/domain/institutional-group/label";
import {
  apiKeyResponseSchema,
  myServiceAccountsResponseSchema,
  requestableInstitutionalGroupsResponseSchema,
} from "@projet-igsn/domain/service-account/service-account-validator";
import { NO_MANAGED_GROUPS } from "@projet-igsn/domain/user/managed-groups";
import { testClient } from "hono/testing";
import { describe, expect, vi } from "vitest";

import type { DB } from "../db.ts";
import type { SendMail } from "../mail/send-mail.ts";

import { createApp } from "../app.ts";
import { insertServiceAccount } from "../tests/insert-service-account.ts";
import { insertUser } from "../tests/insert-user.ts";
import { moderateInstitution } from "../tests/moderate-institution.ts";
import { moderateManualGroup } from "../tests/moderate-manual-group.ts";
import { pgTest } from "../tests/pg-test.ts";
import { provisionUser, tokenEmail } from "../tests/provision-user.ts";

type Db = Kysely<DB>;

const ADMIN_URL = "http://localhost:3001/admin/";
const FRONTEND_URL = "http://localhost:3000";
const ORGANIZATION = "04vfs2w97";
const OSU = "OTELo";
const LABORATORY = "UMR7358";
const OUT_OF_REACH_LABORATORY = "UMR7154";
const OSU_LABORATORIES = ["UAR3562", "UMR7358", "UMR7359", "UMR7360"];
const GROUP = {
  id: "01890a5d-ac96-774b-81b9-b302099a9001",
  name: "OZCAR-RI 1b9",
};
const NAME = "GeoPortal harvester";
const REASON = "To harvest our OZCAR samples nightly";
const CREATE_LINK = `${ADMIN_URL}service-accounts/create?request=`;
const SAMPLE_OWNER = {
  id: "01890a5d-ac96-774b-81b9-b302099a9002",
  email: "marie.curie-1b9@univ-lorraine.fr",
  name: "Curie",
  firstname: "Marie",
  orcid: null,
};

const authHeader = { Authorization: "Bearer test-token" };

const requestBody = (
  overrides: Partial<ServiceAccountRequest> = {},
): ServiceAccountRequest => ({
  name: NAME,
  sampleOwnerId: SAMPLE_OWNER.id,
  managedGroups: { ...NO_MANAGED_GROUPS, manualGroupIds: [GROUP.id] },
  reason: REASON,
  ...overrides,
});

const insertRequester = (db: Db, status: UserStatus = "accepted") =>
  insertUser(db, tokenEmail("test-token"), {
    status,
    institutionalOrganization: ORGANIZATION,
    institutionalOsu: OSU,
    institutionalLaboratory: LABORATORY,
  });

const insertSampleOwner = (
  db: Db,
  {
    laboratory = LABORATORY,
    status = "accepted",
  }: { laboratory?: string; status?: UserStatus } = {},
) =>
  insertUser(db, SAMPLE_OWNER.email, {
    id: SAMPLE_OWNER.id,
    name: SAMPLE_OWNER.name,
    firstname: SAMPLE_OWNER.firstname,
    status,
    institutionalOrganization: ORGANIZATION,
    institutionalLaboratory: laboratory,
  });

const insertOsuManager = async (db: Db) => {
  const requester = await insertRequester(db);
  await moderateInstitution(db, requester.id, { kind: "osu", code: OSU });
  return requester;
};

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

const listRequestable = (client: Client) =>
  client.admin.currentUser["service-accounts"]["requestable-groups"].$get(
    undefined,
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

const listServiceSamples = (
  app: ReturnType<typeof arrangeApp>["app"],
  key: string,
) =>
  app.request("/service/samples", {
    headers: { Authorization: `Bearer ${key}` },
  });

describe("service account owner routes", () => {
  pgTest(
    "should mail every super admin the requester and their laboratory, the service name, the reason, the samples owner and a create link prefilled with the reason-free request",
    async ({ db }) => {
      // Arrange
      await db.insertInto("manual_group").values(GROUP).execute();
      await insertUser(db, "root-1b9@univ-lorraine.fr", { superAdmin: true });
      await insertUser(db, "boss-1b9@univ-lorraine.fr", { superAdmin: true });
      const requester = await insertOsuManager(db);
      await moderateManualGroup(db, requester.id, [GROUP.id]);
      await insertSampleOwner(db);
      const { sendMail, client } = arrangeApp(db);
      const managedGroups = {
        ...NO_MANAGED_GROUPS,
        laboratories: [LABORATORY, "UMR7359"],
        manualGroupIds: [GROUP.id],
      };
      // Act
      const res = await askForAccount(client, requestBody({ managedGroups }));
      // Assert
      expect(res.status).toBe(204);
      await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(1));
      const sent = sendMail.mock.lastCall![0];
      expect({ to: sent.to, audience: sent.audience }).toEqual({
        to: ["boss-1b9@univ-lorraine.fr", "root-1b9@univ-lorraine.fr"],
        audience: "admin",
      });
      expect(sent.text).toContain("Test User");
      expect(sent.text).toContain(laboratoryLabel(LABORATORY));
      expect(sent.text).toContain("Samples owner: Marie Curie");
      expect(sent.text).toContain(NAME);
      expect(sent.text).toContain(REASON);
      expect(sent.text).toContain(CREATE_LINK);
      const link = sent.text
        .split(/\s+/)
        .find((word) => word.startsWith(CREATE_LINK))!;
      expect(JSON.parse(new URL(link).searchParams.get("request")!)).toEqual({
        name: NAME,
        managedGroups,
        sampleOwner: SAMPLE_OWNER,
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
      rule: "a blank reason",
      json: requestBody({ reason: "   " }),
      status: 400,
    },
    {
      rule: "a manual group the requester neither belongs to nor manages",
      json: requestBody(),
      status: 422,
    },
    {
      rule: "a laboratory the requester neither belongs to nor reaches",
      json: requestBody({
        managedGroups: { ...NO_MANAGED_GROUPS, laboratories: ["UMR7154"] },
      }),
      status: 422,
    },
    {
      rule: "the requester's own organisme, which they do not manage",
      json: requestBody({
        managedGroups: { ...NO_MANAGED_GROUPS, organizations: [ORGANIZATION] },
      }),
      status: 422,
    },
  ])("should answer $status to $rule", async ({ json, status }, { db }) => {
    // Arrange
    await db.insertInto("manual_group").values(GROUP).execute();
    await insertOsuManager(db);
    await insertSampleOwner(db);
    const { sendMail, client } = arrangeApp(db);
    // Act
    const res = await askForAccount(client, json);
    // Assert
    expect(res.status).toBe(status);
    expect(sendMail).not.toHaveBeenCalled();
  });

  pgTest.for([
    {
      rule: "outside every group the requester manages",
      sampleOwner: { laboratory: OUT_OF_REACH_LABORATORY },
    },
    {
      rule: "not accepted",
      sampleOwner: { status: "pending" as const },
    },
  ])(
    "should answer 422 to a samples owner $rule",
    async ({ sampleOwner }, { db }) => {
      // Arrange
      await insertOsuManager(db);
      await insertSampleOwner(db, sampleOwner);
      const { sendMail, client } = arrangeApp(db);
      // Act
      const res = await askForAccount(
        client,
        requestBody({ managedGroups: NO_MANAGED_GROUPS }),
      );
      // Assert
      expect({ status: res.status, body: await res.json() }).toEqual({
        status: 422,
        body: { error: "Samples owner out of reach" },
      });
      expect(sendMail).not.toHaveBeenCalled();
    },
  );

  pgTest(
    "should let a super admin name any accepted samples owner",
    async ({ db }) => {
      // Arrange
      await provisionUser(db, "test-token", { superAdmin: true });
      await insertSampleOwner(db, { laboratory: OUT_OF_REACH_LABORATORY });
      const { client } = arrangeApp(db);
      // Act
      const res = await askForAccount(
        client,
        requestBody({ managedGroups: NO_MANAGED_GROUPS }),
      );
      // Assert
      expect(res.status).toBe(204);
    },
  );

  pgTest.for([
    {
      route: "POST /requests",
      call: (client: Client) => askForAccount(client, requestBody()),
    },
    { route: "GET /requestable-groups", call: listRequestable },
  ])(
    "should answer 403 to $route from an accepted user who manages no group",
    async ({ call }, { db }) => {
      // Arrange
      await db.insertInto("manual_group").values(GROUP).execute();
      await insertRequester(db);
      await insertSampleOwner(db);
      const { sendMail, client } = arrangeApp(db);
      // Act
      const res = await call(client);
      // Assert
      expect(res.status).toBe(403);
      expect(sendMail).not.toHaveBeenCalled();
    },
  );

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
    "should list the requester's own laboratory and every group their managed OSU reaches",
    async ({ db }) => {
      // Arrange
      await insertOsuManager(db);
      const { client } = arrangeApp(db);
      // Act
      const res = await listRequestable(client);
      // Assert
      expect(
        requestableInstitutionalGroupsResponseSchema.parse(await res.json()),
      ).toEqual({
        data: {
          organizations: [],
          osus: [OSU],
          laboratories: OSU_LABORATORIES,
        },
      });
    },
  );

  pgTest(
    "should list only the caller's service accounts, flagged with whether they hold a key",
    async ({ db }) => {
      // Arrange
      const owner = await insertRequester(db);
      const other = await insertUser(db, "other-1b9@univ-lorraine.fr");
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
      expect((await listServiceSamples(app, firstKey)).status).toBe(403);
      expect((await listServiceSamples(app, secondKey)).status).toBe(200);
    },
  );

  pgTest(
    "should answer 404 when generating a key for a service account owned by someone else",
    async ({ db }) => {
      // Arrange
      await insertRequester(db);
      const other = await insertUser(db, "other-1b9@univ-lorraine.fr");
      const account = await insertServiceAccount(db, "Theirs", other.id);
      const { client } = arrangeApp(db);
      // Act
      const res = await generateKey(client, account.id);
      // Assert
      expect(res.status).toBe(404);
    },
  );
});
