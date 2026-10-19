import { toHierarchyPath } from "@projet-igsn/design-system/lib/hierarchy";
import { TEMPLATE_FIELD_KEYS } from "@projet-igsn/domain/sample/import/template-fields";
import { MATERIAL_ROOTS } from "@projet-igsn/domain/sample/material/classification";
import { useState } from "react";

import type { TemplateDialogValues } from "#/samples/customize-template-dialog.tsx";

const ALL_FIELDS = Object.fromEntries(
  TEMPLATE_FIELD_KEYS.map((key) => [key, true]),
) as TemplateDialogValues["fields"];

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
  const [fields, setFields] = useState(initialValues?.fields ?? ALL_FIELDS);
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
    fields,
    setFields,
    isReserving,
    setIsReserving,
    reserveCount,
    setReserveCount,
  };
}
