import { z } from "zod";

const dbConfigSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().default(5432),
  database: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  ssl: z.enum(["require", "verify-full"]).optional(),
});

type DbConfig = z.infer<typeof dbConfigSchema>;

export function dbConfig(env: NodeJS.ProcessEnv = process.env): DbConfig {
  return dbConfigSchema.parse({
    host: env.DATABASE_HOST,
    port: env.DATABASE_PORT || undefined,
    database: env.DATABASE_NAME,
    username: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
    ssl: env.DATABASE_SSL,
  });
}
