import type { SampleParent } from "@projet-igsn/domain/sample/parent/model";
import type { ProvenanceStatus } from "@projet-igsn/domain/sample/scientific-context/provenance-status";
import type { UserSampleRole } from "@projet-igsn/domain/user-sample/model";
import type { User } from "@projet-igsn/domain/user/model";

import { soleParent } from "@projet-igsn/domain/sample/parent/sole-parent";
import { isSyntheticMaterial } from "@projet-igsn/domain/sample/synthetic-details/is-synthetic-material";
import { isSampleOwner } from "@projet-igsn/domain/user-sample/is-sample-owner";
import { canEditFrozenSampleFields } from "@projet-igsn/domain/user/can-edit-frozen-sample-fields";

import { publishedSampleFrozenField } from "#/samples/published-sample-frozen-field.ts";

export function resolveSampleFrozenFields({
  isReadOnly,
  wasPublished,
  currentUser,
  provenanceStatus,
  material,
  roleOnSample,
  parents,
}: {
  isReadOnly: boolean;
  wasPublished: boolean;
  currentUser: Pick<User, "status" | "superAdmin"> | undefined;
  provenanceStatus: ProvenanceStatus | null;
  material: string | null;
  roleOnSample: UserSampleRole | null;
  parents: readonly Pick<SampleParent, "material">[];
}): {
  isFieldFrozen: (name: string) => boolean;
  isFrozenByPublication: (name: string) => boolean;
} {
  const bypassesLocks =
    currentUser !== undefined && canEditFrozenSampleFields(currentUser);
  const isFrozenByPublication =
    wasPublished && !bypassesLocks
      ? publishedSampleFrozenField(provenanceStatus, material)
      : () => false;
  const areManualGroupsFrozen =
    roleOnSample !== null && !isSampleOwner(roleOnSample);
  const onlyParent = soleParent(parents);
  const isMaterialFrozenByParent =
    onlyParent !== undefined && isSyntheticMaterial(onlyParent.material);
  const hasTwoParents = parents.length > 1;
  const isFieldFrozen = isReadOnly
    ? () => true
    : (name: string) =>
        isFrozenByPublication(name) ||
        name === "materialPath[0]" ||
        (name === "manualGroupIds" && areManualGroupsFrozen) ||
        (isMaterialFrozenByParent && name.startsWith("materialPath")) ||
        (hasTwoParents && name === "materialPath[1]");
  return { isFieldFrozen, isFrozenByPublication };
}
