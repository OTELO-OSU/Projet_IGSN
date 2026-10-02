import type { SampleStatus } from "../sample/sample.ts";

import { isMassImportableMaterial } from "../sample/import/is-mass-importable-material.ts";

export function canCreateImportTemplate(sample: {
  status: SampleStatus;
  material: string | null;
}): boolean {
  return (
    (sample.status === "published" || sample.status === "withdrawn") &&
    sample.material !== null &&
    isMassImportableMaterial(sample.material)
  );
}
