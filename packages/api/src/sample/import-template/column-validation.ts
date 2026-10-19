import type ExcelJS from "exceljs";

import type { Column } from "./columns.ts";
import type { TemplateValidation } from "./sheet-validations.ts";
import type { BlockPlacement } from "./vocabulary-sheet.ts";

import { blockIdOf } from "./block-id-of.ts";
import { conditionalPromptOf } from "./conditional-fields.ts";
import { columnLetter, FIRST_DATA_ROW } from "./data-range.ts";

export type Placements = Readonly<Record<string, BlockPlacement>>;

const breadcrumbOf = (
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
  const placement = blockId === undefined ? undefined : placements[blockId];
  if (placement === undefined) return undefined;
  const { title, keyRange, labelAnchor, labelRange } = placement;
  let formula = labelRange;
  let follows = "";
  if ((column.level ?? 1) > 1) {
    const breadcrumb = breadcrumbOf(sheet, columns, column);
    formula = `OFFSET(${labelAnchor},MATCH(${breadcrumb},${keyRange},0)-1,0,COUNTIF(${keyRange},${breadcrumb}),1)`;
    follows = ", which follows the level above";
  }
  return {
    type: "list",
    allowBlank: true,
    formulae: [formula],
    showInputMessage: true,
    promptTitle: title,
    prompt: `Pick a value from the list${follows}.`,
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
): TemplateValidation | undefined {
  const base = vocabularyValidationOf(sheet, columns, column, placements);
  const condition =
    column.path === undefined ? undefined : conditionalPromptOf(column.path);
  if (condition === undefined) return base;
  if (base === undefined) {
    return {
      type: "any",
      showInputMessage: true,
      promptTitle: column.header,
      prompt: condition,
    };
  }
  return { ...base, prompt: `${base.prompt} ${condition}` };
}
