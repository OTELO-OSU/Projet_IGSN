import type { Sample } from "@projet-igsn/domain/sample/sample";

import { toCoreSample } from "@projet-igsn/domain/sample/core/to-core-sample";
import { toDataCiteSample } from "@projet-igsn/domain/sample/datacite/to-datacite-sample";
import { HTTPException } from "hono/http-exception";

import type { DataCiteConfig } from "./config.ts";

import { appUrl } from "../app-url.ts";

const SYNC_TIMEOUT_MS = 10_000;

export async function syncDoi(
  config: DataCiteConfig | null,
  sample: Sample,
  event: "publish" | "register" | "hide" = sample.status === "published"
    ? "publish"
    : "hide",
): Promise<void> {
  if (!config || !sample.doiPrefix) return;
  const frontendUrl = appUrl("FRONTEND_URL");
  const record = toDataCiteSample(toCoreSample(sample, frontendUrl));
  const url =
    sample.status === "tombstone" ? `${frontendUrl}tombstone` : record.url;
  try {
    const response = await fetch(`${config.host}/dois/${record.doi}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: { type: "dois", attributes: { ...record, url, event } },
      }),
      signal: AbortSignal.timeout(SYNC_TIMEOUT_MS),
    });
    if (!response.ok)
      throw new Error(`${response.status} ${await response.text()}`);
  } catch (error) {
    console.error("DOI sync failed", { doi: record.doi, error });
    throw new HTTPException(502, { message: "DOI sync failed" });
  }
}
