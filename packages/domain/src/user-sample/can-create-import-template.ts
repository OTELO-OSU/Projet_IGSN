import type { SampleStatus } from "../sample/sample.ts";

import { isMassImportableMaterial } from "../sample/import/is-mass-importable-material.ts";
import { PUBLIC_SAMPLE_STATUSES } from "../sample/publication/public-sample-statuses.ts";

export function canCreateImportTemplate(sample: {
  status: SampleStatus;
  material: string | null;
}): boolean {
  return (
    (PUBLIC_SAMPLE_STATUSES as readonly SampleStatus[]).includes(
      sample.status,
    ) &&
    sample.material !== null &&
    isMassImportableMaterial(sample.material)
  );
}
