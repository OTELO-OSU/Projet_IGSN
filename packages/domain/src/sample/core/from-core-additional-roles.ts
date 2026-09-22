import type { SampleAdditionalRole } from "../additional-role/model.ts";
import type { CoreSampleBody } from "./core-sample-schema.ts";

import { ADDITIONAL_ROLE_BY_CORE_ROLE } from "./core-additional-role.ts";
import { fromOrcidUri } from "./core-sample-schema.ts";

export function fromCoreAdditionalRoles(
  body: CoreSampleBody,
): SampleAdditionalRole[] {
  const additionalRoles: SampleAdditionalRole[] = [];
  for (const { agent, roles } of body.responsibility) {
    const coreRole = roles[0];
    if (coreRole == null || agent.agentType !== "Person") continue;
    const role = ADDITIONAL_ROLE_BY_CORE_ROLE[coreRole];
    if (role == null) continue;
    additionalRoles.push({
      role,
      personFirstname: agent.firstname ?? null,
      personLastname: agent.lastname ?? null,
      personOrcid: fromOrcidUri(agent.id),
    });
  }
  return additionalRoles;
}
