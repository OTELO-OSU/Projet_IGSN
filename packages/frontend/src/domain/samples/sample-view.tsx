import type { Sample } from "@projet-igsn/domain/sample/sample";

import { ChevronRightIcon } from "lucide-react";

import { DescriptionView } from "#/domain/samples/description-view.tsx";
import { LocationView } from "#/domain/samples/location-view.tsx";
import { pathBreadcrumb } from "#/domain/samples/path-breadcrumb.ts";
import {
  collectionMethodLabel,
  materialPathLabel,
  metamorphicFaciesLabel,
  natureLabel,
  textureLabel,
  typeLabel,
} from "#/domain/samples/sample-labels.ts";
import { m } from "#/paraglide/messages.js";

type SampleViewProps = {
  name: Sample["name"];
  igsn: Sample["igsn"];
  nature: Sample["nature"];
  type: Sample["type"];
  material: Sample["material"];
  texture: Sample["texture"];
  metamorphicFacies: Sample["metamorphicFacies"];
  collectionMethod: Sample["collectionMethod"];
  collectionMethodDescription: Sample["collectionMethodDescription"];
  description: Sample["description"];
  location: Sample["location"];
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
  texture,
  metamorphicFacies,
  collectionMethod,
  collectionMethodDescription,
  description,
  location,
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
          <ul className="grid gap-2">
            <li>
              <a
                href="#sample"
                className="border-l-2 border-sky-800 pl-3 font-medium text-sky-900"
              >
                {m.sample_section_sample()}
              </a>
            </li>
            {description ? (
              <li>
                <a
                  href="#description"
                  className="border-l-2 border-sky-800 pl-3 font-medium text-sky-900"
                >
                  {m.sample_section_description()}
                </a>
              </li>
            ) : null}
            {location ? (
              <li>
                <a
                  href="#location"
                  className="border-l-2 border-sky-800 pl-3 font-medium text-sky-900"
                >
                  {m.sample_section_location()}
                </a>
              </li>
            ) : null}
          </ul>
        </nav>

        <div className="flex-1">
          <section id="sample" aria-labelledby="sample-heading">
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
              {texture ? (
                <div className="flex gap-4 px-4 py-3">
                  <dt
                    id="sample-field-texture"
                    className="text-muted-foreground w-40"
                  >
                    {m.sample_field_texture()}
                  </dt>
                  <dd className="font-medium">{textureLabel(texture)}</dd>
                </div>
              ) : null}
              {metamorphicFacies ? (
                <div className="flex gap-4 px-4 py-3">
                  <dt
                    id="sample-field-metamorphic-facies"
                    className="text-muted-foreground w-40"
                  >
                    {m.sample_field_metamorphic_facies()}
                  </dt>
                  <dd className="font-medium">
                    {metamorphicFaciesLabel(metamorphicFacies)}
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
              {collectionMethodDescription ? (
                <div className="flex gap-4 px-4 py-3">
                  <dt className="text-muted-foreground w-40">
                    {m.sample_field_collection_method_description()}
                  </dt>
                  <dd className="font-medium">{collectionMethodDescription}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          {description ? (
            <section
              id="description"
              aria-labelledby="description-heading"
              className="mt-8"
            >
              <h2
                id="description-heading"
                className="rounded-md bg-sky-50 px-4 py-3 text-lg font-semibold text-sky-900"
              >
                {m.sample_section_description()}
              </h2>
              <DescriptionView description={description} />
            </section>
          ) : null}

          {location ? (
            <section
              id="location"
              aria-labelledby="location-heading"
              className="mt-8"
            >
              <h2
                id="location-heading"
                className="rounded-md bg-sky-50 px-4 py-3 text-lg font-semibold text-sky-900"
              >
                {m.sample_section_location()}
              </h2>
              <LocationView location={location} />
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
