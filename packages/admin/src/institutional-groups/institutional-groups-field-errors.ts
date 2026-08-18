import type { ZodType } from "zod";

import { m } from "#/paraglide/messages.js";

const INSTITUTIONAL_FIELDS = new Set([
  "institutionalOrganization",
  "institutionalOsu",
  "institutionalLaboratory",
]);

export const institutionalGroupsFieldErrors =
  (schema: ZodType) =>
  ({ value }: { value: unknown }) => {
    const parsed = schema.safeParse(value);
    if (parsed.success) return undefined;
    return {
      fields: Object.fromEntries(
        parsed.error.issues.map((issue) => {
          const path = issue.path.join(".");
          return [
            path,
            {
              message: INSTITUTIONAL_FIELDS.has(path)
                ? m.institutional_groups_required()
                : issue.message,
            },
          ];
        }),
      ),
    };
  };
