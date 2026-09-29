import type { ManualGroup } from "@projet-igsn/domain/manual-group/model";
import type { ProvenanceStatus } from "@projet-igsn/domain/sample/scientific-context/provenance-status";
import type ExcelJS from "exceljs";

import { isPathAtOrUnder } from "@projet-igsn/domain/sample/path/is-at-or-under";
import { PROVENANCE_STATUSES } from "@projet-igsn/domain/sample/scientific-context/provenance-status";
import { z } from "zod";

import type { Column } from "./columns.ts";
import type { ConditionalCondition } from "./conditional-fields.ts";

import {
  MANUAL_GROUP_PATH,
  plainHeader,
  SAMPLE_COLUMNS,
  SHEETS,
  TEMPLATE_MATERIAL_PATHS,
} from "./columns.ts";
import { CONDITIONAL_FIELDS, conditionOf } from "./conditional-fields.ts";
import { labels } from "./labels.ts";

export type TemplateCustomization = {
  provenanceStatus?: ProvenanceStatus;
  materialPath?: string;
  manualGroup?: ManualGroup;
};

export const templateMaterialPathSchema = z
  .string()
  .refine((path) => TEMPLATE_MATERIAL_PATHS.includes(path));

const storedCustomizationSchema = z.object({
  provenanceStatus: z.enum(PROVENANCE_STATUSES).optional(),
  materialPath: templateMaterialPathSchema.optional(),
  manualGroupLabel: z.string().optional(),
});

export type StoredCustomization = z.infer<typeof storedCustomizationSchema>;

type Prefilled = Pick<StoredCustomization, "provenanceStatus" | "materialPath">;

const PROVENANCE_PATH = "scientificContext.provenanceStatus";

const MATERIAL_PATH = "material";

const levelOf = (path: string) => path.split(".").length;

const ancestorAt = (path: string, level: number) =>
  path.split(".").slice(0, level).join(".");

export const storedCustomizationOf = ({
  manualGroup,
  ...prefilled
}: TemplateCustomization): StoredCustomization => ({
  ...prefilled,
  manualGroupLabel: manualGroup?.name,
});

export function writeCustomization(
  sheet: ExcelJS.Worksheet,
  stored: StoredCustomization,
): void {
  sheet.getCell("C1").value = JSON.stringify(stored);
}

export const hasCustomization = (stored: StoredCustomization): boolean =>
  Object.values(stored).some((value) => value !== undefined);

const parsedJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

export function readCustomization(
  book: ExcelJS.Workbook,
): StoredCustomization | undefined {
  const text = book.getWorksheet(SHEETS.readMe)?.getCell("C1").text ?? "";
  return text === ""
    ? undefined
    : storedCustomizationSchema.safeParse(parsedJson(text)).data;
}

export const prefillOf =
  ({ provenanceStatus, materialPath, manualGroupLabel }: StoredCustomization) =>
  (column: Column): string | undefined => {
    if (column.path === PROVENANCE_PATH && provenanceStatus !== undefined)
      return labels.provenanceStatusLabel(provenanceStatus);
    if (column.path === MANUAL_GROUP_PATH && manualGroupLabel !== undefined)
      return manualGroupLabel;
    if (
      column.path === MATERIAL_PATH &&
      materialPath !== undefined &&
      column.level !== undefined &&
      column.level <= levelOf(materialPath)
    )
      return labels.materialPathLabel(ancestorAt(materialPath, column.level));
    return undefined;
  };

function possibleLabelsOf(
  condition: ConditionalCondition,
  { provenanceStatus, materialPath }: Prefilled,
): readonly string[] | undefined {
  if (condition.path === PROVENANCE_PATH && provenanceStatus !== undefined)
    return [labels.provenanceStatusLabel(provenanceStatus)];
  if (
    condition.path !== MATERIAL_PATH ||
    materialPath === undefined ||
    condition.level === undefined
  )
    return undefined;
  const { level } = condition;
  if (level <= levelOf(materialPath))
    return [labels.materialPathLabel(ancestorAt(materialPath, level))];
  return [
    "",
    ...TEMPLATE_MATERIAL_PATHS.filter(
      (path) => levelOf(path) === level && isPathAtOrUnder(path, materialPath),
    ).map(labels.materialPathLabel),
  ];
}

const isSatisfiable = (
  condition: ConditionalCondition,
  customization: Prefilled,
) =>
  possibleLabelsOf(condition, customization)?.some(
    (label) => (condition.match === "is") === condition.values.includes(label),
  ) ?? true;

export function droppedColumnsOf(
  columns: readonly Column[],
  customization: Prefilled,
): Column[] {
  const unreachable = CONDITIONAL_FIELDS.flatMap((field) => {
    const condition = conditionOf(field);
    return condition === undefined || isSatisfiable(condition, customization)
      ? []
      : field.paths;
  });
  return columns.filter(
    ({ path }) =>
      path !== undefined &&
      unreachable.some((governed) => isPathAtOrUnder(path, governed)),
  );
}

export function prefilledHeaderLabelsOf(
  stored: StoredCustomization | undefined,
): Map<string, string> {
  const prefill = stored === undefined ? undefined : prefillOf(stored);
  return new Map(
    SAMPLE_COLUMNS.flatMap((column) => {
      const label = prefill?.(column);
      return label === undefined ? [] : [[plainHeader(column), label]];
    }),
  );
}
