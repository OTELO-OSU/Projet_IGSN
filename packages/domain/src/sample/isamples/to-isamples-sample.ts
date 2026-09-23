import type { CoreSample } from "../core/core-sample-schema.ts";
import type { ISamplesSample } from "./isamples-schema.ts";

import { mainTitleOf } from "../core/core-sample-schema.ts";
import { ISAMPLES_SCHEMA_URI } from "./isamples-schema.ts";
import { toISamplesAgents } from "./to-isamples-agents.ts";
import {
  SOLID_MATERIAL_SAMPLE,
  toISamplesContextCategory,
  toISamplesMaterialCategory,
} from "./to-isamples-categories.ts";
import { toISamplesSamplingEvent } from "./to-isamples-sampling-event.ts";

const toCurationLocation = (
  repository: CoreSample["curation"]["currentRepository"],
): string | undefined => {
  const parts = [
    ...(repository?.organizations ?? []).map(({ name }) => name),
    repository?.collectionName,
  ];
  return parts.filter((part) => part != null).join(", ") || undefined;
};

export function toISamplesSample(core: CoreSample): ISamplesSample {
  const { classification, curation, identification, production, record } = core;
  return {
    pid: identification.sampleIdentifier,
    sample_identifier: identification.landingPage,
    label: mainTitleOf(identification.titles)?.value ?? "",
    description: core.physicalDescription?.openPhysicalDescription,
    alternate_identifiers: [record.recordId],
    keywords: (core.extensions?.geology?.economic?.interestElements ?? []).map(
      ({ label, schemeName, schemeURI }) => ({
        label,
        scheme_name: schemeName,
        scheme_uri: schemeURI,
      }),
    ),
    dc_rights: core.rightsAndAccess.rightsURIs[0] ?? "",
    last_modified_time: record.updatedAt,
    complies_with: [ISAMPLES_SCHEMA_URI],
    has_material_category: classification.materialCategories.map(({ label }) =>
      toISamplesMaterialCategory(label),
    ),
    has_sample_object_type: [SOLID_MATERIAL_SAMPLE],
    has_context_category: classification.materialCategories.map(({ label }) =>
      toISamplesContextCategory(label),
    ),
    registrant: toISamplesAgents(core.responsibility, ["Registrant"])[0],
    sampling_purpose: production.samplingPurpose,
    produced_by: toISamplesSamplingEvent(core),
    curation: {
      label: curation.existenceStatus,
      access_constraints: [curation.availabilityStatus],
      curation_location: toCurationLocation(curation.currentRepository),
      responsibility: toISamplesAgents(core.responsibility, ["Curator"]),
    },
    related_resource: (core.relations ?? []).map((relation) => ({
      relationship: relation.relationType,
      target: relation.targetIdentifier.value,
      label: relation.targetTitles[0]?.value ?? "",
      description: relation.description,
    })),
  };
}
