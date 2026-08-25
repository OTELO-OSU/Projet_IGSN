import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import {
  sampleAttachmentsQuery,
  sampleLinksQuery,
  sampleManualGroupsQuery,
} from "./sample-children-query.ts";

export const selectSample = (db: Transactional<DB>) =>
  db
    .selectFrom("sample")
    .selectAll("sample")
    .select(sampleLinksQuery)
    .select(sampleAttachmentsQuery)
    .select(sampleManualGroupsQuery);
