import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";
import type { ManualGroupRepository } from "@projet-igsn/domain/manual-group/repository";

import { HTTPException } from "hono/http-exception";

export const NOT_ATTACHABLE = {
  error: "Manual group not attachable to this sample",
} as const;

export async function templateManualGroups(
  manualGroups: ManualGroupRepository,
  userId: string,
  manualGroupId: string | undefined,
): Promise<{ attachable: ManualGroup[]; manualGroup?: ManualGroup }> {
  const attachable = await manualGroups.listAttachableForUser(userId);
  const manualGroup = attachable.find((group) => group.id === manualGroupId);
  if (manualGroupId !== undefined && manualGroup === undefined) {
    throw new HTTPException(422, { message: NOT_ATTACHABLE.error });
  }
  return { attachable, manualGroup };
}
