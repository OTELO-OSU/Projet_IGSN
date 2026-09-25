import type { CoreSample } from "../core/core-sample-schema.ts";
import type { DataCiteSample } from "./datacite-schema.ts";

import {
  CORE_LICENCE_URI,
  mainTitleOf,
  OTELO_ROR_URI,
} from "../core/core-sample-schema.ts";
import { operatorAgentRoles } from "../core/operator-agent-roles.ts";
import {
  mineralClassificationText,
  toMindatUri,
} from "../mineral/mineral-hierarchy.ts";
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

const OUTSIDE_DATACITE_RESOURCE_TYPES = new Set([
  "FieldNotebook",
  "SamplingManagementPlan",
]);

type Licence = Omit<DataCiteSample["rightsList"][number], "rightsUri">;

const LICENCE_BY_URI: Record<string, Licence> = {
  [CORE_LICENCE_URI]: {
    rights: "Creative Commons Attribution 4.0 International",
    rightsIdentifier: "CC-BY-4.0",
    rightsIdentifierScheme: "SPDX",
  },
};

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
    doi: identification.doi ?? identification.sampleIdentifier,
    url: identification.landingPage,
    titles: [{ title: mainTitleOf(identification.titles)?.value ?? "" }],
    creators: toDataCiteCreators(core.responsibility),
    contributors: toDataCiteContributors([
      ...core.responsibility,
      ...operatorAgentRoles(core.extensions),
    ]),
    publisher: {
      name: core.publication.publisher.name,
      publisherIdentifier: core.publication.publisher.id ?? OTELO_ROR_URI,
      publisherIdentifierScheme: "ROR",
      schemeUri: ROR_SCHEME_URI,
    },
    publicationYear: core.publication.publicationYear,
    types: {
      resourceType: classification.materialCategories[0]?.label,
      resourceTypeGeneral: RESOURCE_TYPE_GENERAL,
    },
    subjects: [
      ...classification.contextCategories.map((concept) => ({
        subject: concept.label,
        subjectScheme: concept.schemeName,
        schemeUri: concept.schemeURI,
      })),
      ...(core.extensions?.geology?.mineralogy ?? []).map(
        ({ id, mindatId, notation }) => ({
          subject: mineralClassificationText({ strunzId: id, mindatId }),
          subjectScheme: "Strunz-Mindat (2026)",
          schemeUri: "https://www.mindat.org",
          valueUri: mindatId == null ? undefined : toMindatUri(mindatId),
          classificationCode: notation ?? id,
        }),
      ),
    ],
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
      resourceTypeGeneral: OUTSIDE_DATACITE_RESOURCE_TYPES.has(
        relation.targetResourceType,
      )
        ? "Other"
        : relation.targetResourceType,
    })),
    sizes: [
      ...toSize(physicalDescription?.mass),
      ...toSize(physicalDescription?.volume),
      ...toSize(physicalDescription?.dimensions?.length),
      ...toSize(physicalDescription?.dimensions?.width),
      ...toSize(physicalDescription?.dimensions?.thickness),
    ],
    rightsList: core.rightsAndAccess.rightsURIs.flatMap((rightsUri) => {
      const licence = LICENCE_BY_URI[rightsUri];
      return licence == null ? [] : [{ ...licence, rightsUri }];
    }),
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
