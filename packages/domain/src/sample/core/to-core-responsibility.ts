import type { Sample } from "../sample.ts";
import type { CoreAgentRole, CoreRole } from "./core-sample-schema.ts";

import {
  laboratoryLabel,
  organizationLabel,
  osuLabel,
} from "../../institutional-group/label.ts";
import { joinContactName } from "./contact-name.ts";
import { toRorUri } from "./core-production-schema.ts";
import { OTELO_ROR_URI, toOrcidUri } from "./core-sample-schema.ts";

const personRole = (
  role: CoreRole,
  name: string | null | undefined,
  orcid?: string | null,
): CoreAgentRole[] =>
  name == null
    ? []
    : [
        {
          agent: {
            id: orcid == null ? undefined : toOrcidUri(orcid),
            name,
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
  const creatorName = joinContactName(
    sample.owner?.firstname,
    sample.owner?.name,
  );
  if (creatorName !== "") {
    roles.push({
      agent: {
        name: creatorName,
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
        context.collectorName,
        context.provenanceStatus === "field_sample"
          ? context.collectorOrcid
          : null,
      ),
    );
    if (context.provenanceStatus === "field_sample") {
      roles.push(
        ...personRole(
          "ChiefScientist",
          context.chiefScientist,
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
      roles.push(...personRole("Curator", context.collectionCurator));
    }
  }

  const details = sample.syntheticDetails;
  if (details?.operatorName != null) {
    roles.push({
      agent: {
        id:
          details.operatorOrcid == null
            ? undefined
            : toOrcidUri(details.operatorOrcid),
        name: details.operatorName,
        agentType: "Person",
        affiliations: details.researchStructure?.map((ror) => ({
          id: toRorUri(ror),
          name: organizationLabel(ror),
        })),
      },
      roles: ["Researcher"],
    });
  }

  return roles;
}
