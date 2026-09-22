import type {
  CoreAgentRole,
  CoreRole,
  CoreSample,
} from "../core/core-sample-schema.ts";
import type { ISamplesAgent } from "./isamples-schema.ts";

import { coreAgentName } from "../core/core-agent-name.ts";

const ISAMPLES_ROLES: Record<CoreRole, string> = {
  Creator: "collector",
  Collector: "collector",
  ChiefScientist: "chiefScientist",
  Researcher: "researcher",
  Curator: "curator",
  Registrant: "registrant",
  HostingInstitution: "hostingInstitution",
  ProjectManager: "projectManager",
  ProjectMember: "projectMember",
  DataManager: "dataManager",
};

const toISamplesAgent = (
  { agent }: CoreAgentRole,
  role: CoreRole,
): ISamplesAgent => ({
  name: coreAgentName(agent),
  pid: agent.id,
  affiliation:
    agent.agentType === "Person"
      ? agent.affiliations?.map(({ name }) => name).join(", ")
      : undefined,
  role: ISAMPLES_ROLES[role],
});

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
