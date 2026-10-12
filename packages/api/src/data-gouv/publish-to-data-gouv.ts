import { z } from "zod";

import type { DataGouvConfig } from "./config.ts";
import type { ExportFile } from "./sample-csv-tables.ts";

const TIMEOUT_MS = 60_000;

const resourceSchema = z.object({ id: z.string(), title: z.string() });

const datasetSchema = z.object({
  private: z.boolean().optional(),
  resources: z.array(resourceSchema),
});

async function call(
  config: DataGouvConfig,
  path: string,
  init: Omit<RequestInit, "headers"> & {
    headers?: Record<string, string>;
  } = {},
): Promise<Response> {
  const response = await fetch(`${config.url}/api/1${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "X-API-KEY": config.token,
      ...init.headers,
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(
      `data.gouv.fr answered ${response.status} to ${path}: ${await response.text()}`,
    );
  }
  return response;
}

export async function publishToDataGouv(
  config: DataGouvConfig,
  description: string,
  files: readonly ExportFile[],
): Promise<void> {
  const dataset = `/datasets/${encodeURIComponent(config.datasetId)}`;
  const { private: isPrivate, resources } = datasetSchema.parse(
    await (await call(config, `${dataset}/`)).json(),
  );
  for (const { fileName, content } of files) {
    const isReadme = fileName.endsWith(".txt");
    const resource = resources.find(({ title }) => title === fileName);
    const body = new FormData();
    body.append(
      "file",
      new Blob([content], { type: isReadme ? "text/plain" : "text/csv" }),
      fileName,
    );
    if (resource) {
      await call(config, `${dataset}/resources/${resource.id}/upload/`, {
        method: "POST",
        body,
      });
      continue;
    }
    const { id } = resourceSchema.parse(
      await (
        await call(config, `${dataset}/upload/`, { method: "POST", body })
      ).json(),
    );
    await call(config, `${dataset}/resources/${id}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: fileName,
        type: isReadme ? "documentation" : "main",
      }),
    });
  }
  await call(config, `${dataset}/`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      description,
      private: isPrivate,
    }),
  });
}
