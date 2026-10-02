import type { Sample } from "@projet-igsn/domain/sample/sample";

import { toHierarchyPath } from "@projet-igsn/design-system/lib/hierarchy";
import { MATERIAL_ROOTS } from "@projet-igsn/domain/sample/material/classification";

import type { TemplateDialogValues } from "#/samples/customize-template-dialog.tsx";

const TEMPLATE_MATERIAL_DEPTH = 3;

const hasData = (fields: object | null | undefined): boolean =>
  fields != null &&
  Object.values(fields).some(
    (value) => value != null && !(Array.isArray(value) && value.length === 0),
  );

export function templateCustomizationOfSample(
  sample: Sample,
): TemplateDialogValues {
  const { collectionDate: _collectionDate, ...physicalDescription } =
    sample.description ?? {};
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
    sections: {
      physicalDescription: hasData(physicalDescription),
      age: hasData(sample.age),
      conservationSecurity:
        hasData(sample.condition) || hasData(sample.security),
      repository:
        sample.existenceStatus != null ||
        sample.availabilityStatus != null ||
        hasData(sample.repository),
      relatedDocuments: sample.relations.length > 0,
      geologicalContext:
        sample.geologicalContextDescription != null ||
        sample.physiographicEnvironment != null,
    },
  };
}
