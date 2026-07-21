import type { Kysely } from "kysely";

import { readdir } from "node:fs/promises";
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

// The real dev folder (gitignored), not a temp dir: uploaded blobs stay
// inspectable after a run. Blob names are uuid-prefixed, so tests never collide.
const dir = join(import.meta.dirname, "..", "..", "attachments");

async function arrange(db: Kysely<DB>) {
  const repository = createSampleAttachmentRepository(db, dir);
  const sample = await insertSample(db, {
    name: "Attached sample",
    nature: "hand_sample",
    type: null,
  });
  return { repository, sample };
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

  pgTest(
    "should store the blob under a readable debug name",
    async ({ db }) => {
      const { repository, sample } = await arrange(db);
      // Act
      const created = await repository.create(sample.id, input, content);
      // Assert: blobs are grouped in a per-sample folder.
      expect(await readdir(join(dir, sample.id))).toContain(
        `${created!.id}-measurements.csv`,
      );
    },
  );

  pgTest(
    "should keep two attachments with the same file name",
    async ({ db }) => {
      const { repository, sample } = await arrange(db);
      // Act
      const first = await repository.create(sample.id, input, content);
      const second = await repository.create(sample.id, input, content);
      // Assert: the uuid prefix keeps the blobs apart on disk.
      expect(second!.id).not.toBe(first!.id);
      const files = await readdir(join(dir, sample.id));
      expect(files).toContain(`${first!.id}-measurements.csv`);
      expect(files).toContain(`${second!.id}-measurements.csv`);
    },
  );

  pgTest("should remove the row and the blob", async ({ db }) => {
    const { repository, sample } = await arrange(db);
    const created = await repository.create(sample.id, input, content);
    // Act
    const removed = await repository.remove(sample.id, created!.id);
    // Assert
    expect(removed).toBe(true);
    expect(await repository.getContent(sample.id, created!.id)).toBeNull();
    expect(await readdir(join(dir, sample.id))).not.toContain(
      `${created!.id}-measurements.csv`,
    );
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

  pgTest(
    "should reconcile: update listed descriptions, remove unlisted rows and blobs",
    async ({ db }) => {
      const { repository, sample } = await arrange(db);
      const kept = await repository.create(sample.id, input, content);
      const dropped = await repository.create(
        sample.id,
        { ...input, name: "photo.jpg", mediaType: "image/jpeg" },
        content,
      );
      // Act
      await repository.reconcile(sample.id, [
        { id: kept!.id, description: "Calibrated measurements" },
      ]);
      // Assert
      expect((await getSample(db, sample.id))?.attachments).toEqual([
        { ...kept, description: "Calibrated measurements" },
      ]);
      expect(await readdir(join(dir, sample.id))).not.toContain(
        `${dropped!.id}-photo.jpg`,
      );
    },
  );

  pgTest(
    "should reconcile an empty list by removing every attachment",
    async ({ db }) => {
      const { repository, sample } = await arrange(db);
      const created = await repository.create(sample.id, input, content);
      // Act
      await repository.reconcile(sample.id, []);
      // Assert
      expect((await getSample(db, sample.id))?.attachments).toEqual([]);
      expect(await readdir(join(dir, sample.id))).not.toContain(
        `${created!.id}-measurements.csv`,
      );
    },
  );

  pgTest(
    "should not touch another sample's attachments on reconcile",
    async ({ db }) => {
      const { repository, sample } = await arrange(db);
      const other = await insertSample(db, {
        name: "Other sample",
        nature: "hand_sample",
        type: null,
      });
      const created = await repository.create(sample.id, input, content);
      const otherCreated = await repository.create(other.id, input, content);
      // Act: reconciling `other` with the foreign id neither hijacks it nor
      // keeps it; the foreign attachment simply is not other's to keep.
      await repository.reconcile(other.id, [
        { id: created!.id, description: "hijack" },
      ]);
      // Assert
      expect((await getSample(db, sample.id))?.attachments).toEqual([created]);
      expect((await getSample(db, other.id))?.attachments).toEqual([]);
      expect(otherCreated).not.toBeNull();
    },
  );
});
