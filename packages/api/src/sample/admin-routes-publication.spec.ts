import type { MailKind } from "@projet-igsn/domain/user/mail-kind";
import type { Kysely } from "kysely";

import { dateFromToday } from "@projet-igsn/domain/date/date-from-today";
import { sampleResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { describe, expect, onTestFinished, vi } from "vitest";

import type { DB } from "../db.ts";

import { createApp } from "../app.ts";
import { requireActiveSession } from "../auth/active-session.ts";
import { insertUser } from "../tests/insert-user.ts";
import { pgTest } from "../tests/pg-test.ts";
import { provisionUser } from "../tests/provision-user.ts";
import { publishableSample } from "../tests/sample-fixtures.ts";
import { sentMails } from "../tests/sent-mails.ts";
import {
  dataCiteEventsOf,
  STUB_DATACITE_CONFIG,
  stubDataCite,
} from "../tests/stub-datacite.ts";
import { insertSampleOwner } from "../user-sample/insert-sample-owner.ts";
import { insertSample } from "./service/insert-sample.ts";
import { publishSample } from "./service/publish-sample.ts";

const authHeader = { Authorization: "Bearer test-token" };
const ADMIN_URL = "http://localhost:3001/admin/";
const FRONTEND_URL = "http://localhost:3000";
const OWNER_EMAIL = "owner-e7b@univ-lorraine.fr";
const CONTRIBUTOR_EMAIL = "contributor-e7b@univ-lorraine.fr";
const TOMORROW = dateFromToday(0, 1);
const NEXT_MONTH = dateFromToday(0, 30);

async function arrangeSample(
  db: Kysely<DB>,
  {
    superAdmin = false,
    status = "draft",
    ownerMailOptOuts = [],
  }: {
    superAdmin?: boolean;
    status?: "draft" | "embargo" | "published";
    ownerMailOptOuts?: MailKind[];
  } = {},
) {
  const fetchMock = stubDataCite(new Response("{}", { status: 201 }));
  onTestFinished(() => {
    vi.unstubAllGlobals();
  });
  const sendMail = vi.fn().mockResolvedValue(undefined);
  const { app } = createApp(db, {
    mail: { sendMail, adminUrl: ADMIN_URL, frontendUrl: FRONTEND_URL },
  });
  const caller = await provisionUser(db, "test-token", {
    status: "accepted",
    superAdmin,
  });
  const owner = await insertUser(db, OWNER_EMAIL, {
    mailOptOuts: ownerMailOptOuts,
  });
  const contributor = await insertUser(db, CONTRIBUTOR_EMAIL);
  const created = await insertSample(db, publishableSample);
  await insertSampleOwner(db, created.id, owner.id);
  await db
    .insertInto("user_sample")
    .values([
      { sample_id: created.id, user_id: caller.id, role: "editor" },
      { sample_id: created.id, user_id: contributor.id, role: "contributor" },
    ])
    .execute();
  const sample =
    status === "draft"
      ? created
      : (await publishSample(
          db,
          created.id,
          status,
          STUB_DATACITE_CONFIG,
          status === "embargo" ? TOMORROW : undefined,
        ))!;
  fetchMock.mockClear();
  return { app, sample, sendMail, fetchMock };
}

const publish = (
  app: ReturnType<typeof createApp>["app"],
  id: string,
  query: string,
) =>
  app.request(`/admin/samples/${id}/publish?${query}`, {
    method: "POST",
    headers: authHeader,
  });

const setStatus = (
  app: ReturnType<typeof createApp>["app"],
  id: string,
  body: unknown,
) =>
  app.request(`/admin/samples/${id}/status`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...authHeader },
    body: JSON.stringify(body),
  });

const toEveryCollaboratorButTheActor = (subject: string) =>
  [CONTRIBUTOR_EMAIL, OWNER_EMAIL].map((email) => ({ to: [email], subject }));

