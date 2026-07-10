import type { Sample } from "@projet-igsn/domain/sample/sample";

import { ChevronRightIcon } from "lucide-react";

import { natureLabel } from "#/domain/samples/nature-label.ts";
import { pathBreadcrumb } from "#/domain/samples/path-breadcrumb.ts";
import { collectionMethodLabel } from "#/domain/samples/vocabulary-label.ts";
import { materialPathLabel } from "#/domain/samples/vocabulary-label.ts";
import { typeLabel } from "#/domain/samples/vocabulary-label.ts";
import { m } from "#/paraglide/messages.js";

type SampleViewProps = {
  name: Sample["name"];
  igsn: Sample["igsn"];
  nature: Sample["nature"];
  type: Sample["type"];
  material: Sample["material"];
  collectionMethod: Sample["collectionMethod"];
};

// A dot-joined classification path rendered as a breadcrumb: each ancestor
// label separated by a chevron. aria-labelledby names the list after its row
// label ("Type"/"Material"), and the chevron carries a ">" label so the path
// reads "Rock > Igneous" to assistive tech.
type BreadcrumbProps = {
  labelId: string;
  segments: { path: string; label: string }[];
};

function ClassificationBreadcrumb({ labelId, segments }: BreadcrumbProps) {
  return (
    <ol
      aria-labelledby={labelId}
      className="flex flex-wrap items-center gap-1 font-medium"
    >
      {segments.map((segment, index) => (
        <li key={segment.path} className="flex items-center gap-1">
          {index > 0 ? (
            <ChevronRightIcon
              role="img"
              aria-label=">"
              className="text-muted-foreground size-4"
            />
          ) : null}
          {segment.label}
        </li>
      ))}
    </ol>
  );
}

export function SampleView({
  name,
  igsn,
  nature,
  type,
  material,
  collectionMethod,
}: SampleViewProps) {
  return (
    <div>
      <div className="bg-sky-700 text-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h1 className="text-4xl font-bold sm:text-5xl">{name}</h1>
          <p className="mt-2 text-lg text-sky-100">{igsn}</p>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl gap-8 px-6 py-10">
        <nav aria-label={m.sample_section_sample()} className="w-40 shrink-0">
          <ul>
            <li>
              <a
                href="#sample"
                className="border-l-2 border-sky-800 pl-3 font-medium text-sky-900"
              >
                {m.sample_section_sample()}
              </a>
            </li>
          </ul>
        </nav>

        <section
          id="sample"
          aria-labelledby="sample-heading"
          className="flex-1"
        >
          <h2
            id="sample-heading"
            className="rounded-md bg-sky-50 px-4 py-3 text-lg font-semibold text-sky-900"
          >
            {m.sample_section_sample()}
          </h2>
          <dl className="mt-2 divide-y">
            <div className="flex gap-4 px-4 py-3">
              <dt
                id="sample-field-nature"
                className="text-muted-foreground w-40"
              >
                {m.sample_field_nature()}
              </dt>
              <dd className="font-medium">{natureLabel(nature)}</dd>
            </div>
            {type ? (
              <div className="flex gap-4 px-4 py-3">
                <dt
                  id="sample-field-type"
                  className="text-muted-foreground w-40"
                >
                  {m.sample_field_type()}
                </dt>
                <dd>
                  <ClassificationBreadcrumb
                    labelId="sample-field-type"
                    segments={pathBreadcrumb(type, typeLabel)}
                  />
                </dd>
              </div>
            ) : null}
            {material ? (
              <div className="flex gap-4 px-4 py-3">
                <dt
                  id="sample-field-material"
                  className="text-muted-foreground w-40"
                >
                  {m.sample_field_material()}
                </dt>
                <dd>
                  <ClassificationBreadcrumb
                    labelId="sample-field-material"
                    segments={pathBreadcrumb(material, materialPathLabel)}
                  />
                </dd>
              </div>
            ) : null}
            {collectionMethod ? (
              <div className="flex gap-4 px-4 py-3">
                <dt
                  id="sample-field-collection-method"
                  className="text-muted-foreground w-40"
                >
                  {m.sample_field_collection_method()}
                </dt>
                <dd>
                  <ClassificationBreadcrumb
                    labelId="sample-field-collection-method"
                    segments={pathBreadcrumb(
                      collectionMethod,
                      collectionMethodLabel,
                    )}
                  />
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      </div>
    </div>
  );
}
