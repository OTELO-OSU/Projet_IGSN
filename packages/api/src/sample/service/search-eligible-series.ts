import type { SampleParent } from "@projet-igsn/domain/sample/parent/model";
import type { SearchEligibleParentsQuery } from "@projet-igsn/domain/sample/sample-validator";
import type { ModerationScope } from "@projet-igsn/domain/user/moderation-scope";

import { PUBLIC_SAMPLE_STATUSES } from "@projet-igsn/domain/sample/publication/public-sample-statuses";
import { expressionBuilder } from "kysely";

import type { DB } from "../../db.ts";

import { type Transactional } from "../../transaction.ts";
import {
  editableSampleWhere,
  searchSamplePicker,
  virtualSampleWhere,
} from "./search-sample-picker.ts";

export function searchEligibleSeries(
  db: Transactional<DB>,
  { search }: SearchEligibleParentsQuery,
  userId: string,
  scope: ModerationScope | null,
): Promise<SampleParent[]> {
  const eb = expressionBuilder<DB, "sample">();
  return searchSamplePicker(db, search, [
    eb("status", "in", PUBLIC_SAMPLE_STATUSES),
    editableSampleWhere(userId, scope),
    virtualSampleWhere,
  ]);
}
