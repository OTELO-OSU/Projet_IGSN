import type { z } from "zod";

import type { createSampleAdditionalRoleSchema } from "../additional-role/model.ts";
import type { CoreSampleBody } from "./core-sample-schema.ts";

import { ADDITIONAL_ROLE_BY_CORE_ROLE } from "./core-additional-role.ts";

type CreateSampleAdditionalRole = z.infer<
  typeof createSampleAdditionalRoleSchema
>;

export function fromCoreAdditionalRoles(
  body: CoreSampleBody,
): CreateSampleAdditionalRole[] {
  const additionalRoles: CreateSampleAdditionalRole[] = [];
  for (const { agent, roles } of body.responsibility) {
    const coreRole = roles[0];
    if (coreRole == null || agent.agentType !== "Person") continue;
    const role = ADDITIONAL_ROLE_BY_CORE_ROLE[coreRole];
    if (role == null) continue;
    additionalRoles.push({
      role,
      personFirstname: agent.firstname ?? null,
      personLastname: agent.lastname ?? null,
    });
  }
  return additionalRoles;
}
