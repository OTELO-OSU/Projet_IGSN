import type {
  CreateSampleAttachment,
  SampleAttachmentRepository,
} from "@projet-igsn/domain/sample/attachment/repository";
import type { Kysely, Selectable } from "kysely";

import {
  type SampleAttachment,
  sampleAttachmentSchema,
} from "@projet-igsn/domain/sample/attachment/model";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { v7 as uuidv7 } from "uuid";

import type { DB } from "../db.ts";

import { withTransaction } from "../transaction.ts";

function toAttachment(
  row: Selectable<DB["sample_attachment"]>,
): SampleAttachment {
  return sampleAttachmentSchema.parse({
    id: row.id,
    name: row.name,
    mediaType: row.media_type,
    description: row.description,
  });
}

// Metadata row in Postgres, content on disk keyed by the row's UUID (ADR 0017):
// no user-controlled path ever reaches the filesystem. Swapping the filesystem
// for Ceph later only touches the fs calls here.
export function createSampleAttachmentRepository(
  db: Kysely<DB>,
  storageDir: string,
): SampleAttachmentRepository {
  const pathFor = (id: string) => join(storageDir, id);

  return {
    create: (
      sampleId: string,
      input: CreateSampleAttachment,
      content: Uint8Array,
    ) =>
      withTransaction(db, async (trx) => {
        const sample = await trx
          .selectFrom("sample")
          .select("id")
          .where("id", "=", sampleId)
          .executeTakeFirst();
        if (!sample) return null;
        const row = await trx
          .insertInto("sample_attachment")
          .values({
            id: uuidv7(),
            sample_id: sampleId,
            name: input.name,
            media_type: input.mediaType,
            description: input.description,
          })
          .returningAll()
          .executeTakeFirstOrThrow();
        // Blob write happens inside the transaction: a failed write rolls the
        // row back. A commit failure can leave an orphan blob; harmless, as
        // nothing references it.
        await mkdir(storageDir, { recursive: true });
        await writeFile(pathFor(row.id), content);
        return toAttachment(row);
      }),

    updateDescription: (
      sampleId: string,
      attachmentId: string,
      description: string | null,
    ) =>
      withTransaction(db, async (trx) => {
        const row = await trx
          .updateTable("sample_attachment")
          .set({ description })
          .where("id", "=", attachmentId)
          .where("sample_id", "=", sampleId)
          .returningAll()
          .executeTakeFirst();
        return row ? toAttachment(row) : null;
      }),

    remove: (sampleId: string, attachmentId: string) =>
      withTransaction(db, async (trx) => {
        const deleted = await trx
          .deleteFrom("sample_attachment")
          .where("id", "=", attachmentId)
          .where("sample_id", "=", sampleId)
          .returningAll()
          .executeTakeFirst();
        if (!deleted) return false;
        await rm(pathFor(deleted.id), { force: true });
        return true;
      }),

    getContent: (sampleId: string, attachmentId: string) =>
      withTransaction(db, async (trx) => {
        const row = await trx
          .selectFrom("sample_attachment")
          .selectAll()
          .where("id", "=", attachmentId)
          .where("sample_id", "=", sampleId)
          .executeTakeFirst();
        if (!row) return null;
        const content = await readFile(pathFor(row.id));
        return {
          attachment: toAttachment(row),
          content: new Uint8Array(content),
        };
      }),
  };
}
