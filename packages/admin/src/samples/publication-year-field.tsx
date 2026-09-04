import { Input } from "@projet-igsn/design-system/components/ui/input";
import { Label } from "@projet-igsn/design-system/components/ui/label";

import { m } from "#/paraglide/messages.js";

export function PublicationYearField({
  value,
}: {
  value: number | null | undefined;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="publication-year">{m.field_publication_year()}</Label>
      <Input id="publication-year" readOnly value={value ?? ""} />
    </div>
  );
}
