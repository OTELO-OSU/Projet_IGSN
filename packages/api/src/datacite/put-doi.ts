import { HTTPException } from "hono/http-exception";

import type { DataCiteConfig } from "./config.ts";

const SYNC_TIMEOUT_MS = 10_000;

export class DataCiteRefusal extends Error {
  readonly status: number;

  constructor(status: number, body: string) {
    super(`DataCite registration failed (HTTP ${status})`, { cause: body });
    this.status = status;
  }
}

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
      throw new DataCiteRefusal(response.status, await response.text());
  } catch (error) {
    console.error("DOI sync failed", { doi, error });
    throw new HTTPException(502, { message: "DOI sync failed", cause: error });
  }
}
