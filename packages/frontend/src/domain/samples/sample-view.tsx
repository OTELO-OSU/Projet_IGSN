import type { Sample } from "@projet-igsn/domain/sample/sample";

import { DescriptionView } from "#/domain/samples/description-view.tsx";
import { LocationView } from "#/domain/samples/location-view.tsx";
import { pathBreadcrumb } from "#/domain/samples/path-breadcrumb.ts";
import { AgeSection, hasAge } from "#/domain/samples/sample-age-section.tsx";
import {
  CollectionSection,
  hasCollection,
} from "#/domain/samples/sample-collection-section.tsx";
import {
  materialPathLabel,
  metamorphicFaciesLabel,
  natureLabel,
  textureLabel,
  typeLabel,
} from "#/domain/samples/sample-labels.ts";
import {
  ClassificationBreadcrumb,
  Field,
} from "#/domain/samples/sample-view-fields.tsx";
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
  age: Sample["age"];
};

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
  age,
}: SampleViewProps) {
  // Drives both the nav and which sections render, so they never drift.
  const sections = [
    { id: "sample", label: m.sample_section_sample(), show: true },
    {
      id: "description",
      label: m.sample_section_description(),
      show: Boolean(description),
    },
    {
      id: "collection",
      label: m.sample_section_collection(),
      show: hasCollection({ collectionMethod, collectionMethodDescription }),
    },
    {
      id: "location",
      label: m.sample_section_location(),
      show: Boolean(location),
    },
    { id: "age", label: m.sample_section_age(), show: hasAge(age) },
  ].filter((section) => section.show);

  return (
    <div>
      <div className="bg-sky-700 text-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h1 className="text-4xl font-bold sm:text-5xl">{name}</h1>
          <p className="mt-2 text-lg text-sky-100">{igsn}</p>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl gap-8 px-6 py-10">
        <nav aria-label={m.sample_sections_nav()} className="w-40 shrink-0">
          <ul className="grid gap-2">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="border-l-2 border-sky-800 pl-3 font-medium text-sky-900"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex-1 space-y-8">
          <section id="sample" aria-labelledby="sample-heading">
            <h2
              id="sample-heading"
              className="rounded-md bg-sky-50 px-4 py-3 text-lg font-semibold text-sky-900"
            >
              {m.sample_section_sample()}
            </h2>
            <dl className="mt-2 divide-y">
              <Field label={m.sample_field_nature()}>
                {natureLabel(nature)}
              </Field>
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
                <Field label={m.sample_field_texture()}>
                  {textureLabel(texture)}
                </Field>
              ) : null}
              {metamorphicFacies ? (
                <Field label={m.sample_field_metamorphic_facies()}>
                  {metamorphicFaciesLabel(metamorphicFacies)}
                </Field>
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

          <CollectionSection
            collectionMethod={collectionMethod}
            collectionMethodDescription={collectionMethodDescription}
          />

          {location ? (
            <section id="location" aria-labelledby="location-heading">
              <h2
                id="location-heading"
                className="rounded-md bg-sky-50 px-4 py-3 text-lg font-semibold text-sky-900"
              >
                {m.sample_section_location()}
              </h2>
              <LocationView location={location} />
            </section>
          ) : null}

          <AgeSection age={age} />
        </div>
      </div>
    </div>
  );
}
