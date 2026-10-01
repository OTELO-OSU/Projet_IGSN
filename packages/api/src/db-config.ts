import { z } from "zod";

const dbConfigSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().default(5432),
  database: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  ssl: z.enum(["require", "verify-full"]).optional(),
  max: z.coerce.number().int().positive().optional(),
});

const CONNECTION_PARAMETERS = { jit: "off", random_page_cost: 1.1 } as const;

type DbConfig = z.infer<typeof dbConfigSchema> & {
  connection: typeof CONNECTION_PARAMETERS;
};

export function dbConfig(env: NodeJS.ProcessEnv = process.env): DbConfig {
  const { max, ...config } = dbConfigSchema.parse({
    host: env.DATABASE_HOST,
    port: env.DATABASE_PORT || undefined,
    database: env.DATABASE_NAME,
    username: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
    ssl: env.DATABASE_SSL,
    max: env.DATABASE_POOL_MAX || undefined,
  });
  return { ...config, ...(max && { max }), connection: CONNECTION_PARAMETERS };
}
