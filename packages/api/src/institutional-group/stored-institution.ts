import type { InstitutionalGroupKind } from "@projet-igsn/domain/institutional-group/model";

import { laboratoryCodeOf } from "@projet-igsn/domain/institutional-group/laboratory-code-of";
import { laboratoryIdOf } from "@projet-igsn/domain/institutional-group/laboratory-id-of";
import { osuCodeOf } from "@projet-igsn/domain/institutional-group/osu-code-of";
import { osuIdOf } from "@projet-igsn/domain/institutional-group/osu-id-of";

type Institutions = {
  institutionalOsu: string | null;
  institutionalLaboratory: string | null;
};

const unchanged = (value: string) => value;

const ID_OF: Record<InstitutionalGroupKind, (code: string) => string> = {
  organization: unchanged,
  osu: (code) => osuIdOf(code),
  laboratory: (code) => laboratoryIdOf(code),
};

const CODE_OF: Record<InstitutionalGroupKind, (id: string) => string> = {
  organization: unchanged,
  osu: osuCodeOf,
  laboratory: laboratoryCodeOf,
};

export const institutionIdOf = (
  kind: InstitutionalGroupKind,
  code: string,
): string => ID_OF[kind](code);

export const institutionCodeOf = (
  kind: InstitutionalGroupKind,
  id: string,
): string => CODE_OF[kind](id);

export const laboratoryIdsOf = (codes: readonly string[]): string[] => [
  ...new Set(codes.map(ID_OF.laboratory)),
];

export const storedInstitutions = <Row extends Institutions>(
  row: Row,
): Row => ({
  ...row,
  institutionalOsu: row.institutionalOsu && osuIdOf(row.institutionalOsu),
  institutionalLaboratory:
    row.institutionalLaboratory && laboratoryIdOf(row.institutionalLaboratory),
});

export const institutionCodes = <Row extends Institutions>(row: Row): Row => ({
  ...row,
  institutionalOsu: row.institutionalOsu && osuCodeOf(row.institutionalOsu),
  institutionalLaboratory:
    row.institutionalLaboratory &&
    laboratoryCodeOf(row.institutionalLaboratory),
});
