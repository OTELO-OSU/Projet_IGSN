import type { WithdrawnSample } from "@projet-igsn/domain/sample/publication/withdrawn-sample";

import type { SampleSection } from "#/domain/samples/sample-section.ts";

import { BreadcrumbFieldRow } from "#/domain/samples/breadcrumb-field-row.tsx";
import { locationText } from "#/domain/samples/card-fields.ts";
import { ContactOwnerDialog } from "#/domain/samples/contact-owner-dialog.tsx";
import { FieldRow, FieldRows } from "#/domain/samples/field-rows.tsx";
import {
  materialPathLabel,
  natureLabel,
  typeLabel,
} from "#/domain/samples/sample-labels.ts";
import { m } from "#/paraglide/messages.js";

export function withdrawnSampleSections(
  {
    igsn,
    nature,
    type,
    material,
    materialOtherName,
    location,
    collectorName,
    collectionCurator,
  }: WithdrawnSample,
  lineage: SampleSection | null,
): SampleSection[] {
  return [
    {
      id: "sample",
      title: m.sample_section_sample(),
      content: (
        <FieldRows>
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
            id="sample-field-material"
            label={m.sample_field_material()}
            path={material}
            pathLabel={materialPathLabel}
            suffix={materialOtherName}
          />
          <FieldRow
            label={m.card_field_location()}
            value={locationText(location)}
          />
          <FieldRow
            label={m.sample_field_collector_name()}
            value={collectorName}
          />
          <FieldRow
            label={m.sample_field_collection_curator()}
            value={collectionCurator}
          />
        </FieldRows>
      ),
    },
    lineage,
    {
      id: "private",
      title: m.sample_section_private(),
      content: (
        <>
          <p className="mt-4">{m.sample_withdrawn_notice()}</p>
          <div className="mt-4">
            <ContactOwnerDialog igsn={igsn} />
          </div>
        </>
      ),
    },
  ].filter((section) => section != null);
}
