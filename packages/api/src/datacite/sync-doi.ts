import type { Sample } from "@projet-igsn/domain/sample/sample";

import { toCoreSample } from "@projet-igsn/domain/sample/core/to-core-sample";
import { toDataCiteSample } from "@projet-igsn/domain/sample/datacite/to-datacite-sample";
import { HTTPException } from "hono/http-exception";

import type { DataCiteConfig } from "./config.ts";

import { appUrl } from "../app-url.ts";

const SYNC_TIMEOUT_MS = 10_000;

export type DoiEvent = "publish" | "register" | "hide";

// hide moves a findable DOI to registered and does nothing to a registered one; register only works on a DOI DataCite has never seen, so publishSample alone sends it.
const doiEvent = (status: Sample["status"]): DoiEvent =>
  status === "published" ? "publish" : "hide";

export async function syncDoi(
  config: DataCiteConfig | null,
  sample: Sample,
  event: DoiEvent = doiEvent(sample.status),
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
