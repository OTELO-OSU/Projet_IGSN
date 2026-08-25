import type { Sample } from "@projet-igsn/domain/sample/sample";
import type { ContactSampleOwnerBody } from "@projet-igsn/domain/sample/sample-validator";
import type { Kysely } from "kysely";

import { generateIgsnSuffix } from "@projet-igsn/domain/igsn/generate-igsn-suffix";
import { testClient } from "hono/testing";
import { describe, expect, vi } from "vitest";

import type { DB } from "../db.ts";
import type { SendMail } from "../mail/send-mail.ts";

import { createApp } from "../app.ts";
import { insertUser } from "../tests/insert-user.ts";
import { moderateInstitution } from "../tests/moderate-institution.ts";
import { moderateManualGroup } from "../tests/moderate-manual-group.ts";
import { pgTest } from "../tests/pg-test.ts";
import { insertSampleOwner } from "../user-sample/insert-sample-owner.ts";
import { insertSample } from "./service/insert-sample.ts";
import { publishSample } from "./service/publish-sample.ts";

type Db = Kysely<DB>;

const ADMIN_URL = "http://localhost:3001";
const FRONTEND_URL = "http://localhost:3000";

const GROUP = {
  id: "01890a5d-ac96-774b-bcce-b302099a9001",
  name: "Massif Central 2026",
};

const INSTITUTION = {
  institutionalOrganization: "04vfs2w97",
  institutionalOsu: null,
  institutionalLaboratory: "UMR7358",
};

const NO_INSTITUTION = {
  institutionalOrganization: null,
  institutionalOsu: null,
  institutionalLaboratory: null,
};

const draft = {
  name: "Basalte du Massif Central",
  nature: "thin_section" as const,
  type: null,
  collectionMethod: null,
};

const visitor = {
  name: "Curieux",
  firstname: "Camille",
  email: "camille.curieux@example.org",
  message: "Where was this sample collected?",
};

function arrangeApp(db: Db) {
  const sendMail = vi.fn<SendMail>().mockResolvedValue(undefined);
  const { app } = createApp(db, {
    mail: { sendMail, adminUrl: ADMIN_URL, frontendUrl: FRONTEND_URL },
  });
  const contact = (igsn: string, body: ContactSampleOwnerBody = visitor) =>
    testClient(app).samples[":igsn"].contact.$post({
      param: { igsn },
      json: body,
    });
  return { sendMail, contact };
}

async function publish(
  db: Db,
  options: {
    manualGroupIds?: string[];
    institution?: typeof INSTITUTION;
  } = {},
): Promise<Sample> {
  const created = await insertSample(
    db,
    { ...draft, manualGroupIds: options.manualGroupIds },
    options.institution ?? NO_INSTITUTION,
  );
  const published = await publishSample(db, created.id);
  return published!;
}

const insertGroup = (db: Db) =>
  db.insertInto("manual_group").values(GROUP).execute();

const joinGroup = (db: Db, userId: string) =>
  db
    .insertInto("manual_group_member")
    .values({ group_id: GROUP.id, user_id: userId })
    .execute();

async function arrangeGroupOwner(db: Db) {
  await insertGroup(db);
  const sample = await publish(db, { manualGroupIds: [GROUP.id] });
  const owner = await insertUser(db, "owner@univ-lorraine.fr");
  await insertSampleOwner(db, sample.id, owner.id);
  await joinGroup(db, owner.id);
  return { sample, email: "owner@univ-lorraine.fr" };
}

async function arrangeInstitutionalOwner(db: Db) {
  const sample = await publish(db, { institution: INSTITUTION });
  const owner = await insertUser(db, "owner@univ-lorraine.fr", {
    institutionalLaboratory: INSTITUTION.institutionalLaboratory,
  });
  await insertSampleOwner(db, sample.id, owner.id);
  return { sample, email: "owner@univ-lorraine.fr" };
}

