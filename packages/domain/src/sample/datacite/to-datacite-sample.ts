import type { CoreSample } from "../core/core-sample-schema.ts";
import type { DataCiteSample } from "./datacite-schema.ts";

import { OTELO_ROR_URI } from "../core/core-sample-schema.ts";
import {
  DATACITE_SCHEMA_VERSION,
  RESOURCE_TYPE_GENERAL,
  ROR_SCHEME_URI,
} from "./datacite-schema.ts";
import {
  toDataCiteContributors,
  toDataCiteCreators,
} from "./to-datacite-agents.ts";
import { toDataCiteDates } from "./to-datacite-dates.ts";
import { toDataCiteFundingReferences } from "./to-datacite-funding.ts";
import { toDataCiteGeoLocations } from "./to-datacite-geolocations.ts";

const CC_BY_4_0 = {
  rights: "Creative Commons Attribution 4.0 International",
  rightsIdentifier: "CC-BY-4.0",
  rightsIdentifierScheme: "SPDX",
} as const;

type Quantity = { value: number; unitCode: string };

const toSize = (quantity: Quantity | undefined): string[] =>
  quantity == null ? [] : [`${quantity.value} ${quantity.unitCode}`];

const toDescription = (
  description: string | undefined,
  descriptionType: DataCiteSample["descriptions"][number]["descriptionType"],
): DataCiteSample["descriptions"] =>
  description == null ? [] : [{ description, descriptionType }];

export function toDataCiteSample(core: CoreSample): DataCiteSample {
  const { classification, identification, physicalDescription, production } =
    core;
  return {
    doi: identification.sampleIdentifier,
    url: identification.landingPage,
    titles: identification.titles.map(({ value }) => ({ title: value })),
    creators: toDataCiteCreators(core.responsibility),
    contributors: toDataCiteContributors(core.responsibility),
    publisher: {
      name: core.publication.publisher.name,
      publisherIdentifier: OTELO_ROR_URI,
      publisherIdentifierScheme: "ROR",
      schemeUri: ROR_SCHEME_URI,
    },
    publicationYear: core.publication.publicationYear,
    types: {
      resourceType: classification.materialCategories[0]?.label,
      resourceTypeGeneral: RESOURCE_TYPE_GENERAL,
    },
    subjects: classification.contextCategories.map((concept) => ({
      subject: concept.label,
      subjectScheme: concept.schemeName,
      schemeUri: concept.schemeURI,
    })),
    dates: toDataCiteDates(core),
    language: core.record.metadataLanguage[0] ?? "en",
    alternateIdentifiers: [
      {
        alternateIdentifier: core.record.recordId,
        alternateIdentifierType: "UUID",
      },
    ],
    relatedIdentifiers: (core.relations ?? []).map((relation) => ({
      relatedIdentifier: relation.targetIdentifier.value,
      relatedIdentifierType: relation.targetIdentifier.identifierType,
      relationType: relation.relationType,
      resourceTypeGeneral: relation.targetResourceType,
    })),
    sizes: [
      ...toSize(physicalDescription?.mass),
      ...toSize(physicalDescription?.volume),
      ...toSize(physicalDescription?.dimensions?.length),
      ...toSize(physicalDescription?.dimensions?.width),
      ...toSize(physicalDescription?.dimensions?.thickness),
    ],
    rightsList: core.rightsAndAccess.rightsURIs
      .slice(0, 1)
      .map((rightsUri) => ({ ...CC_BY_4_0, rightsUri })),
    geoLocations: toDataCiteGeoLocations(
      production.location,
      core.rightsAndAccess.sensitiveLocation,
    ),
    fundingReferences: toDataCiteFundingReferences(production.projects),
    descriptions: [
      ...toDescription(production.samplingPurpose, "Abstract"),
      ...toDescription(physicalDescription?.openPhysicalDescription, "Other"),
    ],
    schemaVersion: DATACITE_SCHEMA_VERSION,
  };
}
