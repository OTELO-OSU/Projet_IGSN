import type ExcelJS from "exceljs";

import type { Placements } from "./column-validation.ts";
import type { Column } from "./columns.ts";
import type { ConditionalCondition } from "./conditional-fields.ts";

import { blockIdOf } from "./block-id-of.ts";
import { breadcrumbOf } from "./column-validation.ts";
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
  if (condition.match === "isBlank") return `${cell}=""`;
  const applies = `OR(${condition.values
    .map((value) => `${cell}="${value}"`)
    .join(",")})`;
  return condition.match === "isNot" ? applies : `NOT(${applies})`;
};

const unreachableLevelFormula = (
  sheet: ExcelJS.Worksheet,
  columns: readonly Column[],
  column: Column,
  placements: Placements,
): string | undefined => {
  const blockId = blockIdOf(column);
  const placement = blockId === undefined ? undefined : placements[blockId];
  const aboveIndex = columns.findIndex(
    (candidate) =>
      candidate.block === column.block &&
      candidate.level === (column.level ?? 0) - 1,
  );
  if (placement === undefined || aboveIndex < 0) return undefined;
  const above = `$${columnLetter(sheet, aboveIndex)}${FIRST_DATA_ROW}`;
  return `OR(${above}="",COUNTIF(${placement.keyRange},${breadcrumbOf(sheet, columns, column)})=0)`;
};

const conditionalRules = (
  sheet: ExcelJS.Worksheet,
  columns: readonly Column[],
): (readonly [index: number, formula: string])[] =>
  CONDITIONAL_FIELDS.flatMap((field) => {
    const condition = conditionOf(field);
    if (condition === undefined) return [];
    const driverIndex = driverIndexOf(columns, condition);
    if (driverIndex < 0) return [];
    const formula = greyFormula(columnLetter(sheet, driverIndex), condition);
    return field.paths
      .flatMap((path) => columnIndexesOf(columns, path))
      .map((index) => [index, formula] as const);
  });

export function addGreyRules(
  sheet: ExcelJS.Worksheet,
  columns: readonly Column[],
  rows: number,
  placements: Placements,
): void {
  const rules = [
    ...conditionalRules(sheet, columns),
    ...columns.flatMap((column, index) => {
      const formula = unreachableLevelFormula(
        sheet,
        columns,
        column,
        placements,
      );
      return formula === undefined ? [] : [[index, formula] as const];
    }),
  ];
  for (const [rank, [index, formula]] of rules.entries()) {
    sheet.addConditionalFormatting({
      ref: dataRange(columnLetter(sheet, index), rows),
      rules: [
        {
          type: "expression",
          priority: rank + 1,
          formulae: [formula],
          style: GREY_FILL,
        },
      ],
    });
  }
}
