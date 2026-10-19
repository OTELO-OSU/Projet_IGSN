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

const MAX_TITLE_LENGTH = 32;

const MAX_MESSAGE_LENGTH = 255;

const cut = (text: string | undefined, max: number) =>
  text === undefined || text.length <= max
    ? text
    : `${text.slice(0, max - 1)}…`;

export const sheetValidations = (
  sheet: ExcelJS.Worksheet,
): RangeValidations => {
  const { dataValidations } = sheet as unknown as {
    dataValidations: RangeValidations;
  };
  return {
    add: (range, validation) =>
      dataValidations.add(range, {
        ...validation,
        promptTitle: cut(validation.promptTitle, MAX_TITLE_LENGTH),
        prompt: cut(validation.prompt, MAX_MESSAGE_LENGTH),
        errorTitle: cut(validation.errorTitle, MAX_TITLE_LENGTH),
        error: cut(validation.error, MAX_MESSAGE_LENGTH),
      }),
    find: (address) => dataValidations.find(address),
  };
};
