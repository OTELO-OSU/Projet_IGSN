import { ExternalLink } from "@projet-igsn/design-system/components/ui/external-link";
import { organizationLabel } from "@projet-igsn/domain/institutional-group/label";

export function OrgLink({ ror }: { ror: string }) {
  return (
    <ExternalLink href={`https://ror.org/${ror}`}>
      {organizationLabel(ror)}
    </ExternalLink>
  );
}