describe("admin sample publication", () => {
  pgTest(
    "should refuse a publication on a revoked session, the sample staying a draft",
    async ({ db }) => {
      // Arrange
      const { app, sample, fetchMock } = await arrangeSample(db);
      vi.mocked(requireActiveSession).mockImplementationOnce(async (c) =>
        c.json({ error: "Unauthorized" }, 401),
      );
      // Act
      const res = await publish(app, sample.id, "status=published");
      // Assert
      expect(res.status).toBe(401);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(
        await db
          .selectFrom("sample")
          .select("status")
          .where("id", "=", sample.id)
          .executeTakeFirstOrThrow(),
      ).toEqual({ status: "draft" });
    },
  );

  pgTest(
    "should publish under embargo until the chosen date, register the DOI and mail every collaborator but the publisher",
    async ({ db }) => {
      // Arrange
      const { app, sample, sendMail, fetchMock } = await arrangeSample(db, {
        superAdmin: true,
      });
      // Act
      const res = await publish(
        app,
        sample.id,
        `status=embargo&publishedAt=${TOMORROW}`,
      );
      // Assert
      expect(res.status).toBe(200);
      expect(sampleResponseSchema.parse(await res.json()).data).toMatchObject({
        status: "embargo",
        publishedAt: new Date(TOMORROW),
        publicationYear: new Date(TOMORROW).getUTCFullYear(),
      });
      expect(dataCiteEventsOf(fetchMock)).toEqual(["register"]);
      await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(2));
      expect(sentMails(sendMail)).toEqual(
        toEveryCollaboratorButTheActor(
          `Test User published the sample "${publishableSample.name}" with an embargo until ${TOMORROW}`,
        ),
      );
    },
  );

  pgTest(
    "should not mail the publication to an owner who switched it off, the contributor still mailed",
    async ({ db }) => {
      // Arrange
      const { app, sample, sendMail } = await arrangeSample(db, {
        superAdmin: true,
        ownerMailOptOuts: ["sample_publication"],
      });
      // Act
      const res = await publish(
        app,
        sample.id,
        `status=embargo&publishedAt=${TOMORROW}`,
      );
      // Assert
      expect(res.status).toBe(200);
      await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(1));
      expect(sentMails(sendMail)).toEqual([
        {
          to: [CONTRIBUTOR_EMAIL],
          subject: `Test User published the sample "${publishableSample.name}" with an embargo until ${TOMORROW}`,
        },
      ]);
    },
  );

  pgTest.for([
    { status: "published", suffix: "" },
    { status: "withdrawn", suffix: " as withdrawn" },
  ])(
    "should publish a draft as $status and mail every collaborator but the publisher",
    async ({ status, suffix }, { db }) => {
      // Arrange
      const { app, sample, sendMail } = await arrangeSample(db);
      // Act
      const res = await publish(app, sample.id, `status=${status}`);
      // Assert
      expect(res.status).toBe(200);
      await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(2));
      expect(sentMails(sendMail)).toEqual(
        toEveryCollaboratorButTheActor(
          `Test User published the sample "${publishableSample.name}"${suffix}`,
        ),
      );
    },
  );

  pgTest.for([
    `status=published&publishedAt=${dateFromToday(0, 1)}`,
    "status=embargo",
    `status=embargo&publishedAt=${dateFromToday(0, -1)}`,
  ])("should answer 400 to the publish query %s", async (query, { db }) => {
    // Arrange
    const { app, sample } = await arrangeSample(db);
    // Act
    const res = await publish(app, sample.id, query);
    // Assert
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid publish status" });
  });

  pgTest(
    "should move the publication date of an embargoed sample",
    async ({ db }) => {
      // Arrange
      const { app, sample } = await arrangeSample(db, { status: "embargo" });
      // Act
      const res = await setStatus(app, sample.id, {
        status: "embargo",
        publishedAt: NEXT_MONTH,
      });
      // Assert
      expect(res.status).toBe(200);
      expect(sampleResponseSchema.parse(await res.json()).data).toMatchObject({
        status: "embargo",
        publishedAt: new Date(NEXT_MONTH),
        publicationYear: new Date(NEXT_MONTH).getUTCFullYear(),
      });
    },
  );

  pgTest.for([
    {
      from: "published" as const,
      body: { status: "embargo", publishedAt: dateFromToday(0, 1) },
    },
    { from: "embargo" as const, body: { status: "withdrawn" } },
  ])(
    "should refuse moving a $from sample to $body.status",
    async ({ from, body }, { db }) => {
      // Arrange
      const { app, sample } = await arrangeSample(db, { status: from });
      // Act
      const res = await setStatus(app, sample.id, body);
      // Assert
      expect(res.status).toBe(403);
    },
  );

  pgTest(
    "should publish an embargoed sample now, tell DataCite and mail every collaborator but the actor",
    async ({ db }) => {
      // Arrange
      const { app, sample, sendMail, fetchMock } = await arrangeSample(db, {
        status: "embargo",
      });
      // Act
      const res = await setStatus(app, sample.id, { status: "published" });
      // Assert
      expect(res.status).toBe(200);
      const { data } = sampleResponseSchema.parse(await res.json());
      expect(data.status).toBe("published");
      expect(Date.now() - data.publishedAt!.getTime()).toBeLessThan(60_000);
      expect({
        events: dataCiteEventsOf(fetchMock),
        synchronizationStatus: data.synchronizationStatus,
      }).toEqual({ events: ["publish"], synchronizationStatus: "synced" });
      await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(2));
      expect(sentMails(sendMail)).toEqual(
        toEveryCollaboratorButTheActor(
          `The sample "${publishableSample.name}" is now published`,
        ),
      );
    },
  );
});
