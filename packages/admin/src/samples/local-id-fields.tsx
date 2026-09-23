import { m } from "#/paraglide/messages.js";
import { useSampleForm } from "#/samples/use-sample-form.ts";

export function LocalIdFields() {
  const form = useSampleForm();
  return (
    <>
      <form.AppField name="localId">
        {(field) => <field.TextField label={m.field_local_id()} />}
      </form.AppField>
      <form.Subscribe selector={(state) => state.values.localId}>
        {(localId) =>
          localId?.trim() ? (
            <form.AppField name="localIdDescription">
              {(field) => (
                <field.TextField
                  label={m.field_local_id_description()}
                  multiline
                />
              )}
            </form.AppField>
          ) : null
        }
      </form.Subscribe>
    </>
  );
}
