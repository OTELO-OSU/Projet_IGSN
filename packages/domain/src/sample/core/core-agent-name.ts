import type { CoreAgentRole } from "./core-sample-schema.ts";

import { joinContactName } from "../contact-name.ts";

export const coreAgentName = (agent: CoreAgentRole["agent"]): string =>
  agent.agentType === "Person"
    ? joinContactName(agent.firstname, agent.lastname)
    : agent.name;
