import type ExcelJS from "exceljs";

import type { Column } from "./columns.ts";
import type { ConditionalCondition } from "./conditional-fields.ts";

import {
  columnIndexesOf,
  CONDITIONAL_FIELDS,
  conditionOf,
  driverIndexOf,
} from "./conditional-fields.ts";
import { columnLetter, dataRange, FIRST_DATA_ROW } from "./data-range.ts";

const GREY_FILL = {
  fill: {
    type: "pattern",
    pattern: "solid",
    bgColor: { argb: "FFD9D9D9" },
  },
} as const satisfies Partial<ExcelJS.Style>;

const greyFormula = (letter: string, condition: ConditionalCondition) => {
  const cell = `$${letter}${FIRST_DATA_ROW}`;
  if (condition.match === "isEmpty") return `NOT(${cell}="")`;
  const applies = `OR(${condition.values
    .map((value) => `${cell}="${value}"`)
    .join(",")})`;
  return condition.match === "isNot" ? applies : `NOT(${applies})`;
};

export function addGreyRules(
  sheet: ExcelJS.Worksheet,
  columns: readonly Column[],
  rows: number,
) {
  let priority = 1;
  for (const field of CONDITIONAL_FIELDS) {
    const condition = conditionOf(field);
    if (condition === undefined) continue;
    const driverIndex = driverIndexOf(columns, condition);
    if (driverIndex < 0) continue;
    const formula = greyFormula(columnLetter(sheet, driverIndex), condition);
    for (const index of field.paths.flatMap((path) =>
      columnIndexesOf(columns, path),
    )) {
      sheet.addConditionalFormatting({
        ref: dataRange(columnLetter(sheet, index), rows),
        rules: [
          {
            type: "expression",
            priority: priority++,
            formulae: [formula],
            style: GREY_FILL,
          },
        ],
      });
    }
  }
}
