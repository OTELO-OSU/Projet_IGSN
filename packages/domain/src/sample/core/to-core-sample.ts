import type { Sample } from "../sample.ts";
import type { CoreSample } from "./core-sample-schema.ts";

import { igsnSchema } from "../../igsn/model.ts";
import { publicationYearSchema } from "../sample.ts";
import {
  CORE_LICENCE_URI,
  CORE_SCHEMA_VERSION,
  OTELO_ROR_URI,
} from "./core-sample-schema.ts";
import { sampleDoi } from "./sample-doi.ts";
import { sampleLandingPage } from "./sample-landing-page.ts";
import { toCoreClassification } from "./to-core-classification.ts";
import { toCoreCuration } from "./to-core-curation.ts";
import { toCoreExtensions } from "./to-core-extensions.ts";
import { toCorePhysicalDescription } from "./to-core-physical-description.ts";
import { toCoreProduction } from "./to-core-production.ts";
import { toCoreRelations } from "./to-core-relations.ts";
import { toCoreResponsibility } from "./to-core-responsibility.ts";

type LifecycleEvents = CoreSample["record"]["lifecycleEvents"];

function toLifecycleEvents(sample: Sample): LifecycleEvents {
  const events: LifecycleEvents = [
    { eventType: "created", timestamp: sample.createdAt.toISOString() },
  ];
  const publishedAt = sample.publishedAt;
  if (publishedAt == null) return events;
  events.push({
    eventType: "published",
    timestamp: publishedAt.toISOString(),
  });
  if (sample.updatedAt > publishedAt) {
    events.push({
      eventType: "updated",
      timestamp: sample.updatedAt.toISOString(),
    });
  }
  return events;
}

export function toCoreSample(sample: Sample, frontendUrl: string): CoreSample {
  const igsn = igsnSchema.parse(sample.igsn);
  return {
    schemaVersion: CORE_SCHEMA_VERSION,
    record: {
      recordId: `urn:uuid:${sample.id}`,
      createdAt: sample.createdAt.toISOString(),
      updatedAt: sample.updatedAt.toISOString(),
      metadataLanguage: ["en"],
      metadataVersion: CORE_SCHEMA_VERSION,
      lifecycleEvents: toLifecycleEvents(sample),
    },
    identification: {
      sampleIdentifier: igsn,
      doi: sample.doiPrefix ? sampleDoi(igsn, sample.doiPrefix) : undefined,
      landingPage: sampleLandingPage(igsn, frontendUrl),
      titles: [{ value: sample.name, titleType: "Main" }],
      localName: sample.specificName ?? undefined,
    },
    classification: toCoreClassification(sample),
    responsibility: toCoreResponsibility(sample),
    publication: {
      publisher: { id: OTELO_ROR_URI, name: "OTELo" },
      publicationYear: publicationYearSchema.parse(sample.publicationYear),
    },
    production: toCoreProduction(sample),
    physicalDescription: toCorePhysicalDescription(sample),
    relations: toCoreRelations(sample, frontendUrl),
    curation: toCoreCuration(sample),
    rightsAndAccess: {
      rightsURIs: [CORE_LICENCE_URI],
      metadataVisibility: "public",
      sensitiveLocation: false,
    },
    manualGroups:
      sample.manualGroups.length === 0 ? undefined : sample.manualGroups,
    extensions: toCoreExtensions(sample),
  };
}