describe("POST /samples/:igsn/contact", () => {
  pgTest.for([
    ["a member of one of its manual groups", arrangeGroupOwner],
    ["part of its institutional laboratory", arrangeInstitutionalOwner],
  ] as const)(
    "should mail the owner still %s, answering the visitor",
    async ([, arrange], { db }) => {
      // Arrange
      const { sendMail, contact } = arrangeApp(db);
      const { sample, email } = await arrange(db);
      // Act
      const res = await contact(sample.igsn!);
      // Assert
      expect(res.status).toBe(204);
      expect(sendMail).toHaveBeenCalledTimes(1);
      const sent = sendMail.mock.lastCall![0];
      expect(sent.to).toEqual([email]);
      expect(sent.replyTo).toBe(visitor.email);
      expect(sent.subject).toContain(draft.name);
      expect(sent.text).toContain(visitor.message);
      expect(sent.text).toContain(`${FRONTEND_URL}/samples/${sample.igsn}`);
    },
  );

  pgTest(
    "should mail every accepted manager of its manual groups when the owner left them",
    async ({ db }) => {
      // Arrange
      const { sendMail, contact } = arrangeApp(db);
      await insertGroup(db);
      const sample = await publish(db, { manualGroupIds: [GROUP.id] });
      const owner = await insertUser(db, "owner@univ-lorraine.fr");
      await insertSampleOwner(db, sample.id, owner.id);
      const manager = await insertUser(db, "manager@univ-lorraine.fr");
      const second = await insertUser(db, "second@univ-lorraine.fr");
      const pending = await insertUser(db, "pending@univ-lorraine.fr", {
        status: "pending",
      });
      await moderateManualGroup(db, manager.id, [GROUP.id]);
      await moderateManualGroup(db, second.id, [GROUP.id]);
      await moderateManualGroup(db, pending.id, [GROUP.id]);
      // Act
      const res = await contact(sample.igsn!);
      // Assert
      expect(res.status).toBe(204);
      expect(sendMail.mock.lastCall![0].to).toEqual([
        "manager@univ-lorraine.fr",
        "second@univ-lorraine.fr",
      ]);
    },
  );

  pgTest(
    "should mail the managers of its institutional groups when it has no manual group",
    async ({ db }) => {
      // Arrange
      const { sendMail, contact } = arrangeApp(db);
      const sample = await publish(db, { institution: INSTITUTION });
      const owner = await insertUser(db, "owner@univ-lorraine.fr");
      await insertSampleOwner(db, sample.id, owner.id);
      const manager = await insertUser(db, "manager@univ-lorraine.fr");
      const stranger = await insertUser(db, "stranger@univ-grenoble.fr");
      await moderateInstitution(db, manager.id, {
        kind: "laboratory",
        code: "UMR7358",
      });
      await moderateInstitution(db, stranger.id, {
        kind: "laboratory",
        code: "UMR5001",
      });
      // Act
      const res = await contact(sample.igsn!);
      // Assert
      expect(res.status).toBe(204);
      expect(sendMail.mock.lastCall![0].to).toEqual([
        "manager@univ-lorraine.fr",
      ]);
    },
  );

  pgTest.for([
    [
      "its owner was rejected and it has no manager",
      async (db: Db) => {
        await insertGroup(db);
        const sample = await publish(db, { manualGroupIds: [GROUP.id] });
        const owner = await insertUser(db, "owner@univ-lorraine.fr", {
          status: "rejected",
        });
        await insertSampleOwner(db, sample.id, owner.id);
        await joinGroup(db, owner.id);
        return sample;
      },
    ],
    [
      "it belongs to no group at all",
      async (db: Db) => {
        const sample = await publish(db);
        const owner = await insertUser(db, "owner@univ-lorraine.fr");
        await insertSampleOwner(db, sample.id, owner.id);
        return sample;
      },
    ],
  ] as const)("should answer 409 when %s", async ([, arrange], { db }) => {
    // Arrange
    const { sendMail, contact } = arrangeApp(db);
    const sample = await arrange(db);
    // Act
    const res = await contact(sample.igsn!);
    // Assert
    expect(res.status).toBe(409);
    expect(sendMail).not.toHaveBeenCalled();
  });

  pgTest.for([
    ["an unknown field", { ...visitor, role: "owner" }],
    ["a malformed email", { ...visitor, email: "not-an-email" }],
  ] as const)("should answer 400 for %s", async ([, body], { db }) => {
    // Arrange
    const { contact } = arrangeApp(db);
    const { sample } = await arrangeGroupOwner(db);
    // Act
    const res = await contact(sample.igsn!, body);
    // Assert
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid contact request" });
  });

  pgTest("should answer 400 for a malformed igsn", async ({ db }) => {
    // Arrange
    const { contact } = arrangeApp(db);
    // Act
    const res = await contact("nope");
    // Assert
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid IGSN" });
  });

  pgTest.for([
    ["unknown", async () => "0123456789ABCDEFGHJKMNPQRS"],
    [
      "unpublished",
      async (db: Db) => generateIgsnSuffix((await insertSample(db, draft)).id),
    ],
  ] as const)(
    "should answer 404 for an %s igsn",
    async ([, arrange], { db }) => {
      // Arrange
      const { contact } = arrangeApp(db);
      const igsn = await arrange(db);
      // Act
      const res = await contact(igsn);
      // Assert
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "Sample not found" });
    },
  );
});
