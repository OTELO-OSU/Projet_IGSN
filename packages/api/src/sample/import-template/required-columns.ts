import { DEFAULT_AVAILABILITY_STATUS } from "@projet-igsn/domain/sample/curation/availability-status";
import { DEFAULT_EXISTENCE_STATUS } from "@projet-igsn/domain/sample/curation/existence-status";
import { isMaterialComplete } from "@projet-igsn/domain/sample/material/is-complete";
import { isPathAtOrUnder } from "@projet-igsn/domain/sample/path/is-at-or-under";
import { parentPath } from "@projet-igsn/domain/sample/path/parent";
import { PUBLISH_BLOCKER_PATH } from "@projet-igsn/domain/sample/publication/publish-blocker-path";
import {
  samplePublishBlockers,
  toPublishableFields,
} from "@projet-igsn/domain/sample/publication/sample-publish-blockers";
import { createSampleSchema } from "@projet-igsn/domain/sample/sample";

import type { Column } from "./columns.ts";

import { SAMPLE_COLUMNS, TEMPLATE_MATERIAL_PATHS } from "./columns.ts";
import { CONDITIONAL_FIELDS, conditionOf } from "./conditional-fields.ts";

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

const MATERIAL_PUBLISH_FRONTIER = Math.max(
  ...TEMPLATE_MATERIAL_PATHS.filter(
    (candidate) =>
      isMaterialComplete(candidate) &&
      (!candidate.includes(".") || !isMaterialComplete(parentPath(candidate))),
  ).map((candidate) => candidate.split(".").length),
);

const REQUIRED_LEVELS: Readonly<Record<string, number>> = {
  material: MATERIAL_PUBLISH_FRONTIER,
  type: 1,
};

function requiredLevel(path: string): number {
  const level = REQUIRED_LEVELS[path];
  if (level === undefined)
    throw new Error(`No required level known for the hierarchy ${path}`);
  return level;
}

export const IMPORT_DEFAULTS: Readonly<Record<string, string>> = {
  existenceStatus: DEFAULT_EXISTENCE_STATUS,
  availabilityStatus: DEFAULT_AVAILABILITY_STATUS,
};

const isRequired = ({ path, level }: Column) =>
  path !== undefined &&
  !(path in IMPORT_DEFAULTS) &&
  REQUIRED_PATHS.some((required) => isPathAtOrUnder(path, required)) &&
  !GOVERNED_PATHS.some((governed) => isPathAtOrUnder(path, governed)) &&
  (level === undefined || level <= requiredLevel(path));

export const REQUIRED_SAMPLE_COLUMNS: readonly Column[] =
  SAMPLE_COLUMNS.filter(isRequired);
