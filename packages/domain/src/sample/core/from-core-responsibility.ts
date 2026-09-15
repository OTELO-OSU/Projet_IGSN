import type { CoreAgentRole, CoreRole } from "./core-sample-schema.ts";

import { fromRorUri } from "./core-production-schema.ts";
import { ORCID_PREFIX } from "./core-sample-schema.ts";

export function responsibilityFinders(responsibility: CoreAgentRole[]) {
  const agentOf = (role: CoreRole) =>
    responsibility.find((agentRole) => agentRole.roles[0] === role)?.agent;
  return {
    agentOf,
    orcidOf: (role: CoreRole) =>
      agentOf(role)?.id?.replace(ORCID_PREFIX, "") ?? null,
    rorsOf: (role: CoreRole) => {
      const rors = responsibility
        .filter((agentRole) => agentRole.roles[0] === role)
        .map((agentRole) => fromRorUri(agentRole.agent.id ?? ""));
      return rors.length === 0 ? null : rors;
    },
  };
}
