import type { StagedUploadRepository } from "@projet-igsn/domain/staged-upload/repository";

import { ATTACHMENT_MAX_BYTES } from "@projet-igsn/domain/sample/attachment/attachment-validator";
import { STAGED_UPLOAD_QUOTA_BYTES } from "@projet-igsn/domain/staged-upload/limits";
import { ERRORS, Server } from "@tus/server";
import { v7 as uuidv7 } from "uuid";

import { stagingStoreOf } from "./staged-uploads.ts";

export const OWNER_HEADER = "x-owner-id";

const QUOTA_EXCEEDED = {
  status_code: 413,
  body: "Staging quota exceeded\n",
};

export function createTusServer(
  storageDir: string,
  stagedUploads: StagedUploadRepository,
): Server {
  const datastore = stagingStoreOf(storageDir);
  const ownerOf = (req: Request) => req.headers.get(OWNER_HEADER) ?? "";
  return new Server({
    path: "/admin/samples/import/uploads",
    datastore,
    maxSize: ATTACHMENT_MAX_BYTES,
    namingFunction: () => uuidv7(),
    generateUrl: (_req, { id }) => id,
    onIncomingRequest: async (req, id) => {
      const upload = await datastore.configstore.get(id);
      if (upload && upload.metadata?.ownerId !== ownerOf(req)) {
        throw ERRORS.FILE_NOT_FOUND;
      }
    },
    onUploadCreate: async (req, upload) => {
      if (upload.size === undefined) throw ERRORS.INVALID_LENGTH;
      const ownerId = ownerOf(req);
      if (
        (await stagedUploads.quotaUsed(ownerId)) + upload.size >
        STAGED_UPLOAD_QUOTA_BYTES
      ) {
        throw QUOTA_EXCEEDED;
      }
      return { metadata: { ...upload.metadata, ownerId } };
    },
  });
}
