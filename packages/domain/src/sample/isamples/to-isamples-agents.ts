import type {
  CoreAgentRole,
  CoreRole,
  CoreSample,
} from "../core/core-sample-schema.ts";
import type { ISamplesAgent } from "./isamples-schema.ts";

import { joinContactName } from "../contact-name.ts";

const ISAMPLES_ROLES: Record<CoreRole, string> = {
  Creator: "collector",
  Collector: "collector",
  ChiefScientist: "chiefScientist",
  Researcher: "researcher",
  Curator: "curator",
  Registrant: "registrant",
  HostingInstitution: "hostingInstitution",
};

export function toISamplesAgent(
  { agent }: CoreAgentRole,
  role: CoreRole,
): ISamplesAgent {
  const affiliations =
    agent.agentType === "Person" ? agent.affiliations : undefined;
  return {
    name:
      agent.agentType === "Person"
        ? joinContactName(agent.firstname, agent.lastname)
        : agent.name,
    pid: agent.id,
    affiliation: affiliations?.map(({ name }) => name).join(", "),
    role: ISAMPLES_ROLES[role],
  };
}

export function toISamplesAgents(
  responsibility: CoreSample["responsibility"],
  wanted: readonly CoreRole[],
): ISamplesAgent[] {
  return responsibility.flatMap((agentRole) =>
    agentRole.roles
      .filter((role) => wanted.includes(role))
      .map((role) => toISamplesAgent(agentRole, role)),
  );
}
