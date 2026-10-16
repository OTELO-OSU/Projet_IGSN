import type { SampleConflict } from "@projet-igsn/domain/sample/sample-validator";

import type { SampleEditLockState } from "#/samples/use-sample-edit-lock.ts";

import { m } from "#/paraglide/messages.js";

export function describeSampleEditBlock(
  heldByOther: SampleEditLockState["heldByOther"],
  conflict: SampleConflict["reason"] | undefined,
): { lockedMessage: string | undefined; rejection: string | undefined } {
  const lockedMessage = heldByOther
    ? heldByOther.name
      ? m.sample_locked_by({ name: heldByOther.name })
      : m.sample_locked_by_unknown()
    : undefined;
  const rejection =
    conflict === "locked"
      ? m.edit_sample_locked()
      : conflict === "stale"
        ? m.edit_sample_stale()
        : undefined;
  return { lockedMessage, rejection };
}
