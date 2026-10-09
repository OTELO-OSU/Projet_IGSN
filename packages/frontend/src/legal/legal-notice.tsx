import { ExternalLink } from "@projet-igsn/design-system/components/ui/external-link";

import { Section } from "#/legal/section.tsx";
import { PageBanner } from "#/page-banner.tsx";
import { m } from "#/paraglide/messages.js";

export function LegalNotice() {
  const credits = [
    [m.legal_director_lead, m.legal_director],
    [m.legal_editors_lead, m.legal_editors],
    [m.legal_developers_lead, m.legal_developers],
  ] as const;

  return (
    <>
      <PageBanner title={m.legal_title()} />
      <div className="mx-auto max-w-3xl space-y-10 px-6 py-16">
        <Section title={m.legal_about_title()}>
          <p>{m.legal_about()}</p>
        </Section>
        <Section title={m.legal_address_title()}>
          <p className="whitespace-pre-line">{m.legal_address()}</p>
          <ul className="list-disc space-y-2 ps-6">
            {credits.map(([lead, text]) => (
              <li key={lead()}>
                <strong>{lead()}</strong> {text()}
              </li>
            ))}
            <li>
              <strong>{m.legal_hosting_lead()}</strong> {m.legal_hosting()}{" "}
              <ExternalLink href={m.legal_hosting_link()}>
                {m.legal_hosting_link()}
              </ExternalLink>
            </li>
          </ul>
        </Section>
        <Section title={m.legal_browsers_title()}>
          <p>{m.legal_browsers()}</p>
        </Section>
        <Section title={m.legal_ip_title()}>
          <p>{m.legal_ip()}</p>
          <p>{m.legal_ip_photo_credits()}</p>
          <p>{m.legal_ip_photo_credits_list()}</p>
          <p>{m.legal_ip_reuse()}</p>
        </Section>
        <Section title={m.legal_links_title()}>
          <p>{m.legal_links_endorsement()}</p>
          <p>{m.legal_links_responsibility()}</p>
          <p>{m.legal_links_inbound()}</p>
          <p>{m.legal_links_outbound()}</p>
        </Section>
      </div>
    </>
  );
}
