import type { TemplateSectionKey } from "@projet-igsn/domain/sample/import/import-validator";

import { toHierarchyPath } from "@projet-igsn/design-system/lib/hierarchy";
import { MATERIAL_ROOTS } from "@projet-igsn/domain/sample/material/classification";
import { useState } from "react";

import type { TemplateDialogValues } from "#/samples/customize-template-dialog.tsx";

const ALL_SECTIONS: Record<TemplateSectionKey, boolean> = {
  physicalDescription: true,
  age: true,
  conservationSecurity: true,
  repository: true,
  relatedDocuments: true,
  geologicalContext: true,
};

export function useTemplateCustomization(initialValues?: TemplateDialogValues) {
  const [materialPath, setMaterialPath] = useState<string[]>(
    () => initialValues?.materialPath ?? toHierarchyPath(MATERIAL_ROOTS[0]),
  );
  const [groupId, setGroupId] = useState(initialValues?.groupId ?? "");
  const [provenanceValue, setProvenanceValue] = useState(
    initialValues?.provenanceValue ?? "",
  );
  const [subSamples, setSubSamples] = useState(
    initialValues?.subSamples ?? false,
  );
  const [sections, setSections] = useState(
    initialValues?.sections ?? ALL_SECTIONS,
  );
  const [isReserving, setIsReserving] = useState(false);
  const [reserveCount, setReserveCount] = useState("250");
  return {
    materialPath,
    setMaterialPath,
    groupId,
    setGroupId,
    provenanceValue,
    setProvenanceValue,
    subSamples,
    setSubSamples,
    sections,
    setSections,
    isReserving,
    setIsReserving,
    reserveCount,
    setReserveCount,
  };
}
