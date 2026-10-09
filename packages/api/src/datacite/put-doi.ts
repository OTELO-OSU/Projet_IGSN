import { HTTPException } from "hono/http-exception";

import type { DataCiteConfig } from "./config.ts";

const SYNC_TIMEOUT_MS = 10_000;

export async function putDoi(
  config: DataCiteConfig,
  doi: string,
  attributes: Record<string, unknown>,
): Promise<void> {
  try {
    const response = await fetch(`${config.host}/dois/${doi}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: { type: "dois", attributes } }),
      signal: AbortSignal.timeout(SYNC_TIMEOUT_MS),
    });
    if (!response.ok)
      throw new Error(
        `DataCite registration failed (HTTP ${response.status})`,
        {
          cause: await response.text(),
        },
      );
  } catch (error) {
    console.error("DOI sync failed", { doi, error });
    throw new HTTPException(502, { message: "DOI sync failed", cause: error });
  }
}
