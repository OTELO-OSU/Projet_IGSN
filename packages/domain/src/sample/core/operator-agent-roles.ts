import type { CoreExtensions } from "./core-extensions-schema.ts";
import type { CoreAgentRole } from "./core-sample-schema.ts";

export function operatorAgentRoles(
  extensions: CoreExtensions | undefined,
): CoreAgentRole[] {
  const operator = extensions?.experiment?.operator;
  if (operator == null) return [];
  return [
    { agent: { ...operator, agentType: "Person" }, roles: ["Researcher"] },
  ];
}
