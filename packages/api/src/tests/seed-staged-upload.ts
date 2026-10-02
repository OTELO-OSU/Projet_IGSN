import { FileKvStore, Upload } from "@tus/server";
import { mkdir, utimes, writeFile } from "node:fs/promises";
import { v7 as uuidv7 } from "uuid";

import {
  stagedUploadPathOf,
  stagingDirOf,
} from "../staged-upload/staged-path.ts";

export async function seedStagedUpload(
  storageDir: string,
  {
    ownerId,
    size = 4,
    written = size,
    ageMs = 0,
    filetype = "application/pdf",
  }: {
    ownerId: string;
    size?: number;
    written?: number;
    ageMs?: number;
    filetype?: string;
  },
): Promise<string> {
  const id = uuidv7();
  const touchedAt = new Date(Date.now() - ageMs);
  await mkdir(stagingDirOf(storageDir), { recursive: true });
  await new FileKvStore<Upload>(stagingDirOf(storageDir)).set(
    id,
    new Upload({
      id,
      size,
      offset: written,
      metadata: { ownerId, filename: "report.pdf", filetype },
      creation_date: touchedAt.toISOString(),
    }),
  );
  const path = stagedUploadPathOf(storageDir, id);
  await writeFile(path, new Uint8Array(written));
  await utimes(path, touchedAt, touchedAt);
  return id;
}
