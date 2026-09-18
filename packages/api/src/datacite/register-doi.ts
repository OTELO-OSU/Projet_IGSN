import type { Sample } from "@projet-igsn/domain/sample/sample";

import { toCoreSample } from "@projet-igsn/domain/sample/core/to-core-sample";
import { toDataCiteSample } from "@projet-igsn/domain/sample/datacite/to-datacite-sample";
import { HTTPException } from "hono/http-exception";

import { appUrl } from "../app-url.ts";
import { dataCiteConfig } from "./config.ts";

const REGISTRATION_TIMEOUT_MS = 10_000;

export async function registerDoi(
  sample: Sample,
  event: "publish" | "register",
): Promise<void> {
  const config = dataCiteConfig();
  if (!config || !sample.doiPrefix || !sample.igsn) return;
  const record = toDataCiteSample(toCoreSample(sample, appUrl("FRONTEND_URL")));
  try {
    const response = await fetch(`${config.host}/dois/${record.doi}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: { type: "dois", attributes: { ...record, event } },
      }),
      signal: AbortSignal.timeout(REGISTRATION_TIMEOUT_MS),
    });
    if (response.ok) return;
    console.error("DOI registration refused", {
      doi: record.doi,
      status: response.status,
      body: await response.text(),
    });
  } catch (error) {
    console.error("DOI registration request failed", {
      doi: record.doi,
      error,
    });
  }
  throw new HTTPException(502, { message: "DOI registration failed" });
}
