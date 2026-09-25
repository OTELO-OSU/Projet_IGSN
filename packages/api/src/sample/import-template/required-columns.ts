import { isMaterialComplete } from "@projet-igsn/domain/sample/material/is-complete";
import { isPathAtOrUnder } from "@projet-igsn/domain/sample/path/is-at-or-under";
import { PUBLISH_BLOCKER_PATH } from "@projet-igsn/domain/sample/publication/publish-blocker-path";
import {
  samplePublishBlockers,
  toPublishableFields,
} from "@projet-igsn/domain/sample/publication/sample-publish-blockers";
import { createSampleSchema } from "@projet-igsn/domain/sample/sample";
import { isSampleTypeComplete } from "@projet-igsn/domain/sample/type/is-complete";
import { SAMPLE_TYPES } from "@projet-igsn/domain/sample/type/vocabulary";

import type { Column } from "./columns.ts";

import { SAMPLE_COLUMNS, TEMPLATE_MATERIAL_PATHS } from "./columns.ts";
import { CONDITIONAL_FIELDS, conditionOf } from "./conditional-fields.ts";

const HIERARCHIES: Record<
  string,
  { paths: readonly string[]; isComplete: (path: string) => boolean }
> = {
  material: { paths: TEMPLATE_MATERIAL_PATHS, isComplete: isMaterialComplete },
  type: { paths: SAMPLE_TYPES, isComplete: isSampleTypeComplete },
};

const REQUIRED_PATHS = [
  ...(createSampleSchema.safeParse({}).error?.issues ?? []).map(
    (issue) => issue.path,
  ),
  ...samplePublishBlockers(toPublishableFields({})).map(
    (blocker) => PUBLISH_BLOCKER_PATH[blocker],
  ),
].map((path) => path.join("."));

const GOVERNED_PATHS = CONDITIONAL_FIELDS.flatMap((field) =>
  conditionOf(field) === undefined ? [] : field.paths,
);

const parentOf = (path: string) => path.split(".").slice(0, -1).join(".");

function publishFrontier(path: string): number {
  const hierarchy = HIERARCHIES[path];
  if (hierarchy === undefined)
    throw new Error(`No completeness known for the hierarchy ${path}`);
  const { paths, isComplete } = hierarchy;
  return Math.max(
    ...paths
      .filter(
        (candidate) =>
          isComplete(candidate) &&
          (!candidate.includes(".") || !isComplete(parentOf(candidate))),
      )
      .map((candidate) => candidate.split(".").length),
  );
}

const isRequired = ({ path, level }: Column) =>
  path !== undefined &&
  REQUIRED_PATHS.some((required) => isPathAtOrUnder(path, required)) &&
  !GOVERNED_PATHS.some((governed) => isPathAtOrUnder(path, governed)) &&
  (level === undefined || level <= publishFrontier(path));

export const REQUIRED_SAMPLE_COLUMNS: readonly Column[] =
  SAMPLE_COLUMNS.filter(isRequired);
