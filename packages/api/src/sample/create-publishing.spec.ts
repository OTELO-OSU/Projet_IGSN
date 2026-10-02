import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect } from "vitest";

import { stagingDirOf } from "../staged-upload/staged-path.ts";
import { pgTest } from "../tests/pg-test.ts";
import { publishableSample } from "../tests/sample-fixtures.ts";
import { seedStagedUpload } from "../tests/seed-staged-upload.ts";
import { createUserRepository } from "../user/repository.ts";
import { createSampleRepository } from "./repository.ts";

let attachmentsDir = "";

beforeEach(async () => {
  attachmentsDir = await mkdtemp(join(tmpdir(), "create-publishing-"));
});

afterEach(() => rm(attachmentsDir, { recursive: true, force: true }));

const attachment = (stagedId: string) => ({
  input: {
    name: "report.pdf",
    mediaType: "application/pdf",
    title: null,
    targetResourceType: null,
    description: null,
  },
  stagedId,
});

describe("createPublishing", () => {
  pgTest(
    "should keep every staged upload when a later sample fails, so the import can be retried with the same ids",
    async ({ db }) => {
      const owner = await createUserRepository(db).upsert({
        email: "owner@example.com",
        name: null,
        firstname: null,
      });
      const staged = await seedStagedUpload(attachmentsDir, {
        ownerId: owner.id,
      });
      const sample = (stagedId: string) => ({
        input: publishableSample,
        internalNumber: null,
        attachments: [attachment(stagedId)],
      });

      await expect(
        createSampleRepository(db, attachmentsDir).createPublishing(
          [sample(staged), sample(crypto.randomUUID())],
          owner,
        ),
      ).rejects.toThrow();

      expect((await readdir(stagingDirOf(attachmentsDir))).sort()).toEqual(
        [staged, `${staged}.json`].sort(),
      );
    },
  );
});
