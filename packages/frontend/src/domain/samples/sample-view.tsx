import type { SampleLineage } from "@projet-igsn/domain/sample/lineage/model";
import type { PublicSample } from "@projet-igsn/domain/sample/sample-validator";

import { useLinkProps } from "@tanstack/react-router";

import { AddSubSampleLink } from "#/domain/samples/add-sub-sample-link.tsx";
import { AdminSampleLink } from "#/domain/samples/admin-sample-link.tsx";
import { LineageView } from "#/domain/samples/lineage-view.tsx";
import { SampleHero } from "#/domain/samples/sample-hero.tsx";
import { sampleSections } from "#/domain/samples/sample-sections.tsx";
import { SectionHeading } from "#/domain/samples/section-heading.tsx";
import { useActiveSection } from "#/domain/samples/use-active-section.ts";
import { withdrawnSampleSections } from "#/domain/samples/withdrawn-sample-sections.tsx";
import { m } from "#/paraglide/messages.js";
import { prefersReducedMotion } from "#/prefers-reduced-motion.ts";

function SectionLink({
  id,
  current,
  children,
}: {
  id: string;
  current: boolean;
  children: React.ReactNode;
}) {
  const linkProps = useLinkProps({
    to: ".",
    hash: id,
    resetScroll: false,
    hashScrollIntoView: {
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    },
  });
  return (
    <a
      {...linkProps}
      aria-current={current ? "location" : undefined}
      className={`hover:border-primary hover:text-foreground -ml-px block border-l py-1 pl-3 text-sm ${
        current
          ? "border-primary text-foreground font-medium"
          : "text-muted-foreground border-transparent"
      }`}
    >
      {children}
    </a>
  );
}

export function SampleView({
  sample,
  lineage,
}: {
  sample: PublicSample;
  lineage?: SampleLineage;
}) {
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
        internalNumber={withdrawn ? null : sample.internalNumber}
        actions={
          withdrawn ? undefined : (
            <div className="flex flex-wrap gap-2">
              <AdminSampleLink
                sampleId={sample.id}
                path={`/samples/${sample.id}`}
                label={m.sample_edit()}
              />
              <AddSubSampleLink sampleId={sample.id} />
              <AdminSampleLink
                sampleId={sample.id}
                path={`/samples/create?duplicate=${sample.id}`}
                label={m.sample_duplicate()}
              />
            </div>
          )
        }
      />

      <div className="mx-auto flex max-w-6xl gap-8 px-6 py-10">
        {withdrawn ? null : (
          <nav
            aria-label={m.sample_section_sample()}
            className="sticky top-40 hidden shrink-0 self-start md:block"
          >
            <ul className="space-y-1 border-l">
              {sections.map(({ id, title }) => (
                <li key={id}>
                  <SectionLink id={id} current={id === activeId}>
                    {title}
                  </SectionLink>
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
              className="mt-8 scroll-mt-32 first:mt-0 sm:scroll-mt-44"
            >
              <SectionHeading id={`${id}-heading`}>{title}</SectionHeading>
              {content}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
