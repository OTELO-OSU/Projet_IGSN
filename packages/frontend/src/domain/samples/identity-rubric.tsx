import type { SampleSection } from "#/domain/samples/sample-section.ts";
import type { PublishedSample } from "#/domain/samples/sample-sections.tsx";

import { BreadcrumbFieldRow } from "#/domain/samples/breadcrumb-field-row.tsx";
import { dateRangeText } from "#/domain/samples/date-range-text.ts";
import { FieldRow, FieldRows } from "#/domain/samples/field-rows.tsx";
import { LazySampleLocationMap } from "#/domain/samples/lazy-sample-location-map.tsx";
import { ProcessStepsView } from "#/domain/samples/process-steps-view.tsx";
import {
  collectionMethodLabel,
  natureLabel,
  provenanceStatusLabel,
  typeLabel,
} from "#/domain/samples/sample-labels.ts";
import { SubSection } from "#/domain/samples/sub-section.tsx";
import { m } from "#/paraglide/messages.js";

// The legacy registry recorded an unknown collection date as 0001-01-01.
const UNKNOWN_COLLECTION_DATE = "0001-01-01";

export function identityRubric({
  localId,
  localIdDescription,
  type,
  nature,
  collectionMethod,
  collectionMethodDescription,
  scientificContext,
  description,
  parents,
  publicationYear,
  location,
  processSteps,
}: PublishedSample): SampleSection {
  const rows = (
    <FieldRows>
      <FieldRow label={m.sample_field_local_id()} value={localId} />
      <FieldRow
        label={m.sample_field_local_id_description()}
        value={localIdDescription}
      />
      <BreadcrumbFieldRow
        id="sample-field-type"
        label={m.sample_field_type()}
        path={type}
        pathLabel={typeLabel}
      />
      <FieldRow
        label={m.sample_field_nature()}
        value={nature ? natureLabel(nature) : null}
      />
      <BreadcrumbFieldRow
        id="sample-field-collection-method"
        label={m.sample_field_collection_method()}
        path={collectionMethod}
        pathLabel={collectionMethodLabel}
      />
      <FieldRow
        label={m.sample_field_collection_method_description()}
        value={collectionMethodDescription}
      />
      <FieldRow
        label={m.sample_field_provenance_status()}
        value={
          scientificContext &&
          provenanceStatusLabel(scientificContext.provenanceStatus)
        }
      />
      <FieldRow
        label={m.sample_field_collection_date()}
        value={
          // A sub-sample's collection date is its parents', not information about itself (ADR 0045).
          parents.length === 0 &&
          description?.collectionDate &&
          (description.collectionDate.start.startsWith(
            UNKNOWN_COLLECTION_DATE,
          ) &&
          description.collectionDate.end.startsWith(UNKNOWN_COLLECTION_DATE)
            ? m.sample_field_collection_date_unknown()
            : dateRangeText(description.collectionDate))
        }
      />
      <FieldRow
        label={m.sample_field_publication_year()}
        value={publicationYear}
      />
    </FieldRows>
  );
  return {
    id: "identity",
    title: m.sample_section_identity(),
    content: (
      <>
        {location?.position ? (
          <div className="grid gap-4 md:grid-cols-2">
            {rows}
            <LazySampleLocationMap position={location.position} />
          </div>
        ) : (
          rows
        )}
        {processSteps.length > 0 && (
          <SubSection title={m.sample_section_process_steps()}>
            <ProcessStepsView processSteps={processSteps} />
          </SubSection>
        )}
      </>
    ),
  };
}
