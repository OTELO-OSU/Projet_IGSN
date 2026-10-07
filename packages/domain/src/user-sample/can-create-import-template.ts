import type { SampleStatus } from "../sample/sample.ts";

import { isMassImportableMaterial } from "../sample/import/is-mass-importable-material.ts";

export function canCreateImportTemplate(sample: {
  status: SampleStatus;
  material: string | null;
}): boolean {
  return (
    ["published", "withdrawn", "embargo"].includes(sample.status) &&
    sample.material !== null &&
    isMassImportableMaterial(sample.material)
  );
}
