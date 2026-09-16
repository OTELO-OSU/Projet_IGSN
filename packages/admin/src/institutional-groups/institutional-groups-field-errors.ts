import type { ZodType } from "zod";

import { zodFieldErrors } from "@projet-igsn/domain/form/zod-field-errors";

import { m } from "#/paraglide/messages.js";

const INSTITUTIONAL_FIELDS = new Set([
  "institutionalOrganization",
  "institutionalOsu",
  "institutionalLaboratory",
]);

export const institutionalGroupsFieldErrors = (schema: ZodType) =>
  zodFieldErrors(schema, (issue) =>
    INSTITUTIONAL_FIELDS.has(issue.path.join("."))
      ? m.institutional_groups_required()
      : issue.message,
  );
