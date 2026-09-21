import { m } from "#/paraglide/messages.js";
import { useSampleForm } from "#/samples/use-sample-form.ts";

type PersonField =
  | "repository.currentArchiveContact"
  | "repository.originalArchiveContact";

export function PersonNameFields({
  legend,
  person,
}: {
  legend: string;
  person: PersonField;
}) {
  const form = useSampleForm();
  return (
    <fieldset className="grid gap-4">
      <legend className="mb-2 font-medium">{legend}</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <form.AppField name={`${person}Firstname`}>
          {(field) => <field.TextField label={m.field_firstname()} />}
        </form.AppField>

        <form.AppField name={`${person}Lastname`}>
          {(field) => <field.TextField label={m.field_lastname()} />}
        </form.AppField>
      </div>
    </fieldset>
  );
}
