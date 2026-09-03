import { ExternalLink } from "@projet-igsn/design-system/components/ui/external-link";

export function OrcidLink({ orcid }: { orcid: string }) {
  return (
    <ExternalLink href={`https://orcid.org/${orcid}`}>{orcid}</ExternalLink>
  );
}
