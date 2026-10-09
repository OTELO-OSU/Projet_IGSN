import type { SampleStatus } from "../sample/sample.ts";
import type { UserSampleRole } from "./model.ts";

import { isVirtualSample } from "../sample/type/is-virtual-sample.ts";

export function canDeclareSubSample(
  sample: { status: SampleStatus; type: string | null },
  access: { role: UserSampleRole | null; managed: boolean },
): boolean {
  if (isVirtualSample(sample.type)) return false;
  switch (sample.status) {
    case "draft":
      return false;
    case "published":
      return true;
    case "withdrawn":
    case "embargo":
      return access.role !== null || access.managed;
    case "tombstone":
      return access.managed;
  }
}
