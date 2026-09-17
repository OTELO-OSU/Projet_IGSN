import type { z } from "zod";

export const zodFieldErrors =
  <T extends z.ZodType>(
    schema: T,
    messageFor: (issue: z.core.$ZodIssue) => string,
  ) =>
  ({ value }: { value: unknown }) => {
    const parsed = schema.safeParse(value);
    if (parsed.success) {
      return undefined;
    }
    return {
      fields: Object.fromEntries(
        parsed.error.issues.map((issue) => [
          issue.path.join("."),
          { message: messageFor(issue) },
        ]),
      ),
    };
  };
