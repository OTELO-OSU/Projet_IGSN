import type { Kysely } from "kysely";

import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect } from "vitest";

import type { DB } from "../db.ts";

import { pgTest } from "../tests/pg-test.ts";
import { createSampleAttachmentRepository } from "./attachment-repository.ts";
import { getSample } from "./service/get-sample.ts";
import { insertSample } from "./service/insert-sample.ts";

const content = new TextEncoder().encode("col1,col2\n1,2\n");

const input = {
  name: "measurements.csv",
  mediaType: "text/csv",
  description: "Raw XRF measurements",
};

async function arrange(db: Kysely<DB>) {
  const dir = await mkdtemp(join(tmpdir(), "igsn-attachments-"));
  const repository = createSampleAttachmentRepository(db, dir);
  const sample = await insertSample(db, {
    name: "Attached sample",
    nature: "hand_sample",
    type: null,
  });
  return { dir, repository, sample };
}

describe("sampleAttachmentRepository", () => {
  pgTest(
    "should store an attachment and read its content back",
    async ({ db }) => {
      const { repository, sample } = await arrange(db);
      // Act
      const created = await repository.create(sample.id, input, content);
      // Assert
      expect(created).toMatchObject({
        name: "measurements.csv",
        mediaType: "text/csv",
        sizeBytes: content.byteLength,
        description: "Raw XRF measurements",
      });
      const found = await repository.getContent(sample.id, created!.id);
      expect(found?.attachment).toEqual(created);
      expect(new Uint8Array(found!.content)).toEqual(content);
    },
  );

  pgTest("should list the attachment on the sample", async ({ db }) => {
    const { repository, sample } = await arrange(db);
    const created = await repository.create(sample.id, input, content);
    // Act / Assert
    expect((await getSample(db, sample.id))?.attachments).toEqual([created]);
  });

  pgTest("should return null for an unknown sample", async ({ db }) => {
    const { repository } = await arrange(db);
    // Act / Assert
    expect(
      await repository.create(
        "00000000-0000-7000-8000-000000000000",
        input,
        content,
      ),
    ).toBeNull();
  });

  pgTest("should update the description", async ({ db }) => {
    const { repository, sample } = await arrange(db);
    const created = await repository.create(sample.id, input, content);
    // Act
    const updated = await repository.updateDescription(
      sample.id,
      created!.id,
      null,
    );
    // Assert
    expect(updated).toEqual({ ...created, description: null });
  });

  pgTest(
    "should not update an attachment of another sample",
    async ({ db }) => {
      const { repository, sample } = await arrange(db);
      const other = await insertSample(db, {
        name: "Other sample",
        nature: "hand_sample",
        type: null,
      });
      const created = await repository.create(sample.id, input, content);
      // Act / Assert
      expect(
        await repository.updateDescription(other.id, created!.id, "hijack"),
      ).toBeNull();
    },
  );

  pgTest("should remove the row and the blob", async ({ db }) => {
    const { dir, repository, sample } = await arrange(db);
    const created = await repository.create(sample.id, input, content);
    // Act
    const removed = await repository.remove(sample.id, created!.id);
    // Assert
    expect(removed).toBe(true);
    expect(await repository.getContent(sample.id, created!.id)).toBeNull();
    expect(await readdir(dir)).toEqual([]);
  });

  pgTest("should report a missing attachment on remove", async ({ db }) => {
    const { repository, sample } = await arrange(db);
    // Act / Assert
    expect(
      await repository.remove(
        sample.id,
        "00000000-0000-7000-8000-000000000000",
      ),
    ).toBe(false);
  });
});
