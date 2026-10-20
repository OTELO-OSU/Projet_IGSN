import type { Sample } from "@projet-igsn/domain/sample/sample";

import { toHierarchyPath } from "@projet-igsn/design-system/lib/hierarchy";
import {
  TEMPLATE_FIELDS,
  type TemplateFieldKey,
} from "@projet-igsn/domain/sample/import/template-fields";
import { MATERIAL_ROOTS } from "@projet-igsn/domain/sample/material/classification";

import type { TemplateDialogValues } from "#/samples/customize-template-dialog.tsx";

const TEMPLATE_MATERIAL_DEPTH = 3;

const SAMPLE_PATH_OVERRIDES: Partial<
  Record<TemplateFieldKey, readonly string[]>
> = {
  manualGroup: ["manualGroups"],
  collector: [
    "scientificContext.collectorFirstname",
    "scientificContext.collectorLastname",
    "scientificContext.collectorUserId",
  ],
  chiefScientist: [
    "scientificContext.chiefScientistFirstname",
    "scientificContext.chiefScientistLastname",
    "scientificContext.chiefScientistUserId",
  ],
};

const hasData = (value: unknown): boolean =>
  Array.isArray(value)
    ? value.length > 0
    : typeof value === "object" && value !== null
      ? Object.values(value).some(hasData)
      : value != null;

const valueAt = (sample: Sample, path: string): unknown =>
  path
    .split(".")
    .reduce<unknown>(
      (value, segment) =>
        typeof value === "object" && value !== null
          ? (value as Record<string, unknown>)[segment]
          : undefined,
      sample,
    );

export function templateCustomizationOfSample(
  sample: Sample,
): TemplateDialogValues {
  return {
    materialPath: toHierarchyPath(
      (sample.material ?? MATERIAL_ROOTS[0])
        .split(".")
        .slice(0, TEMPLATE_MATERIAL_DEPTH)
        .join("."),
    ),
    groupId: sample.manualGroups[0]?.id ?? "",
    provenanceValue: sample.scientificContext?.provenanceStatus ?? "",
    subSamples: sample.parents.length > 0,
    fields: Object.fromEntries(
      TEMPLATE_FIELDS.map(({ key, paths }) => [
        key,
        (SAMPLE_PATH_OVERRIDES[key] ?? paths).some((path) =>
          hasData(valueAt(sample, path)),
        ),
      ]),
    ) as Record<TemplateFieldKey, boolean>,
  };
}
