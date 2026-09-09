import type { SampleStatus } from "../sample/sample.ts";
import type { UserSampleRole } from "./model.ts";

export function canDeclareSubSample(
  sample: { status: SampleStatus },
  access: { role: UserSampleRole | null; managed: boolean },
): boolean {
  switch (sample.status) {
    case "draft":
      return false;
    case "published":
      return true;
    case "withdrawn":
      return access.role !== null || access.managed;
    case "tombstone":
      return access.managed;
  }
}
