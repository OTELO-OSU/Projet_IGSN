import { STAGED_UPLOAD_TTL_MS } from "@projet-igsn/domain/staged-upload/limits";
import { FileKvStore } from "@tus/server";
import { mkdtemp, readdir, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { seedStagedUpload } from "../tests/seed-staged-upload.ts";
import { stagedUploadPathOf, stagingDirOf } from "./staged-path.ts";
import { consumeStagedUploads, createStagedUploads } from "./staged-uploads.ts";

const OWNER = "01890a5d-ac96-774b-82d4-b302099a9f01";
const FOREIGN = "01890a5d-ac96-774b-82d4-b302099a9f02";
const STALE_MS = STAGED_UPLOAD_TTL_MS + 60_000;

let storageDir = "";

beforeEach(async () => {
  storageDir = await mkdtemp(join(tmpdir(), "staged-uploads-"));
});

afterEach(() => rm(storageDir, { recursive: true, force: true }));

const stagedFiles = async () =>
  (await readdir(stagingDirOf(storageDir))).sort();

describe("staged uploads", () => {
  it("should answer the caller's complete uploads with their name, media type and size", async () => {
    const typed = await seedStagedUpload(storageDir, { ownerId: OWNER });
    const untyped = await seedStagedUpload(storageDir, {
      ownerId: OWNER,
      filetype: "",
    });

    expect(
      await createStagedUploads(storageDir).findCompleteOwned(
        [typed, untyped],
        OWNER,
      ),
    ).toEqual([
      { id: typed, name: "report.pdf", mediaType: "application/pdf" },
      {
        id: untyped,
        name: "report.pdf",
        mediaType: "application/octet-stream",
      },
    ]);
  });

  it.each([
    { kind: "foreign", seed: { ownerId: FOREIGN } },
    { kind: "incomplete", seed: { ownerId: OWNER, written: 2 } },
    { kind: "expired", seed: { ownerId: OWNER, ageMs: STALE_MS } },
  ])("should leave out a $kind upload", async ({ seed }) => {
    const id = await seedStagedUpload(storageDir, seed);

    expect(
      await createStagedUploads(storageDir).findCompleteOwned([id], OWNER),
    ).toEqual([]);
  });

  it("should sum the declared sizes of the owner's uploads, finished or not", async () => {
    await seedStagedUpload(storageDir, { ownerId: OWNER, size: 4 });
    await seedStagedUpload(storageDir, {
      ownerId: OWNER,
      size: 6,
      written: 1,
    });
    await seedStagedUpload(storageDir, { ownerId: FOREIGN, size: 100 });

    expect(await createStagedUploads(storageDir).quotaUsed(OWNER)).toBe(10);
  });

  it("should read each upload's info once across quota checks, dropping consumed uploads", async () => {
    const stagedUploads = createStagedUploads(storageDir);
    await seedStagedUpload(storageDir, { ownerId: OWNER, size: 4 });
    const consumed = await seedStagedUpload(storageDir, {
      ownerId: OWNER,
      size: 5,
    });
    await stagedUploads.quotaUsed(OWNER);
    await seedStagedUpload(storageDir, { ownerId: OWNER, size: 6 });
    await consumeStagedUploads(storageDir, [consumed]);
    const reads = vi.spyOn(FileKvStore.prototype, "get");

    expect(await stagedUploads.quotaUsed(OWNER)).toBe(10);
    expect(reads).toHaveBeenCalledOnce();
  });

  it("should reap stale uploads, finished or not, and keep fresh and in-progress ones", async () => {
    await seedStagedUpload(storageDir, {
      ownerId: OWNER,
      written: 2,
      ageMs: STALE_MS,
    });
    await seedStagedUpload(storageDir, { ownerId: OWNER, ageMs: STALE_MS });
    const fresh = await seedStagedUpload(storageDir, { ownerId: OWNER });
    const inProgress = await seedStagedUpload(storageDir, {
      ownerId: OWNER,
      written: 2,
    });

    await createStagedUploads(storageDir).deleteExpired();

    expect(await stagedFiles()).toEqual(
      [fresh, `${fresh}.json`, inProgress, `${inProgress}.json`].sort(),
    );
  });

  it("should consume staged uploads whose blob was already moved", async () => {
    const moved = await seedStagedUpload(storageDir, { ownerId: OWNER });
    const kept = await seedStagedUpload(storageDir, { ownerId: OWNER });
    await rename(
      stagedUploadPathOf(storageDir, moved),
      join(storageDir, "moved"),
    );

    await consumeStagedUploads(storageDir, [moved, kept]);

    expect(await stagedFiles()).toEqual([]);
  });
});
