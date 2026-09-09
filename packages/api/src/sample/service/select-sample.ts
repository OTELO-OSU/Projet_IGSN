import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import {
  sampleAttachmentsQuery,
  sampleLocationQuery,
  sampleManualGroupsQuery,
  sampleParentsQuery,
  sampleRelationsQuery,
} from "./sample-children-query.ts";

export const selectSample = (db: Transactional<DB>) =>
  db
    .selectFrom("sample")
    .selectAll("sample")
    .select(sampleLocationQuery)
    .select(sampleRelationsQuery)
    .select(sampleAttachmentsQuery)
    .select(sampleManualGroupsQuery)
    .select(sampleParentsQuery);
