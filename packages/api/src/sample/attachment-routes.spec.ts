import { DEFAULT_UPLOAD_LIMIT } from "@projet-igsn/domain/sample/attachment/attachment-validator";
import { sampleResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { testClient } from "hono/testing";
import { join } from "node:path";
import { v7 as uuidv7 } from "uuid";
import { describe, expect } from "vitest";

import { createApp } from "../app.ts";
import { pgTest } from "../tests/pg-test.ts";
import { provisionUser, tokenEmail } from "../tests/provision-user.ts";
import { setSampleStatus } from "./service/set-sample-status.ts";

const authHeader = { Authorization: "Bearer test-token" };

const csv = new TextEncoder().encode("col1,col2\n1,2\n");

function csvFile(name = "measurements.csv") {
  return new File([csv], name, { type: "text/csv" });
}

type Client = ReturnType<
  typeof testClient<ReturnType<typeof createApp>["app"]>
>;
type Db = Parameters<typeof createApp>[0];

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

const attachmentsDir = join(import.meta.dirname, "..", "..", "attachments");

async function createTestApp(db: Parameters<typeof createApp>[0]) {
  await provisionUser(db, "test-token", { status: "accepted" });
  return testClient(createApp(db, { attachmentsDir }).app);
}

const sampleBody = {
  name: "Grès de Fontainebleau",
  nature: "rock_powder",
  type: "individual_sample",
  material: "sediment.exogenous_detritic.clay",
  specificName: "FTB-2026-042",
  existenceStatus: "exists",
  availabilityStatus: "available",
  location: { position: { type: "point", longitude: 0, latitude: 0 } },
  description: {
    collectionDate: { start: "2026-01-01", end: "2026-01-01" },
  },
  scientificContext: {
    provenanceStatus: "historical_specimen",
    collectionCurator: "Georges Cuvier",
    collectionOrigin: "scientific_expedition",
  },
  repository: { currentArchive: "02feahw73" },
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
      const client = await createTestApp(db);
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
    const client = await createTestApp(db);
    const sample = await createSample(client);
    const res = await client.admin.samples[":id"].attachments.$post({
      param: { id: sample.id },
      form: { file: csvFile() },
    });
    expect(res.status).toBe(401);
  });

  pgTest("should accept any file type", async ({ db }) => {
    const client = await createTestApp(db);
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
    const client = await createTestApp(db);
    const sample = await createSample(client);
    const res = await client.admin.samples[":id"].attachments.$post(
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
      const client = await createTestApp(db);
      const sample = await createSample(client);
      const res = await client.admin.samples[":id"].attachments.$post(
        {
          param: { id: sample.id },
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
      const client = await createTestApp(db);
      const sample = await createSample(client);
      for (let i = 1; i < DEFAULT_UPLOAD_LIMIT; i++) {
        expect((await uploadAttachment(client, sample.id)).status).toBe(201);
      }
      // Act
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
    const client = await createTestApp(db);
    const res = await uploadAttachment(
      client,
      "00000000-0000-7000-8000-000000000000",
    );
    expect(res.status).toBe(404);
  });

  pgTest("should download the attachment", async ({ db }) => {
    // Arrange
    const client = await createTestApp(db);
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
    // Arrange
    const client = await createTestApp(db);
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
    // Assert
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
    const client = await createTestApp(db);
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
    const client = await createTestApp(db);
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
    const client = await createTestApp(db);
    const sample = await createSample(client);
    const uploaded = await uploadAttachment(client, sample.id);
    const { data } = (await uploaded.json()) as { data: { id: string } };
    const res = await client.admin.samples[":id"].attachments[
      ":attachmentId"
    ].$delete({ param: { id: sample.id, attachmentId: data.id } });
    expect(res.status).toBe(401);
  });

  pgTest("should 400 a malformed attachment id on delete", async ({ db }) => {
    const client = await createTestApp(db);
    const sample = await createSample(client);
    const res = await client.admin.samples[":id"].attachments[
      ":attachmentId"
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
      const client = await createTestApp(db);
      const sample = await createSample(client);
      const keptRes = await uploadAttachment(client, sample.id, "Raw");
      const kept = ((await keptRes.json()) as { data: { id: string } }).data;
      await uploadAttachment(client, sample.id, "To drop");
      // Act
      const res = await client.admin.samples[":id"].$put(
        {
          param: { id: sample.id },
          json: {
            ...sampleBody,
            attachments: [{ id: kept.id, description: "Calibrated" }],
            expectedUpdatedAt: sample.updatedAt,
          },
        },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(200);
      expect(
        sampleResponseSchema.parse(await res.json()).data.attachments,
      ).toEqual([{ ...kept, description: "Calibrated" }]);
    },
  );

  pgTest(
    "should remove every attachment when the sample update omits them",
    async ({ db }) => {
      // Arrange
      const client = await createTestApp(db);
      const sample = await createSample(client);
      await uploadAttachment(client, sample.id, "Raw");
      // Act
      const res = await client.admin.samples[":id"].$put(
        {
          param: { id: sample.id },
          json: { ...sampleBody, expectedUpdatedAt: sample.updatedAt },
        },
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

describe("publishing rights on a published sample's attachments", () => {
  const publishedSampleWithFile = async (client: Client) => {
    const sample = await createSample(client);
    const uploaded = await uploadAttachment(client, sample.id);
    const { data } = (await uploaded.json()) as { data: { id: string } };
    await client.admin.samples[":id"].publish.$post(
      { param: { id: sample.id } },
      { headers: authHeader },
    );
    return { sampleId: sample.id, attachmentId: data.id };
  };

  const demote = (db: Db) =>
    db
      .updateTable("user")
      .set({ status: "pending" })
      .where("email", "=", tokenEmail("test-token"))
      .execute();

  pgTest("should refuse an upload from an unverified owner", async ({ db }) => {
    // Arrange
    const client = await createTestApp(db);
    const { sampleId } = await publishedSampleWithFile(client);
    await demote(db);
    // Act
    const res = await uploadAttachment(client, sampleId);
    // Assert
    expect(res.status).toBe(403);
  });

  pgTest(
    "should refuse a deletion from an unverified owner",
    async ({ db }) => {
      // Arrange
      const client = await createTestApp(db);
      const { sampleId, attachmentId } = await publishedSampleWithFile(client);
      await demote(db);
      // Act
      const res = await client.admin.samples[":id"].attachments[
        ":attachmentId"
      ].$delete(
        { param: { id: sampleId, attachmentId } },
        { headers: authHeader },
      );
      // Assert
      expect(res.status).toBe(403);
      const read = await client.admin.samples[":id"].$get(
        { param: { id: sampleId } },
        { headers: authHeader },
      );
      expect(
        sampleResponseSchema.parse(await read.json()).data.attachments,
      ).toHaveLength(1);
    },
  );

  pgTest("should still let an unverified owner read it", async ({ db }) => {
    // Arrange
    const client = await createTestApp(db);
    const { sampleId, attachmentId } = await publishedSampleWithFile(client);
    await demote(db);
    // Act
    const sample = await client.admin.samples[":id"].$get(
      { param: { id: sampleId } },
      { headers: authHeader },
    );
    const download = await client.admin.samples[":id"].attachments[
      ":attachmentId"
    ].$get({ param: { id: sampleId, attachmentId } }, { headers: authHeader });
    // Assert
    expect([sample.status, download.status]).toEqual([200, 200]);
  });

  pgTest("should still let them change a draft's files", async ({ db }) => {
    // Arrange
    const client = await createTestApp(db);
    const draft = await createSample(client);
    await demote(db);
    // Act
    const res = await uploadAttachment(client, draft.id);
    // Assert
    expect(res.status).toBe(201);
  });

  pgTest("should let an accepted owner change them", async ({ db }) => {
    // Arrange
    const client = await createTestApp(db);
    const { sampleId } = await publishedSampleWithFile(client);
    // Act
    const res = await uploadAttachment(client, sampleId);
    // Assert
    expect(res.status).toBe(201);
  });
});

describe("upload limit on save and publish", () => {
  pgTest(
    "should refuse a save keeping more attachments than the limit",
    async ({ db }) => {
      // Arrange
      const client = await createTestApp(db);
      const sample = await createSample(client);
      const attachments = await insertLegacyAttachments(
        db,
        sample.id,
        DEFAULT_UPLOAD_LIMIT + 1,
      );
      // Act
      const res = await client.admin.samples[":id"].$put(
        {
          param: { id: sample.id },
          json: {
            ...sampleBody,
            attachments,
            expectedUpdatedAt: sample.updatedAt,
          },
        },
        { headers: authHeader },
      );
      // Assert
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
      const client = await createTestApp(db);
      const sample = await createSample(client);
      const attachments = await insertLegacyAttachments(
        db,
        sample.id,
        DEFAULT_UPLOAD_LIMIT + 1,
      );
      // Act / Assert
      const blocked = await client.admin.samples[":id"].publish.$post(
        { param: { id: sample.id } },
        { headers: authHeader },
      );
      expect(blocked.status).toBe(409);
      // Act / Assert
      const saved = await client.admin.samples[":id"].$put(
        {
          param: { id: sample.id },
          json: {
            ...sampleBody,
            attachments: attachments.slice(0, DEFAULT_UPLOAD_LIMIT),
            expectedUpdatedAt: sample.updatedAt,
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
    return { igsn: igsn!, attachmentId: data.id, sampleId: sample.id };
  }

  pgTest("should download a published sample's attachment", async ({ db }) => {
    // Arrange
    const client = await createTestApp(db);
    const { igsn, attachmentId } = await publishWithAttachment(client);
    // Act
    const res = await client.samples[":igsn"].attachments[":attachmentId"].$get(
      { param: { igsn, attachmentId } },
    );
    // Assert
    expect(res.status).toBe(200);
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(csv);
  });

  pgTest("should 404 an unknown attachment id", async ({ db }) => {
    const client = await createTestApp(db);
    const { igsn } = await publishWithAttachment(client);
    const res = await client.samples[":igsn"].attachments[":attachmentId"].$get(
      {
        param: { igsn, attachmentId: "00000000-0000-7000-8000-000000000000" },
      },
    );
    expect(res.status).toBe(404);
  });

  pgTest(
    "should not expose a withdrawn sample's attachment by IGSN",
    async ({ db }) => {
      // Arrange
      const client = await createTestApp(db);
      const { igsn, attachmentId, sampleId } =
        await publishWithAttachment(client);
      await setSampleStatus(db, sampleId, "withdrawn");
      // Act
      const res = await client.samples[":igsn"].attachments[
        ":attachmentId"
      ].$get({ param: { igsn, attachmentId } });
      // Assert
      expect(res.status).toBe(404);
    },
  );

  pgTest(
    "should not expose a draft sample's attachment by IGSN",
    async ({ db }) => {
      // Arrange
      const client = await createTestApp(db);
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
