import type { CoreAgentRole, CoreRole } from "./core-sample-schema.ts";

import { fromRorUri } from "./core-production-schema.ts";

export function responsibilityFinders(responsibility: CoreAgentRole[]) {
  const agentOf = (role: CoreRole) =>
    responsibility.find((agentRole) => agentRole.roles[0] === role)?.agent;
  const personOf = (role: CoreRole) => {
    const agent = agentOf(role);
    return agent?.agentType === "Person" ? agent : undefined;
  };
  return {
    agentOf,
    personOf,
    rorsOf: (role: CoreRole) => {
      const rors = responsibility
        .filter((agentRole) => agentRole.roles[0] === role)
        .map((agentRole) => fromRorUri(agentRole.agent.id ?? ""));
      return rors.length === 0 ? null : rors;
    },
  };
}
