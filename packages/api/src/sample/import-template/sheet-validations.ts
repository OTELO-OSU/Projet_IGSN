import type ExcelJS from "exceljs";

export type TemplateValidation = Omit<
  ExcelJS.DataValidation,
  "type" | "formulae"
> & {
  type: ExcelJS.DataValidation["type"] | "any";
  formulae?: string[];
};

type RangeValidations = {
  add: (range: string, validation: TemplateValidation) => void;
  find: (address: string) => TemplateValidation | undefined;
};

export const sheetValidations = (sheet: ExcelJS.Worksheet): RangeValidations =>
  (sheet as unknown as { dataValidations: RangeValidations }).dataValidations;
