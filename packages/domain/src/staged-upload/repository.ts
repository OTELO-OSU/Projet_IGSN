import type { StagedUpload } from "./model.ts";

export type StagedUploadRepository = {
  findCompleteOwned(ids: string[], ownerId: string): Promise<StagedUpload[]>;
  quotaUsed(ownerId: string): Promise<number>;
  deleteExpired(): Promise<number>;
};
