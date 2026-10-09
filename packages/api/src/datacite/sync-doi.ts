import type { Sample } from "@projet-igsn/domain/sample/sample";

import { tombstonePage } from "@projet-igsn/domain/sample/core/sample-landing-page";
import { toCoreSample } from "@projet-igsn/domain/sample/core/to-core-sample";
import { toDataCiteSample } from "@projet-igsn/domain/sample/datacite/to-datacite-sample";

import type { DB } from "../db.ts";
import type { DataCiteConfig } from "./config.ts";

import { appUrl } from "../app-url.ts";
import { listDoiChildren } from "../sample/service/list-doi-children.ts";
import { type Transactional } from "../transaction.ts";
import { putDoi } from "./put-doi.ts";

export async function syncDoi(
  config: DataCiteConfig | null,
  db: Transactional<DB>,
  sample: Sample,
  { firstRegistration = false }: { firstRegistration?: boolean } = {},
): Promise<void> {
  if (!config || !sample.doiPrefix) return;
  const frontendUrl = appUrl("FRONTEND_URL");
  const record = toDataCiteSample(
    toCoreSample(sample, frontendUrl),
    await listDoiChildren(db, sample.id),
  );
  const url =
    sample.status === "tombstone" ? tombstonePage(frontendUrl) : record.url;
  const event =
    sample.status === "published"
      ? "publish"
      : firstRegistration
        ? "register"
        : "hide";
  await putDoi(config, record.doi, { ...record, url, event });
}
