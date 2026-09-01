import { organizationLabel } from "@projet-igsn/domain/institutional-group/label";
import { ORGANIZATIONS } from "@projet-igsn/domain/institutional-group/organization";

export const organizationItems = ORGANIZATIONS.map((organization) => ({
  value: organization.ror,
  label: organizationLabel(organization.ror),
}));
