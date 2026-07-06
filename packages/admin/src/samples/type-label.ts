import type { SampleType } from "@projet-igsn/domain/sample/type";

import { m } from "#/paraglide/messages.js";

export function typeLabel(type: SampleType): string {
  const labelName = `type_${type.replaceAll(".", "_")}` as keyof typeof m;
  if (!(labelName in m)) {
    return `##__${type}__##`;
  }

  // we lie a little bit to typescript here, but we know that the function exists and returns a string
  const fn = m[labelName] as () => string;
  return fn();
}
