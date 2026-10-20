import type ExcelJS from "exceljs";

import type { Column } from "./columns.ts";
import type { TemplateValidation } from "./sheet-validations.ts";
import type { BlockPlacement } from "./vocabulary-sheet.ts";

import { blockIdOf } from "./block-id-of.ts";
import { BLOCK_HINTS, COLUMN_HINTS } from "./column-hints.ts";
import { conditionalPromptOf } from "./conditional-fields.ts";
import { columnLetter, FIRST_DATA_ROW } from "./data-range.ts";

export type Placements = Readonly<Record<string, BlockPlacement>>;

export const breadcrumbOf = (
  sheet: ExcelJS.Worksheet,
  columns: readonly Column[],
  column: Column,
) =>
  columns
    .flatMap((candidate, index) =>
      candidate.block === column.block &&
      candidate.level !== undefined &&
      candidate.level < (column.level ?? 0)
        ? [`$${columnLetter(sheet, index)}${FIRST_DATA_ROW}`]
        : [],
    )
    .join('&">"&');

function vocabularyValidationOf(
  sheet: ExcelJS.Worksheet,
  columns: readonly Column[],
  column: Column,
  placements: Placements,
): TemplateValidation | undefined {
  const blockId = blockIdOf(column);
  if (blockId === undefined) return undefined;
  const placement = placements[blockId];
  if (placement === undefined) return undefined;
  const { title, keyRange, labelAnchor, labelRange } = placement;
  let formula = labelRange;
  if ((column.level ?? 1) > 1) {
    const breadcrumb = breadcrumbOf(sheet, columns, column);
    formula = `OFFSET(${labelAnchor},MATCH(${breadcrumb},${keyRange},0)-1,0,COUNTIF(${keyRange},${breadcrumb}),1)`;
  }
  return {
    type: "list",
    allowBlank: true,
    formulae: [formula],
    showInputMessage: true,
    promptTitle: title,
    prompt:
      BLOCK_HINTS[column.block ?? blockId] ?? "Pick a value from the list.",
    showErrorMessage: true,
    errorStyle: "warning",
    errorTitle: title,
    error: `This value is not in the list. Keep it only if you are sure: the server checks it on upload.`,
  };
}

export function validationOf(
  sheet: ExcelJS.Worksheet,
  columns: readonly Column[],
  column: Column,
  placements: Placements,
  sampleColumns: readonly Column[] = columns,
): TemplateValidation | undefined {
  const base = vocabularyValidationOf(sheet, columns, column, placements);
  const guidance =
    column.path === undefined
      ? []
      : [
          COLUMN_HINTS[column.path],
          conditionalPromptOf(column.path, columns, sampleColumns),
        ];
  const prompt = [base?.prompt, ...guidance]
    .filter((text) => text !== undefined)
    .join(" ");
  if (prompt === "") return base;
  return base === undefined
    ? {
        type: "any",
        showInputMessage: true,
        promptTitle: column.header,
        prompt,
      }
    : { ...base, prompt };
}
