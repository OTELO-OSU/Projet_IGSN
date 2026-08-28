import type { WithdrawnSample } from "@projet-igsn/domain/sample/publication/withdrawn-sample";

import { BreadcrumbFieldRow } from "#/domain/samples/breadcrumb-field-row.tsx";
import { locationText } from "#/domain/samples/card-fields.ts";
import { ContactOwnerDialog } from "#/domain/samples/contact-owner-dialog.tsx";
import { FieldRow, FieldRows } from "#/domain/samples/field-rows.tsx";
import { SampleHero } from "#/domain/samples/sample-hero.tsx";
import {
  materialPathLabel,
  natureLabel,
  typeLabel,
} from "#/domain/samples/sample-labels.ts";
import { SectionHeading } from "#/domain/samples/section-heading.tsx";
import { m } from "#/paraglide/messages.js";

export function WithdrawnSampleView({
  sample: {
    name,
    igsn,
    nature,
    type,
    material,
    location,
    collectorName,
    collectionCurator,
  },
}: {
  sample: WithdrawnSample;
}) {
  return (
    <div>
      <SampleHero name={name} igsn={igsn} />

      <div className="mx-auto max-w-6xl px-6 py-10">
        <section aria-labelledby="sample-heading">
          <SectionHeading id="sample-heading">
            {m.sample_section_sample()}
          </SectionHeading>
          <FieldRows>
            <BreadcrumbFieldRow
              id="sample-field-type"
              label={m.sample_field_type()}
              path={type}
              pathLabel={typeLabel}
            />
            <FieldRow
              label={m.sample_field_nature()}
              value={natureLabel(nature)}
            />
            <BreadcrumbFieldRow
              id="sample-field-material"
              label={m.sample_field_material()}
              path={material}
              pathLabel={materialPathLabel}
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
        </section>

        <section aria-labelledby="private-heading" className="mt-8">
          <SectionHeading id="private-heading">
            {m.sample_section_private()}
          </SectionHeading>
          <p className="mt-4">{m.sample_withdrawn_notice()}</p>
          <div className="mt-4">
            <ContactOwnerDialog igsn={igsn} />
          </div>
        </section>
      </div>
    </div>
  );
}
