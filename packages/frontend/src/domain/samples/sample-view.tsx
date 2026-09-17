import type { SampleLineage } from "@projet-igsn/domain/sample/lineage/model";
import type { PublicSample } from "@projet-igsn/domain/sample/sample-validator";

import { fullName } from "@projet-igsn/domain/user/full-name";

import { AddSubSampleLink } from "#/domain/samples/add-sub-sample-link.tsx";
import { ContactOwnerDialog } from "#/domain/samples/contact-owner-dialog.tsx";
import { EditSampleLink } from "#/domain/samples/edit-sample-link.tsx";
import { LineageView } from "#/domain/samples/lineage-view.tsx";
import { SampleHero } from "#/domain/samples/sample-hero.tsx";
import { sampleSections } from "#/domain/samples/sample-sections.tsx";
import { SectionHeading } from "#/domain/samples/section-heading.tsx";
import { useActiveSection } from "#/domain/samples/use-active-section.ts";
import { withdrawnSampleSections } from "#/domain/samples/withdrawn-sample-sections.tsx";
import { m } from "#/paraglide/messages.js";

export function SampleView({
  sample,
  lineage,
}: {
  sample: PublicSample;
  lineage?: SampleLineage;
}) {
  // Both statuses render through this one component, so the fullscreen graph
  // survives a jump from a published sample to a withdrawn one.
  const lineageSection =
    lineage != null && lineage.nodes.length > 1
      ? {
          id: "lineage",
          title: m.sample_section_lineage(),
          content: <LineageView lineage={lineage} />,
        }
      : null;
  const withdrawn = sample.status === "withdrawn";
  const sections = withdrawn
    ? withdrawnSampleSections(sample, lineageSection)
    : sampleSections(sample, lineageSection);

  const activeId = useActiveSection(sections.map(({ id }) => id));

  return (
    <div>
      <SampleHero
        name={sample.name}
        igsn={sample.igsn}
        actions={
          withdrawn ? undefined : (
            <div className="flex flex-wrap gap-2">
              <EditSampleLink sampleId={sample.id} />
              <AddSubSampleLink sampleId={sample.id} />
            </div>
          )
        }
      />

      <div className="mx-auto flex max-w-6xl gap-8 px-6 py-10">
        {withdrawn ? null : (
          <nav
            aria-label={m.sample_section_sample()}
            className="sticky top-28 hidden w-40 shrink-0 self-start md:block"
          >
            <ul className="grid gap-2">
              {sections.map(({ id, title }) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    aria-current={id === activeId ? "location" : undefined}
                    className={`border-l-2 pl-3 ${
                      id === activeId
                        ? "border-sky-800 font-medium text-sky-900"
                        : "border-sky-200 text-sky-900/60"
                    }`}
                  >
                    {title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="flex-1">
          {sections.map(({ id, title, content }) => (
            <section
              key={id}
              id={id}
              aria-labelledby={`${id}-heading`}
              className="mt-8 scroll-mt-32 first:mt-0"
            >
              <SectionHeading id={`${id}-heading`}>{title}</SectionHeading>
              {content}
            </section>
          ))}

          {withdrawn ? null : (
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {sample.owner && sample.publicationYear ? (
                <p className="text-muted-foreground">
                  {m.sample_declared_by({
                    year: sample.publicationYear,
                    owner: fullName(sample.owner),
                  })}
                </p>
              ) : null}
              {sample.igsn != null ? (
                <ContactOwnerDialog igsn={sample.igsn} />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
