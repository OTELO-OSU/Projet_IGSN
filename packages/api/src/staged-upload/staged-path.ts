import { join } from "node:path";

export const stagingDirOf = (storageDir: string) => join(storageDir, "staging");

export const stagedUploadPathOf = (storageDir: string, id: string) =>
  join(stagingDirOf(storageDir), id);
