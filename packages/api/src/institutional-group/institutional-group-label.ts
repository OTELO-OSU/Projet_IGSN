import type { InstitutionalGroupRef } from "@projet-igsn/domain/institutional-group/model";

import {
  laboratoryLabel,
  organizationLabel,
  osuLabel,
} from "@projet-igsn/domain/institutional-group/label";

const LABEL_BY_KIND = {
  organization: organizationLabel,
  osu: osuLabel,
  laboratory: laboratoryLabel,
};

export function institutionalGroupLabel({
  kind,
  code,
}: InstitutionalGroupRef): string {
  return LABEL_BY_KIND[kind](code);
}
