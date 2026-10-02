import type { CreateSampleAttachment } from "@projet-igsn/domain/sample/attachment/repository";
import type { Selectable } from "kysely";

import { constants } from "node:fs";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { v7 as uuidv7 } from "uuid";

import type { DB } from "../../db.ts";
import type { Transactional } from "../../transaction.ts";

export const attachmentDirOf = (storageDir: string, sampleId: string) =>
  join(storageDir, sampleId);

export const attachmentPathOf = (
  storageDir: string,
  sampleId: string,
  id: string,
  name: string,
) =>
  join(
    attachmentDirOf(storageDir, sampleId),
    `${id}-${name.replace(/[^\w.-]/g, "_").slice(0, 100)}`,
  );

export async function insertSampleAttachment(
  trx: Transactional<DB>,
  storageDir: string,
  sampleId: string,
  input: CreateSampleAttachment,
  content: Uint8Array | { from: string },
): Promise<Selectable<DB["sample_attachment"]>> {
  const row = await trx
    .insertInto("sample_attachment")
    .values({
      id: uuidv7(),
      sample_id: sampleId,
      name: input.name,
      media_type: input.mediaType,
      title: input.title,
      target_resource_type: input.targetResourceType,
      description: input.description,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  await mkdir(attachmentDirOf(storageDir, sampleId), { recursive: true });
  const path = attachmentPathOf(storageDir, sampleId, row.id, row.name);
  if (content instanceof Uint8Array) {
    await writeFile(path, content);
  } else {
    await copyFile(content.from, path, constants.COPYFILE_FICLONE);
  }
  return row;
}
