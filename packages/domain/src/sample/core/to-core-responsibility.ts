import type { Sample } from "../sample.ts";
import type { CoreAgentRole, CoreRole } from "./core-sample-schema.ts";

import {
  laboratoryLabel,
  organizationLabel,
  osuLabel,
} from "../../institutional-group/label.ts";
import { CORE_ROLE_BY_ADDITIONAL_ROLE } from "./core-additional-role.ts";
import { toRorUri } from "./core-production-schema.ts";
import { OTELO_ROR_URI, toOrcidUri } from "./core-sample-schema.ts";

const personRole = (
  role: CoreRole,
  firstname: string | null | undefined,
  lastname: string | null | undefined,
  orcid?: string | null,
): CoreAgentRole[] =>
  firstname == null && lastname == null
    ? []
    : [
        {
          agent: {
            id: orcid == null ? undefined : toOrcidUri(orcid),
            firstname: firstname ?? undefined,
            lastname: lastname ?? undefined,
            agentType: "Person",
          },
          roles: [role],
        },
      ];

function toAffiliations(sample: Sample) {
  const affiliations = [];
  if (sample.institutionalOrganization != null) {
    affiliations.push({
      id: toRorUri(sample.institutionalOrganization),
      name: organizationLabel(sample.institutionalOrganization),
    });
  }
  if (sample.institutionalOsu != null) {
    affiliations.push({
      id: `urn:otelo:osu:${sample.institutionalOsu}`,
      name: osuLabel(sample.institutionalOsu),
    });
  }
  if (sample.institutionalLaboratory != null) {
    affiliations.push({
      id: `urn:otelo:laboratory:${sample.institutionalLaboratory}`,
      name: laboratoryLabel(sample.institutionalLaboratory),
    });
  }
  return affiliations.length === 0 ? undefined : affiliations;
}

export function toCoreResponsibility(sample: Sample): CoreAgentRole[] {
  const roles: CoreAgentRole[] = [];
  if (sample.owner?.firstname != null || sample.owner?.name != null) {
    roles.push({
      agent: {
        firstname: sample.owner.firstname ?? undefined,
        lastname: sample.owner.name ?? undefined,
        agentType: "Person",
        affiliations: toAffiliations(sample),
      },
      roles: ["Creator"],
    });
  }
  roles.push({
    agent: {
      id: OTELO_ROR_URI,
      name: "OTELo",
      agentType: "Organization",
    },
    roles: ["Registrant"],
  });

  const context = sample.scientificContext;
  if (context != null) {
    roles.push(
      ...personRole(
        "Collector",
        context.collectorFirstname,
        context.collectorLastname,
        context.provenanceStatus === "field_sample"
          ? context.collectorOrcid
          : null,
      ),
    );
    if (context.provenanceStatus === "field_sample") {
      roles.push(
        ...personRole(
          "ChiefScientist",
          context.chiefScientistFirstname,
          context.chiefScientistLastname,
          context.chiefScientistOrcid,
        ),
      );
      for (const ror of context.hostInstitution ?? []) {
        roles.push({
          agent: {
            id: toRorUri(ror),
            name: organizationLabel(ror),
            agentType: "Organization",
          },
          roles: ["HostingInstitution"],
        });
      }
    } else {
      roles.push(
        ...personRole(
          "Curator",
          context.collectionCuratorFirstname,
          context.collectionCuratorLastname,
        ),
      );
    }
  }

  if (context?.provenanceStatus === "field_sample") {
    for (const additional of context.additionalRoles) {
      roles.push(
        ...personRole(
          CORE_ROLE_BY_ADDITIONAL_ROLE[additional.role],
          additional.personFirstname,
          additional.personLastname,
          additional.personOrcid,
        ),
      );
    }
  }

  return roles;
}
