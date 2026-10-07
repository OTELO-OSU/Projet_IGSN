import type { SampleStatus } from "../sample/sample.ts";
import type { UserSampleRole } from "./model.ts";

export function canDeclareSubSample(
  sample: { status: SampleStatus },
  access: { role: UserSampleRole | null; managed: boolean },
): boolean {
  switch (sample.status) {
    case "draft":
    case "publishing":
    case "publish_failed":
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
