import type {
  CoreAgentRole,
  CoreRole,
  CoreSample,
} from "../core/core-sample-schema.ts";
import type {
  DataCiteContributor,
  DataCiteContributorType,
  DataCiteCreator,
} from "./datacite-schema.ts";

import { ORCID_SCHEME_URI, ROR_SCHEME_URI } from "./datacite-schema.ts";

const CONTRIBUTOR_TYPE_BY_ROLE: Record<
  CoreRole,
  DataCiteContributorType | null
> = {
  Creator: null,
  Registrant: null,
  Collector: "DataCollector",
  ChiefScientist: "ProjectLeader",
  HostingInstitution: "HostingInstitution",
  Curator: "DataCurator",
  Researcher: "Researcher",
};

type Registry = {
  id: string;
  scheme: "ORCID" | "ROR";
  schemeUri: string;
};

const registryOf = (id: string | undefined): Registry | null => {
  if (id == null) return null;
  if (id.startsWith(`${ORCID_SCHEME_URI}/`)) {
    return { id, scheme: "ORCID", schemeUri: ORCID_SCHEME_URI };
  }
  if (id.startsWith(`${ROR_SCHEME_URI}/`)) {
    return { id, scheme: "ROR", schemeUri: ROR_SCHEME_URI };
  }
  return null;
};

const toAffiliation = (organization: { id?: string; name: string }) => {
  const registry = registryOf(organization.id);
  if (registry == null) return { name: organization.name };
  return {
    name: organization.name,
    affiliationIdentifier: registry.id,
    affiliationIdentifierScheme: registry.scheme,
    schemeUri: registry.schemeUri,
  };
};

const toAgent = ({ agent }: CoreAgentRole): DataCiteCreator => {
  const registry = registryOf(agent.id);
  return {
    name: agent.name,
    nameType: agent.agentType === "Person" ? "Personal" : "Organizational",
    nameIdentifiers:
      registry == null
        ? undefined
        : [
            {
              nameIdentifier: registry.id,
              nameIdentifierScheme: registry.scheme,
              schemeUri: registry.schemeUri,
            },
          ],
    affiliation: agent.affiliations?.map(toAffiliation),
  };
};

export function toDataCiteCreators(
  responsibility: CoreSample["responsibility"],
): DataCiteCreator[] {
  return responsibility
    .filter(({ roles }) => roles[0] === "Creator")
    .map(toAgent);
}

export function toDataCiteContributors(
  responsibility: CoreSample["responsibility"],
): DataCiteContributor[] {
  return responsibility.flatMap((agentRole) => {
    const role = agentRole.roles[0];
    const contributorType =
      role == null ? null : CONTRIBUTOR_TYPE_BY_ROLE[role];
    return contributorType == null
      ? []
      : [{ ...toAgent(agentRole), contributorType }];
  });
}
