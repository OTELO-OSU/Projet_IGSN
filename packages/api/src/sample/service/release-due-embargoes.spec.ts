import type { Kysely } from "kysely";

import { afterEach, describe, expect, vi } from "vitest";

import type { DB } from "../../db.ts";

import { insertUser } from "../../tests/insert-user.ts";
import { pgTest } from "../../tests/pg-test.ts";
import { publishableSample } from "../../tests/sample-fixtures.ts";
import { sentMails } from "../../tests/sent-mails.ts";
import {
  dataCiteEventsOf,
  STUB_DATACITE_CONFIG,
  stubDataCite,
} from "../../tests/stub-datacite.ts";
import { insertSampleOwner } from "../../user-sample/insert-sample-owner.ts";
import { createUserSampleRepository } from "../../user-sample/repository.ts";
import { createSampleRepository } from "../repository.ts";
import { insertSample } from "./insert-sample.ts";
import { publishSample } from "./publish-sample.ts";
import { releaseDueEmbargoes } from "./release-due-embargoes.ts";

const NOW = new Date("2030-06-01T04:00:00Z");
const ADMIN_URL = "http://localhost:3001/admin/";

async function insertEmbargoed(
  db: Kysely<DB>,
  name: string,
  publishedAt: string,
) {
  const owner = await insertUser(db, `owner-${name}@univ-lorraine.fr`);
  const contributor = await insertUser(
    db,
    `contributor-${name}@univ-lorraine.fr`,
  );
  const { id } = await insertSample(db, { ...publishableSample, name });
  await insertSampleOwner(db, id, owner.id);
  await db
    .insertInto("user_sample")
    .values({ sample_id: id, user_id: contributor.id, role: "contributor" })
    .execute();
  await publishSample(db, id, "embargo", STUB_DATACITE_CONFIG, publishedAt);
  return id;
}

async function release(db: Kysely<DB>) {
  const sendMail = vi.fn().mockResolvedValue(undefined);
  await releaseDueEmbargoes(
    {
      samples: createSampleRepository(db, "attachments", STUB_DATACITE_CONFIG),
      userSamples: createUserSampleRepository(db),
    },
    { sendMail, adminUrl: ADMIN_URL },
    NOW,
  );
  return sendMail;
}

const statusesOf = (db: Kysely<DB>, ids: string[]) =>
  db
    .selectFrom("sample")
    .select(["id", "status", "synchronization_status"])
    .where("id", "in", ids)
    .orderBy("id")
    .execute();

describe("releaseDueEmbargoes", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  pgTest(
    "should publish every due embargo, mail its collaborators and leave a future one embargoed",
    async ({ db }) => {
      // Arrange
      const fetchMock = stubDataCite(new Response("{}", { status: 201 }));
      const due = await insertEmbargoed(db, "due", "2030-05-31");
      const future = await insertEmbargoed(db, "future", "2030-06-02");
      fetchMock.mockClear();
      // Act
      const sendMail = await release(db);
      // Assert
      expect(await statusesOf(db, [due, future])).toEqual([
        { id: due, status: "published", synchronization_status: "synced" },
        { id: future, status: "embargo", synchronization_status: "synced" },
      ]);
      expect(dataCiteEventsOf(fetchMock)).toEqual(["publish"]);
      expect(sentMails(sendMail)).toEqual([
        {
          to: ["contributor-due@univ-lorraine.fr"],
          subject: 'The sample "due" is now published',
        },
        {
          to: ["owner-due@univ-lorraine.fr"],
          subject: 'The sample "due" is now published',
        },
      ]);
    },
  );

  pgTest(
    "should still release the next due embargo when DataCite refuses one",
    async ({ db }) => {
      // Arrange
      const fetchMock = stubDataCite(new Response("{}", { status: 201 }));
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      const refused = await insertEmbargoed(db, "refused", "2030-05-30");
      const next = await insertEmbargoed(db, "next", "2030-05-31");
      fetchMock.mockResolvedValueOnce(new Response("nope", { status: 502 }));
      // Act
      const sendMail = await release(db);
      // Assert
      expect((await statusesOf(db, [next]))[0]?.status).toBe("published");
      expect(sentMails(sendMail).map(({ to }) => to)).toEqual([
        ["contributor-next@univ-lorraine.fr"],
        ["owner-next@univ-lorraine.fr"],
      ]);
      expect(console.error).toHaveBeenCalledWith(
        "Could not release the embargo",
        expect.objectContaining({ id: refused }),
      );
    },
  );
});
