import type { TemplateFieldLocks } from "./locked-template-fields.ts";

import {
  TEMPLATE_FIELD_DRIVERS,
  TEMPLATE_FIELD_KEYS,
  type TemplateFieldKey,
} from "./template-fields.ts";

const isChosen = (
  key: TemplateFieldKey,
  fields: Partial<Record<TemplateFieldKey, boolean>>,
  locks: TemplateFieldLocks,
) => key in locks || fields[key] !== false;

export const includedTemplateFields = (
  fields: Partial<Record<TemplateFieldKey, boolean>>,
  locks: TemplateFieldLocks,
): Record<TemplateFieldKey, boolean> =>
  Object.fromEntries(
    TEMPLATE_FIELD_KEYS.map((key) => {
      const driver = TEMPLATE_FIELD_DRIVERS[key];
      return [
        key,
        isChosen(key, fields, locks) &&
          (driver === undefined || isChosen(driver, fields, locks)),
      ];
    }),
  ) as Record<TemplateFieldKey, boolean>;
