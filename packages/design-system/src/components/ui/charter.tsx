import type Catalog from "@projet-igsn/domain/messages/en.json";
import type { MouseEvent, ReactNode } from "react";

import { ExternalLink } from "#/components/ui/external-link.tsx";

type CharterMessages = Record<
  Extract<keyof typeof Catalog, `charter_${string}`>,
  () => string
>;

const STANDARDS_ID = "charter-standards";

const STANDARDS = [
  {
    name: "DataCite Metadata Schema 4.7 (IGSN)",
    href: "https://datacite-metadata-schema.readthedocs.io/en/4.7/",
  },
  { name: "OGC OMS / ISO 19156", href: "https://www.ogc.org/standards/om/" },
  {
    name: "ISO 19115 / ISO 19115-1",
    href: "https://www.iso.org/standard/53798.html",
  },
  { name: "iSamples", href: "https://isamples.org/" },
  { name: "SKOS / URI", href: "https://www.w3.org/2004/02/skos/" },
];

function scrollToStandards(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  document.getElementById(STANDARDS_ID)?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-primary text-2xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

export function Charter({
  m,
  faqHref,
}: {
  m: CharterMessages;
  faqHref: string;
}) {
  const commitments = [
    [m.charter_commitment_english_lead, m.charter_commitment_english],
    [m.charter_commitment_real_samples_lead, m.charter_commitment_real_samples],
    [m.charter_commitment_metadata_lead, m.charter_commitment_metadata],
    [m.charter_commitment_duplicates_lead, m.charter_commitment_duplicates],
    [m.charter_commitment_persistence_lead, m.charter_commitment_persistence],
    [m.charter_commitment_open_science_lead, m.charter_commitment_open_science],
    [m.charter_commitment_citation_lead, m.charter_commitment_citation],
  ] as const;
  const sanctions = [
    m.charter_non_compliance_reminder,
    m.charter_non_compliance_moderation,
    m.charter_non_compliance_suspension,
    m.charter_non_compliance_persistence,
  ];

  return (
    <div className="space-y-10">
      <Section title={m.charter_purpose_title()}>
        <p>
          {m.charter_purpose_infrastructure()}
          <sup>
            <a
              href={`#${STANDARDS_ID}`}
              onClick={scrollToStandards}
              aria-label={m.charter_standards_label()}
              className="text-primary"
            >
              *
            </a>
          </sup>
          .
        </p>
        <p>{m.charter_purpose_identifier()}</p>
        <p>{m.charter_purpose_scope()}</p>
        <p>{m.charter_purpose_api()}</p>
        <p>
          <strong>{m.charter_purpose_acceptance()}</strong>
        </p>
      </Section>
      <Section title={m.charter_access_title()}>
        <p>{m.charter_access_open()}</p>
        <p>{m.charter_access_validation()}</p>
      </Section>
      <Section title={m.charter_commitments_title()}>
        <p>{m.charter_commitments_intro()}</p>
        <ul className="list-disc space-y-2 ps-6">
          {commitments.map(([lead, text]) => (
            <li key={lead()}>
              <strong>{lead()}</strong> {text()}
            </li>
          ))}
        </ul>
      </Section>
      <Section title={m.charter_responsibility_title()}>
        <p>{m.charter_responsibility()}</p>
      </Section>
      <Section title={m.charter_non_compliance_title()}>
        <p>{m.charter_non_compliance_intro()}</p>
        <ul className="list-disc space-y-2 ps-6">
          {sanctions.map((sanction) => (
            <li key={sanction()}>{sanction()}</li>
          ))}
        </ul>
      </Section>
      <Section title={m.charter_acceptance_title()}>
        <p>{m.charter_acceptance()}</p>
        <p>{m.charter_acceptance_updates()}</p>
      </Section>
      <p className="text-muted-foreground text-sm">
        {m.charter_faq_note_start()}{" "}
        <a href={faqHref} className="underline">
          {m.charter_faq_link()}
        </a>{" "}
        {m.charter_faq_note_end()}
      </p>
      <div id={STANDARDS_ID} className="text-muted-foreground text-sm">
        <span aria-hidden="true">*</span>
        <ul
          aria-label={m.charter_standards_label()}
          className="list-disc space-y-1 ps-6"
        >
          {STANDARDS.map(({ name, href }) => (
            <li key={name}>
              <ExternalLink href={href}>{name}</ExternalLink>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
