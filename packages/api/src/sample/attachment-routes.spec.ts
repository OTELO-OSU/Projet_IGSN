import { DEFAULT_UPLOAD_LIMIT } from "@projet-igsn/domain/sample/attachment/attachment-validator";
import { sampleResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { testClient } from "hono/testing";
import { join } from "node:path";
import { v7 as uuidv7 } from "uuid";
import { describe, expect } from "vitest";

import { createApp } from "../app.ts";
import { pgTest } from "../tests/pg-test.ts";

// requireAuth is stubbed suite-wide in test/setup.ts to gate on the Authorization
// header, so these tests just send (or omit) it.
const authHeader = { Authorization: "Bearer test-token" };

const csv = new TextEncoder().encode("col1,col2\n1,2\n");

function csvFile(name = "measurements.csv") {
  return new File([csv], name, { type: "text/csv" });
}

type Client = ReturnType<typeof testClient<ReturnType<typeof createApp>>>;
type Db = Parameters<typeof createApp>[0];

// Rows inserted straight into the table, bypassing the upload cap on purpose:
// the legacy sample that already sits above the limit (no grandfathering).
async function insertLegacyAttachments(
  db: Db,
  sampleId: string,
  count: number,
) {
  const rows = Array.from({ length: count }, (_, i) => ({
    id: uuidv7(),
    sample_id: sampleId,
    name: `legacy-${i}.csv`,
    media_type: "text/csv",
    description: null,
  }));
  await db.insertInto("sample_attachment").values(rows).execute();
  return rows.map((row) => ({ id: row.id, description: null }));
}

// The real dev folder (gitignored), so uploaded blobs stay inspectable.
const attachmentsDir = join(import.meta.dirname, "..", "..", "attachments");

function createTestApp(db: Parameters<typeof createApp>[0]) {
  return testClient(createApp(db, { attachmentsDir }));
}

const sampleBody = {
  name: "Grès de Fontainebleau",
  nature: "rock_powder",
  type: "individual_sample",
  material: "sediment.exogenous_detritic.clay",
  specificName: "FTB-2026-042",
  availability: "exists",
  location: { position: { type: "point", longitude: 0, latitude: 0 } },
  description: {
    collectionDate: { start: "2026-01-01", end: "2026-01-01" },
  },
  scientificContext: {
    provenanceStatus: "historical_specimen",
    collectionCurator: "Georges Cuvier",
    collectionOrigin: "scientific_expedition",
  },
} as const;

async function createSample(client: Client) {
  const res = await client.admin.samples.$post(
    { json: sampleBody },
    { headers: authHeader },
  );
  return sampleResponseSchema.parse(await res.json()).data;
}

async function uploadAttachment(
  client: Client,
  sampleId: string,
  description?: string,
) {
  const res = await client.admin.samples[":id"].attachments.$post(
    {
      param: { id: sampleId },
      form: description
        ? { file: csvFile(), description }
        : { file: csvFile() },
    },
    { headers: authHeader },
  );
  return res;
}

describe("admin attachment routes", () => {
  pgTest(
    "should upload an attachment and expose it on the sample",
    async ({ db }) => {
      // Arrange
      const client = createTestApp(db);
      const sample = await createSample(client);
      // Act
      const res = await uploadAttachment(client, sample.id, "Raw measurements");
      // Assert
      expect(res.status).toBe(201);
      const { data } = (await res.json()) as { data: { id: string } };
      expect(data).toMatchObject({
        name: "measurements.csv",
        mediaType: "text/csv",
        description: "Raw measurements",
      });
      const read = await client.admin.samples[":id"].$get(
        { param: { id: sample.id } },
        { headers: authHeader },
      );
      expect(
        sampleResponseSchema.parse(await read.json()).data.attachments,
      ).toEqual([data]);
    },
  );

  pgTest("should reject an unauthenticated upload", async ({ db }) => {
    const client = createTestApp(db);
    const sample = await createSample(client);
    const res = await client.admin.samples[":id"].attachments.$post({
      param: { id: sample.id },
      form: { file: csvFile() },
    });
    expect(res.status).toBe(401);
  });

  pgTest("should accept any file type", async ({ db }) => {
    const client = createTestApp(db);
    const sample = await createSample(client);
    const res = await client.admin.samples[":id"].attachments.$post(
      {
        param: { id: sample.id },
        form: {
          file: new File([csv], "field-footage.mp4", { type: "video/mp4" }),
        },
      },
      { headers: authHeader },
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({
      data: { name: "field-footage.mp4", mediaType: "video/mp4" },
    });
  });

  pgTest("should reject a description without a file", async ({ db }) => {
    const client = createTestApp(db);
    const sample = await createSample(client);
    const res = await client.admin.samples[":id"].attachments.$post(
      // Cast: the typed client rightly forbids this payload; the server must too.
      {
        param: { id: sample.id },
        form: { description: "orphan" } as unknown as { file: File },
      },
      { headers: authHeader },
    );
    expect(res.status).toBe(400);
  });

  pgTest(
    "should default a missing file type to application/octet-stream",
    async ({ db }) => {
      const client = createTestApp(db);
      const sample = await createSample(client);
      const res = await client.admin.samples[":id"].attachments.$post(
        {
          param: { id: sample.id },
          // A File built without a type reaches the server with "".
          form: { file: new File([csv], "data.csv") },
        },
        { headers: authHeader },
      );
      expect(res.status).toBe(201);
      expect(await res.json()).toMatchObject({
        data: { mediaType: "application/octet-stream" },
      });
    },
  );

  pgTest(
    "should accept uploads up to the limit and refuse the next one",
    async ({ db }) => {
      // Arrange
      const client = createTestApp(db);
      const sample = await createSample(client);
      for (let i = 1; i < DEFAULT_UPLOAD_LIMIT; i++) {
        expect((await uploadAttachment(client, sample.id)).status).toBe(201);
      }
      // Act: the last allowed upload, then one too many.
      const last = await uploadAttachment(client, sample.id);
      const refused = await uploadAttachment(client, sample.id);
      // Assert
      expect(last.status).toBe(201);
      expect(refused.status).toBe(409);
      const read = await client.admin.samples[":id"].$get(
        { param: { id: sample.id } },
        { headers: authHeader },
      );
      expect(
        sampleResponseSchema.parse(await read.json()).data.attachments,
      ).toHaveLength(DEFAULT_UPLOAD_LIMIT);
    },
  );

  pgTest("should 404 an upload to an unknown sample", async ({ db }) => {
    const client = createTestApp(db);
    const res = await uploadAttachment(
      client,
      "00000000-0000-7000-8000-000000000000",
    );
    expect(res.status).toBe(404);
  });

  pgTest("should download the attachment", async ({ db }) => {
    // Arrange
    const client = createTestApp(db);
    const sample = await createSample(client);
    const uploaded = await uploadAttachment(client, sample.id);
    const { data } = (await uploaded.json()) as { data: { id: string } };
    // Act
    const res = await client.admin.samples[":id"].attachments[
      ":attachmentId"
    ].$get(
      { param: { id: sample.id, attachmentId: data.id } },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/csv");
    expect(res.headers.get("content-disposition")).toContain(
      'attachment; filename="measurements.csv"',
    );
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(csv);
  });

  pgTest("should delete an attachment and free its slot", async ({ db }) => {
    // Arrange: a full sample, so the freed slot is what lets the next upload in.
    const client = createTestApp(db);
    const sample = await createSample(client);
    const first = await uploadAttachment(client, sample.id);
    const { data } = (await first.json()) as { data: { id: string } };
    for (let i = 1; i < DEFAULT_UPLOAD_LIMIT; i++) {
      await uploadAttachment(client, sample.id);
    }
    // Act
    const res = await client.admin.samples[":id"].attachments[
      ":attachmentId"
    ].$delete(
      { param: { id: sample.id, attachmentId: data.id } },
      { headers: authHeader },
    );
    // Assert: gone, content included, and the sample takes a file again.
    expect(res.status).toBe(204);
    const read = await client.admin.samples[":id"].$get(
      { param: { id: sample.id } },
      { headers: authHeader },
    );
    const { attachments } = sampleResponseSchema.parse(await read.json()).data;
    expect(attachments).toHaveLength(DEFAULT_UPLOAD_LIMIT - 1);
    expect(attachments.map(({ id }) => id)).not.toContain(data.id);
    const download = await client.admin.samples[":id"].attachments[
      ":attachmentId"
    ].$get(
      { param: { id: sample.id, attachmentId: data.id } },
      { headers: authHeader },
    );
    expect(download.status).toBe(404);
    expect((await uploadAttachment(client, sample.id)).status).toBe(201);
  });

  pgTest("should 404 the deletion of an unknown attachment", async ({ db }) => {
    const client = createTestApp(db);
    const sample = await createSample(client);
    const res = await client.admin.samples[":id"].attachments[
      ":attachmentId"
    ].$delete(
      {
        param: {
          id: sample.id,
          attachmentId: "00000000-0000-7000-8000-000000000000",
        },
      },
      { headers: authHeader },
    );
    expect(res.status).toBe(404);
  });

  pgTest("should 404 a deletion on an unknown sample", async ({ db }) => {
    const client = createTestApp(db);
    const res = await client.admin.samples[":id"].attachments[
      ":attachmentId"
    ].$delete(
      {
        param: {
          id: "00000000-0000-7000-8000-000000000000",
          attachmentId: "00000000-0000-7000-8000-000000000001",
        },
      },
      { headers: authHeader },
    );
    expect(res.status).toBe(404);
  });

  pgTest("should reject an unauthenticated deletion", async ({ db }) => {
    const client = createTestApp(db);
    const sample = await createSample(client);
    const uploaded = await uploadAttachment(client, sample.id);
    const { data } = (await uploaded.json()) as { data: { id: string } };
    const res = await client.admin.samples[":id"].attachments[
      ":attachmentId"
    ].$delete({ param: { id: sample.id, attachmentId: data.id } });
    expect(res.status).toBe(401);
  });

  pgTest("should 400 a malformed attachment id on delete", async ({ db }) => {
    const client = createTestApp(db);
    const sample = await createSample(client);
    const res = await createTestApp(db).admin.samples[":id"].attachments[
      ":attachmentId"
      // Cast: the typed client rightly forbids this id; the server must too.
    ].$delete(
      { param: { id: sample.id, attachmentId: "not-a-uuid" } },
      { headers: authHeader },
    );
    expect(res.status).toBe(400);
  });

  pgTest(
    "should reconcile attachments through the sample update",
    async ({ db }) => {
      // Arrange
      const client = createTestApp(db);
      const sample = await createSample(client);
      const keptRes = await uploadAttachment(client, sample.id, "Raw");
      const kept = ((await keptRes.json()) as { data: { id: string } }).data;
      await uploadAttachment(client, sample.id, "To drop");
      // Act: list only one attachment, with a new description.
      const res = await client.admin.samples[":id"].$put(
        {
          param: { id: sample.id },
          json: {
            ...sampleBody,
            attachments: [{ id: kept.id, description: "Calibrated" }],
          },
        },
        { headers: authHeader },
      );
      // Assert: the listed one keeps its file with the new description, the
      // unlisted one is gone.
      expect(res.status).toBe(200);
      expect(
        sampleResponseSchema.parse(await res.json()).data.attachments,
      ).toEqual([{ ...kept, description: "Calibrated" }]);
    },
  );

  pgTest(
    "should remove every attachment when the sample update omits them",
    async ({ db }) => {
      // Arrange: PUT semantics, like links.
      const client = createTestApp(db);
      const sample = await createSample(client);
      await uploadAttachment(client, sample.id, "Raw");
      // Act
      const res = await client.admin.samples[":id"].$put(
        { param: { id: sample.id }, json: sampleBody },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      expect(
        sampleResponseSchema.parse(await res.json()).data.attachments,
      ).toEqual([]);
    },
  );
});

describe("upload limit on save and publish", () => {
  pgTest(
    "should refuse a save keeping more attachments than the limit",
    async ({ db }) => {
      // Arrange: a legacy sample already above the limit.
      const client = createTestApp(db);
      const sample = await createSample(client);
      const attachments = await insertLegacyAttachments(
        db,
        sample.id,
        DEFAULT_UPLOAD_LIMIT + 1,
      );
      // Act
      const res = await client.admin.samples[":id"].$put(
        { param: { id: sample.id }, json: { ...sampleBody, attachments } },
        { headers: authHeader },
      );
      // Assert: rejected before any reconcile, so the sample keeps them all.
      expect(res.status).toBe(400);
      const read = await client.admin.samples[":id"].$get(
        { param: { id: sample.id } },
        { headers: authHeader },
      );
      expect(
        sampleResponseSchema.parse(await read.json()).data.attachments,
      ).toHaveLength(DEFAULT_UPLOAD_LIMIT + 1);
    },
  );

  pgTest(
    "should refuse publishing a sample above the limit until it is reduced",
    async ({ db }) => {
      // Arrange
      const client = createTestApp(db);
      const sample = await createSample(client);
      const attachments = await insertLegacyAttachments(
        db,
        sample.id,
        DEFAULT_UPLOAD_LIMIT + 1,
      );
      // Act / Assert: over the limit, publication is blocked.
      const blocked = await client.admin.samples[":id"].publish.$post(
        { param: { id: sample.id } },
        { headers: authHeader },
      );
      expect(blocked.status).toBe(409);
      // Act / Assert: dropping one file makes the save pass and publication
      // possible again.
      const saved = await client.admin.samples[":id"].$put(
        {
          param: { id: sample.id },
          json: {
            ...sampleBody,
            attachments: attachments.slice(0, DEFAULT_UPLOAD_LIMIT),
          },
        },
        { headers: authHeader },
      );
      expect(saved.status).toBe(200);
      const published = await client.admin.samples[":id"].publish.$post(
        { param: { id: sample.id } },
        { headers: authHeader },
      );
      expect(published.status).toBe(200);
    },
  );
});

describe("public attachment download", () => {
  async function publishWithAttachment(client: Client) {
    const sample = await createSample(client);
    const uploaded = await uploadAttachment(client, sample.id);
    const { data } = (await uploaded.json()) as { data: { id: string } };
    const published = await client.admin.samples[":id"].publish.$post(
      { param: { id: sample.id } },
      { headers: authHeader },
    );
    const { igsn } = sampleResponseSchema.parse(await published.json()).data;
    return { igsn: igsn!, attachmentId: data.id };
  }

  pgTest("should download a published sample's attachment", async ({ db }) => {
    // Arrange
    const client = createTestApp(db);
    const { igsn, attachmentId } = await publishWithAttachment(client);
    // Act: no auth header, the route is public.
    const res = await client.samples[":igsn"].attachments[":attachmentId"].$get(
      { param: { igsn, attachmentId } },
    );
    // Assert
    expect(res.status).toBe(200);
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(csv);
  });

  pgTest("should 404 an unknown attachment id", async ({ db }) => {
    const client = createTestApp(db);
    const { igsn } = await publishWithAttachment(client);
    const res = await client.samples[":igsn"].attachments[":attachmentId"].$get(
      {
        param: { igsn, attachmentId: "00000000-0000-7000-8000-000000000000" },
      },
    );
    expect(res.status).toBe(404);
  });

  pgTest(
    "should not expose a draft sample's attachment by IGSN",
    async ({ db }) => {
      // Arrange: an attachment on a draft, plus a published sample whose IGSN
      // the request borrows; neither pairing may resolve.
      const client = createTestApp(db);
      const draft = await createSample(client);
      const uploaded = await uploadAttachment(client, draft.id);
      const { data } = (await uploaded.json()) as { data: { id: string } };
      const { igsn } = await publishWithAttachment(client);
      // Act
      const res = await client.samples[":igsn"].attachments[
        ":attachmentId"
      ].$get({ param: { igsn, attachmentId: data.id } });
      // Assert
      expect(res.status).toBe(404);
    },
  );
});
