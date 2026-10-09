import { composeHierarchyValue } from "@projet-igsn/design-system/lib/hierarchy";
import { allowsLocation } from "@projet-igsn/domain/sample/location/allows-location";

import type { SampleDraft } from "#/samples/sample-draft-schema.ts";

export const isLocated = (
  values: Pick<SampleDraft, "parentIds" | "materialPath">,
): boolean =>
  values.parentIds.length === 0 &&
  allowsLocation(composeHierarchyValue(values.materialPath));
