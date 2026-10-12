import { z } from "zod";

const dataGouvConfigSchema = z.object({
  url: z.string().min(1),
  datasetId: z.string().min(1),
  token: z.string().min(1),
});

export type DataGouvConfig = z.infer<typeof dataGouvConfigSchema>;

export function dataGouvConfig(
  env: NodeJS.ProcessEnv = process.env,
): DataGouvConfig | null {
  if (!env.DATA_GOUV_URL) return null;
  return dataGouvConfigSchema.parse({
    url: env.DATA_GOUV_URL.replace(/\/$/, ""),
    datasetId: env.DATA_GOUV_DATASET_ID,
    token: env.DATA_GOUV_TOKEN,
  });
}
