import { ExternalLink } from "@projet-igsn/design-system/components/ui/external-link";

import { Section } from "#/legal/section.tsx";
import { PageBanner } from "#/page-banner.tsx";
import { m } from "#/paraglide/messages.js";

type Lead = readonly [() => string, () => string];

function LeadList({ items }: { items: readonly Lead[] }) {
  return (
    <ul className="list-disc space-y-2 ps-6">
      {items.map(([lead, text]) => (
        <li key={lead()}>
          <strong>{lead()}</strong> {text()}
        </li>
      ))}
    </ul>
  );
}

function List({ items }: { items: readonly (() => string)[] }) {
  return (
    <ul className="list-disc space-y-2 ps-6">
      {items.map((item) => (
        <li key={item()}>{item()}</li>
      ))}
    </ul>
  );
}

export function PrivacyPolicy() {
  return (
    <>
      <PageBanner title={m.privacy_title()} />
      <div className="mx-auto max-w-3xl space-y-10 px-6 py-16">
        <Section title={m.privacy_protection_title()}>
          <p>{m.privacy_protection_compliance()}</p>
          <p>{m.privacy_protection_mandatory()}</p>
        </Section>
        <Section title={m.privacy_legal_basis_title()}>
          <p>{m.privacy_legal_basis()}</p>
        </Section>
        <Section title={m.privacy_purposes_title()}>
          <List
            items={[
              m.privacy_purpose_content,
              m.privacy_purpose_contact,
              m.privacy_purpose_technical,
            ]}
          />
        </Section>
        <Section title={m.privacy_data_title()}>
          <LeadList
            items={[
              [
                m.privacy_data_identification_lead,
                m.privacy_data_identification,
              ],
              [m.privacy_data_processing_lead, m.privacy_data_processing],
              [m.privacy_data_connection_lead, m.privacy_data_connection],
            ]}
          />
        </Section>
        <Section title={m.privacy_recipients_title()}>
          <List
            items={[m.privacy_recipients_unit, m.privacy_recipients_management]}
          />
        </Section>
        <Section title={m.privacy_cookies_title()}>
          <p>{m.privacy_cookies_session()}</p>
          <p>{m.privacy_cookies_local_storage()}</p>
        </Section>
        <Section title={m.privacy_retention_title()}>
          <LeadList
            items={[
              [
                m.privacy_retention_connection_lead,
                m.privacy_retention_connection,
              ],
              [m.privacy_retention_access_lead, m.privacy_retention_access],
              [m.privacy_retention_contact_lead, m.privacy_retention_contact],
              [m.privacy_retention_content_lead, m.privacy_retention_content],
            ]}
          />
        </Section>
        <Section title={m.privacy_rights_title()}>
          <p>{m.privacy_rights_intro()}</p>
          <List
            items={[
              m.privacy_rights_access,
              m.privacy_rights_update,
              m.privacy_rights_portability,
              m.privacy_rights_account_deletion,
              m.privacy_rights_restriction,
              m.privacy_rights_objection,
              m.privacy_rights_consent_withdrawal,
            ]}
          />
          <p>{m.privacy_rights_contact()}</p>
          <p>
            {m.privacy_dpo_start()}
            <a href={`mailto:${m.privacy_dpo_email()}`} className="underline">
              {m.privacy_dpo_email()}
            </a>
            {m.privacy_dpo_end()}
          </p>
          <p>
            {m.privacy_complaint_start()}{" "}
            <ExternalLink href="https://www.cnil.fr">
              {m.privacy_complaint_link()}
            </ExternalLink>
            {m.privacy_complaint_end()}
          </p>
        </Section>
      </div>
    </>
  );
}
