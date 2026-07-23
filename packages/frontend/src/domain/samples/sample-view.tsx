import type { Sample } from "@projet-igsn/domain/sample/sample";

import { ChevronRightIcon } from "lucide-react";

import { AgeView, hasAge } from "#/domain/samples/age-view.tsx";
import { ConditionView } from "#/domain/samples/condition-view.tsx";
import { DescriptionView } from "#/domain/samples/description-view.tsx";
import { FieldRow, FieldRows } from "#/domain/samples/field-rows.tsx";
import { LinksView } from "#/domain/samples/links-view.tsx";
import { LocationView } from "#/domain/samples/location-view.tsx";
import { pathBreadcrumb } from "#/domain/samples/path-breadcrumb.ts";
import {
  availabilityLabel,
  collectionMethodLabel,
  materialPathLabel,
  metamorphicFaciesLabel,
  natureLabel,
  textureLabel,
  typeLabel,
} from "#/domain/samples/sample-labels.ts";
import { ScientificContextView } from "#/domain/samples/scientific-context-view.tsx";
import { SecurityView } from "#/domain/samples/security-view.tsx";
import { m } from "#/paraglide/messages.js";

type SampleViewProps = {
  name: Sample["name"];
  igsn: Sample["igsn"];
  nature: Sample["nature"];
  type: Sample["type"];
  material: Sample["material"];
  texture: Sample["texture"];
  metamorphicFacies: Sample["metamorphicFacies"];
  specificName: Sample["specificName"];
  collectionMethod: Sample["collectionMethod"];
  collectionMethodDescription: Sample["collectionMethodDescription"];
  description: Sample["description"];
  condition: Sample["condition"];
  scientificContext: Sample["scientificContext"];
  location: Sample["location"];
  security: Sample["security"];
  availability: Sample["availability"];
  publicationYear: Sample["publicationYear"];
  age: Sample["age"];
  // Defaulted so the many link-less renders (and tests) can omit them.
  links?: Sample["links"];
  attachments?: Sample["attachments"];
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

type BreadcrumbFieldRowProps = {
  id: string;
  label: string;
  path: string | null | undefined;
  pathLabel: (path: string) => string;
};

// A classification row: the dt id lets the breadcrumb name itself after it.
function BreadcrumbFieldRow({
  id,
  label,
  path,
  pathLabel,
}: BreadcrumbFieldRowProps) {
  return (
    <FieldRow
      id={id}
      label={label}
      value={
        path && (
          <ClassificationBreadcrumb
            labelId={id}
            segments={pathBreadcrumb(path, pathLabel)}
          />
        )
      }
    />
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
  specificName,
  collectionMethod,
  collectionMethodDescription,
  description,
  condition,
  scientificContext,
  location,
  security,
  availability,
  publicationYear,
  age,
  links = [],
  attachments = [],
}: SampleViewProps) {
  // One entry per section actually present; drives the nav and the body, so a
  // section cannot appear in one without the other.
  const sections = [
    {
      id: "sample",
      title: m.sample_section_sample(),
      content: (
        <FieldRows>
          <FieldRow
            label={m.sample_field_nature()}
            value={natureLabel(nature)}
          />
          <BreadcrumbFieldRow
            id="sample-field-type"
            label={m.sample_field_type()}
            path={type}
            pathLabel={typeLabel}
          />
          <BreadcrumbFieldRow
            id="sample-field-material"
            label={m.sample_field_material()}
            path={material}
            pathLabel={materialPathLabel}
          />
          <FieldRow
            label={m.sample_field_texture()}
            value={texture && textureLabel(texture)}
          />
          <FieldRow
            label={m.sample_field_metamorphic_facies()}
            value={
              metamorphicFacies && metamorphicFaciesLabel(metamorphicFacies)
            }
          />
          <FieldRow
            label={m.sample_field_specific_name()}
            value={specificName}
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
            label={m.sample_field_availability()}
            value={availability && availabilityLabel(availability)}
          />
          <FieldRow
            label={m.sample_field_publication_year()}
            value={publicationYear}
          />
        </FieldRows>
      ),
    },
    description && {
      id: "description",
      title: m.sample_section_description(),
      content: <DescriptionView description={description} />,
    },
    location && {
      id: "location",
      title: m.sample_section_location(),
      content: <LocationView location={location} />,
    },
    condition && {
      id: "condition",
      title: m.sample_section_condition(),
      content: <ConditionView condition={condition} />,
    },
    scientificContext && {
      id: "scientific-context",
      title: m.sample_section_scientific_context(),
      content: <ScientificContextView scientificContext={scientificContext} />,
    },
    hasAge(age)
      ? {
          id: "age",
          title: m.sample_section_age(),
          content: <AgeView age={age} />,
        }
      : null,
    security && {
      id: "security",
      title: m.sample_section_security(),
      content: <SecurityView security={security} />,
    },
    // Attachment downloads resolve by IGSN, so the section needs one; a public
    // sample always has one, so the guard only narrows the type.
    igsn != null &&
      (links.length > 0 || attachments.length > 0) && {
        id: "links",
        title: m.sample_section_links(),
        content: (
          <LinksView igsn={igsn} links={links} attachments={attachments} />
        ),
      },
  ].filter((section) => section != null && section !== false);

  return (
    <div>
      <div className="bg-sky-700 text-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h1 className="text-4xl font-bold sm:text-5xl">{name}</h1>
          <p className="mt-2 text-lg text-sky-100">{igsn}</p>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl gap-8 px-6 py-10">
        {/* self-start keeps the nav its own height (a stretched flex child
            never sticks); it then follows the scroll alongside the sections. */}
        <nav
          aria-label={m.sample_section_sample()}
          className="sticky top-28 w-40 shrink-0 self-start"
        >
          <ul className="grid gap-2">
            {sections.map(({ id, title }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="border-l-2 border-sky-800 pl-3 font-medium text-sky-900"
                >
                  {title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex-1">
          {sections.map(({ id, title, content }) => (
            <section
              key={id}
              id={id}
              aria-labelledby={`${id}-heading`}
              className="mt-8 first:mt-0"
            >
              <h2
                id={`${id}-heading`}
                className="rounded-md bg-sky-50 px-4 py-3 text-lg font-semibold text-sky-900"
              >
                {title}
              </h2>
              {content}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
