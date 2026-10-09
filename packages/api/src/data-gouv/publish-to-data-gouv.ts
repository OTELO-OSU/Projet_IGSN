import { z } from "zod";

import type { DataGouvConfig } from "./config.ts";
import type { CsvTable } from "./sample-csv-tables.ts";

const TIMEOUT_MS = 60_000;

const datasetSchema = z.object({
  resources: z.array(z.object({ id: z.string(), title: z.string() })),
});

async function call(
  config: DataGouvConfig,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const response = await fetch(`${config.url}/api/1${path}`, {
    ...init,
    headers: { "X-API-KEY": config.token },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`data.gouv.fr answered ${response.status} to ${path}`);
  }
  return response;
}

export async function publishToDataGouv(
  config: DataGouvConfig,
  tables: readonly CsvTable[],
): Promise<void> {
  const dataset = `/datasets/${encodeURIComponent(config.name)}`;
  const { resources } = datasetSchema.parse(
    await (await call(config, `${dataset}/`)).json(),
  );
  for (const { fileName, csv } of tables) {
    const resource = resources.find(({ title }) => title === fileName);
    const body = new FormData();
    body.append("file", new Blob([csv], { type: "text/csv" }), fileName);
    await call(
      config,
      resource
        ? `${dataset}/resources/${resource.id}/upload/`
        : `${dataset}/upload/`,
      { method: "POST", body },
    );
  }
}
