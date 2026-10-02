import { z } from "zod";

export const stagedUploadSchema = z.strictObject({
  id: z.uuid(),
  name: z.string(),
  mediaType: z.string(),
});

export type StagedUpload = z.infer<typeof stagedUploadSchema>;
