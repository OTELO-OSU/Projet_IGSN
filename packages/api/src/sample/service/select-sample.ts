import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import {
  sampleAttachments,
  sampleLinks,
  sampleManualGroups,
} from "./sample-children.ts";

export const selectSample = (db: Transactional<DB>) =>
  db
    .selectFrom("sample")
    .selectAll("sample")
    .select(sampleLinks)
    .select(sampleAttachments)
    .select(sampleManualGroups);
