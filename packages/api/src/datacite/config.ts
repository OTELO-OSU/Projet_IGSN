import { z } from "zod";

const dataCiteConfigSchema = z.object({
  host: z.string().min(1),
  key: z.string().min(1),
  prefix: z.string().min(1),
});

export type DataCiteConfig = z.infer<typeof dataCiteConfigSchema>;

export function dataCiteConfig(
  env: NodeJS.ProcessEnv = process.env,
): DataCiteConfig | null {
  if (!env.DATACITE_API_HOST) return null;
  return dataCiteConfigSchema.parse({
    host: env.DATACITE_API_HOST.replace(/\/$/, ""),
    key: env.DATACITE_API_KEY,
    prefix: env.DATACITE_DOI_PREFIX,
  });
}
