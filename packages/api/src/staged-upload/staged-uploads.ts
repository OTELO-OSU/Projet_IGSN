import type { StagedUpload } from "@projet-igsn/domain/staged-upload/model";
import type { StagedUploadRepository } from "@projet-igsn/domain/staged-upload/repository";

import { STAGED_UPLOAD_TTL_MS } from "@projet-igsn/domain/staged-upload/limits";
import { FileStore } from "@tus/file-store";
import { FileKvStore, type Upload } from "@tus/server";
import { rm, stat } from "node:fs/promises";
import { join } from "node:path";

import { stagedUploadPathOf, stagingDirOf } from "./staged-path.ts";

export const stagingStoreOf = (storageDir: string): FileStore =>
  new FileStore({
    directory: stagingDirOf(storageDir),
    configstore: new FileKvStore<Upload>(stagingDirOf(storageDir)),
    expirationPeriodInMilliseconds: STAGED_UPLOAD_TTL_MS,
  });

export const consumeStagedUploads = async (
  storageDir: string,
  ids: string[],
): Promise<void> => {
  await Promise.all(
    ids.flatMap((id) => [
      rm(join(stagingDirOf(storageDir), `${id}.json`), { force: true }),
      rm(stagedUploadPathOf(storageDir, id), { force: true }),
    ]),
  );
};

export function createStagedUploads(
  storageDir: string,
): StagedUploadRepository {
  const store = stagingStoreOf(storageDir);
  const { configstore } = store;

  const stateOf = async (id: string) => {
    const [info, data] = await Promise.all([
      configstore.get(id),
      stat(stagedUploadPathOf(storageDir, id)).catch(() => undefined),
    ]);
    return info && data
      ? {
          info,
          isComplete: data.size === info.size,
          isStale: Date.now() - data.mtimeMs > STAGED_UPLOAD_TTL_MS,
        }
      : undefined;
  };

  const listIds = async () => (await configstore.list?.()) ?? [];

  const completeOwned = async (
    id: string,
    ownerId: string,
  ): Promise<StagedUpload[]> => {
    const state = await stateOf(id);
    const metadata = state?.info.metadata;
    return state?.isComplete &&
      !state.isStale &&
      metadata?.ownerId === ownerId &&
      metadata.filename
      ? [
          {
            id,
            name: metadata.filename,
            mediaType: metadata.filetype || "application/octet-stream",
            size: state.info.size ?? 0,
          },
        ]
      : [];
  };

  return {
    findCompleteOwned: async (ids, ownerId) =>
      (await Promise.all(ids.map((id) => completeOwned(id, ownerId)))).flat(),
    // ponytail: an O(n) info scan per create, and racing creates over-admit at most one upload; an index if staging grows.
    quotaUsed: async (ownerId) =>
      (await Promise.all((await listIds()).map((id) => configstore.get(id))))
        .filter((info) => info?.metadata?.ownerId === ownerId)
        .reduce((sum, info) => sum + (info?.size ?? 0), 0),
    deleteExpired: async () => {
      const unfinished = await store.deleteExpired();
      const stale = (
        await Promise.all(
          (
            await listIds()
          ).map(async (id) => {
            const state = await stateOf(id);
            return state?.isComplete && state.isStale ? [id] : [];
          }),
        )
      ).flat();
      await consumeStagedUploads(storageDir, stale);
      return unfinished + stale.length;
    },
  };
}
