import { z } from "zod";

export const stagedUploadSchema = z.strictObject({
  id: z.uuid(),
  name: z.string(),
  mediaType: z.string(),
  size: z.int(),
});

export type StagedUpload = z.infer<typeof stagedUploadSchema>;
