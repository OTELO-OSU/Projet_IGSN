import { toCoreSample } from "@projet-igsn/domain/sample/core/to-core-sample";
import { toDataCiteSample } from "@projet-igsn/domain/sample/datacite/to-datacite-sample";

import type { DB } from "../db.ts";
import type { DataCiteConfig } from "./config.ts";

import { appUrl } from "../app-url.ts";
import { getSampleById } from "../sample/service/get-sample-by-id.ts";
import { listDoiChildren } from "../sample/service/list-doi-children.ts";
import { type Transactional } from "../transaction.ts";
import { putDoi } from "./put-doi.ts";

export async function syncParentRelations(
  config: DataCiteConfig | null,
  db: Transactional<DB>,
  parentId: string,
): Promise<void> {
  if (!config) return;
  const parent = await getSampleById(db, parentId);
  if (!parent.doiPrefix) return;
  const { doi, relatedIdentifiers } = toDataCiteSample(
    toCoreSample(parent, appUrl("FRONTEND_URL")),
    await listDoiChildren(db, parent.id),
  );
  await putDoi(config, doi, { relatedIdentifiers });
}
