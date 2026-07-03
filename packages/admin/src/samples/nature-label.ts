import type { Nature } from "@projet-igsn/domain/sample/nature";

import { m } from "#/paraglide/messages.js";

export function natureLabel(nature: Nature): string {
  const labelName = `nature_${nature}` as keyof typeof m;
  if (!(labelName in m)) {
    return `##__${nature}__##`;
  }

  // we lie a little bit to typescript here, but we know that the function exists and returns a string
  const fn = m[labelName] as () => string;
  return fn();
}
