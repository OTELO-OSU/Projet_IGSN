import { sampleResponseSchema } from "@projet-igsn/domain/sample/sample-validator";
import { testClient } from "hono/testing";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

async function createTestApp(db: Parameters<typeof createApp>[0]) {
  const attachmentsDir = await mkdtemp(join(tmpdir(), "igsn-attachments-"));
  return testClient(createApp(db, { attachmentsDir }));
}

async function createSample(client: Client) {
  const res = await client.admin.samples.$post(
    {
      json: {
        name: "Grès de Fontainebleau",
        nature: "rock_powder",
        type: "individual_sample",
        material: "sediment.exogenous_detritic.clay",
        specificName: "FTB-2026-042",
        location: { position: { type: "point", longitude: 0, latitude: 0 } },
        description: {
          collectionDate: { start: "2026-01-01", end: "2026-01-01" },
        },
      },
    },
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

  pgTest("should reject a file type outside the allow-list", async ({ db }) => {
    const client = await createTestApp(db);
    const sample = await createSample(client);
    const res = await client.admin.samples[":id"].attachments.$post(
      { param: { id: sample.id }, form: { file: csvFile("page.html") } },
      { headers: authHeader },
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid attachment" });
  });

  pgTest("should reject a description without a file", async ({ db }) => {
    const client = await createTestApp(db);
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
      const client = await createTestApp(db);
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

  pgTest("should update then clear the description", async ({ db }) => {
    // Arrange
    const client = await createTestApp(db);
    const sample = await createSample(client);
    const uploaded = await uploadAttachment(client, sample.id, "Old");
    const { data } = (await uploaded.json()) as { data: { id: string } };
    // Act
    const res = await client.admin.samples[":id"].attachments[
      ":attachmentId"
    ].$put(
      {
        param: { id: sample.id, attachmentId: data.id },
        json: { description: null },
      },
      { headers: authHeader },
    );
    // Assert
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      data: { ...data, description: null },
    });
  });

  pgTest(
    "should 404 a description update on an unknown attachment",
    async ({ db }) => {
      const client = await createTestApp(db);
      const sample = await createSample(client);
      const res = await client.admin.samples[":id"].attachments[
        ":attachmentId"
      ].$put(
        {
          param: {
            id: sample.id,
            attachmentId: "00000000-0000-7000-8000-000000000000",
          },
          json: { description: "ghost" },
        },
        { headers: authHeader },
      );
      expect(res.status).toBe(404);
    },
  );

  pgTest("should delete the attachment", async ({ db }) => {
    // Arrange
    const client = await createTestApp(db);
    const sample = await createSample(client);
    const uploaded = await uploadAttachment(client, sample.id);
    const { data } = (await uploaded.json()) as { data: { id: string } };
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
    expect(
      sampleResponseSchema.parse(await read.json()).data.attachments,
    ).toEqual([]);
  });

  pgTest("should 404 a delete of an unknown attachment", async ({ db }) => {
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
    const client = await createTestApp(db);
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
    "should not expose a draft sample's attachment by IGSN",
    async ({ db }) => {
      // Arrange: an attachment on a draft, plus a published sample whose IGSN
      // the request borrows; neither pairing may resolve.
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
