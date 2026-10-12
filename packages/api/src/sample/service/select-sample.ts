import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import {
  sampleAdditionalRolesQuery,
  sampleAttachmentsQuery,
  sampleChildrenQuery,
  sampleHasSubSamplesQuery,
  sampleLocationQuery,
  sampleManualGroupsQuery,
  sampleMineralClassificationsQuery,
  sampleOwnerQuery,
  sampleParentsQuery,
  sampleSeriesQuery,
  samplePersonAccountsQuery,
  sampleProcessStepsQuery,
  sampleRelationsQuery,
} from "./sample-children-query.ts";

export const selectSample = (db: Transactional<DB>) =>
  db
    .selectFrom("sample")
    .selectAll("sample")
    .select(sampleLocationQuery)
    .select(sampleRelationsQuery)
    .select(sampleProcessStepsQuery)
    .select(sampleMineralClassificationsQuery)
    .select(sampleAdditionalRolesQuery)
    .select(sampleAttachmentsQuery)
    .select(sampleManualGroupsQuery)
    .select(sampleParentsQuery)
    .select(sampleChildrenQuery)
    .select(sampleSeriesQuery)
    .select(sampleHasSubSamplesQuery)
    .select(sampleOwnerQuery)
    .select(samplePersonAccountsQuery);
